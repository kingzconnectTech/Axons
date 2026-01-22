from fastapi import APIRouter, HTTPException
from typing import List
from services.iq_service import iq_manager
from services.strategy_service import StrategyService, resample_to_n_minutes
from services.signal_bot_service import signal_bot_manager
from models.schemas import SignalRequest, SignalResponse, SignalBotStart, SignalBotStatus
import time

router = APIRouter()

@router.post("/start")
def start_signal_stream(data: SignalBotStart):
    success, msg = signal_bot_manager.start_stream(
        data.pairs, data.timeframe, data.strategy
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "started", "message": msg}

@router.post("/stop")
def stop_signal_stream():
    success, msg = signal_bot_manager.stop_stream()
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "stopped", "message": msg}

@router.get("/status", response_model=SignalBotStatus)
def get_signal_status():
    return signal_bot_manager.get_status()

@router.get("/quick-scan", response_model=List[SignalResponse])
def quick_scan():
    """
    Scans common OTC and Normal pairs using the RSI Directional Every Minute Strategy.
    Returns analysis for each pair.
    """
    pairs = [
        "EURUSD-OTC",
        "GBPUSD-OTC",
        "EURJPY-OTC",
        "AUDCAD-OTC",
        "EURUSD",
        "EURGBP",
        "AUDUSD",
        "USDJPY",
        "GBPUSD",
        "USDCHF",
        "EURJPY",
        "GBPJPY",
        "USDCAD",
    ]
    results = []
    
    for pair in pairs:
        # Get 1m candles (need enough for history check and StrategyService validation)
        # StrategyService requires at least 30 candles
        candles = iq_manager.get_candles(pair, 1, count=30)
        
        if candles:
            last_candle = candles[-1]
            spread = last_candle["max"] - last_candle["min"]
            analysis = StrategyService.analyze(pair, candles, "RSI Directional Every Minute", spread=spread)
            results.append(SignalResponse(
                pair=pair,
                action=analysis["action"],
                confidence=analysis["confidence"],
                timestamp=time.time(),
                reason=analysis.get("reason")
            ))
        else:
            results.append(SignalResponse(
                pair=pair,
                action="NEUTRAL",
                confidence=0,
                timestamp=time.time()
            ))
            
    return results

from services.notification_service import notification_service
from services.status_store import status_store

@router.post("/test-notification")
def test_notification():
    """
    Forces a test notification to all registered devices to verify connectivity.
    """
    try:
        tokens = status_store.get_all_tokens()
        if not tokens:
            return {"status": "failed", "message": "No tokens found in database"}
        
        print(f"[TestNotification] Sending to {len(tokens)} tokens. Sample: {tokens[0][:10]}...")
        
        notification_service.send_multicast(
            tokens=tokens,
            title="Test Notification",
            body="This is a test signal from Axon Backend.",
            data={
                "pair": "TEST-PAIR",
                "action": "CALL",
                "confidence": "99",
                "timestamp": str(time.time()),
                "title": "Test Notification", # Redundant but safe
                "body": "This is a test signal from Axon Backend." # Redundant but safe
            }
        )
        return {"status": "sent", "tokens_count": len(tokens)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze", response_model=SignalResponse)
def get_signal(request: SignalRequest):
    best_result = None
    
    for pair in request.pairs:
        supported = {1, 2, 5, 15, 60}
        if request.timeframe in supported:
            candles = iq_manager.get_candles(pair, request.timeframe)
            spread = 0.0
            if candles:
                last_candle = candles[-1]
                spread = last_candle["max"] - last_candle["min"]
            result = StrategyService.analyze(pair, candles, request.strategy, spread=spread)
        else:
            m1 = iq_manager.get_candles(pair, 1, count=max(120, request.timeframe * 60))
            mN = resample_to_n_minutes(m1, int(request.timeframe))
            spread = 0.0
            if mN:
                last_candle = mN[-1]
                spread = last_candle["max"] - last_candle["min"]
            result = StrategyService.analyze(pair, mN, request.strategy, spread=spread)
        
        # Logic to pick the best result
        # If we find a CALL or PUT, we prefer it over NEUTRAL
        # If we have multiple CALL/PUT, we pick the one with higher confidence
        if result["action"] in ["CALL", "PUT"]:
            if best_result is None or best_result["action"] == "NEUTRAL":
                best_result = {**result, "pair": pair}
            elif result["confidence"] > best_result["confidence"]:
                best_result = {**result, "pair": pair}
        
        # If best_result is still None (first iteration), set it
        if best_result is None:
            best_result = {**result, "pair": pair}
            
    if best_result is None:
        # Should not happen if request.pairs is not empty
        # Default fallback
        best_result = {
            "pair": request.pairs[0] if request.pairs else "Unknown",
            "action": "NEUTRAL",
            "confidence": 0,
            "reason": "No pairs provided or analysis failed"
        }

    return SignalResponse(
        pair=best_result["pair"],
        action=best_result["action"],
        confidence=best_result["confidence"],
        timestamp=time.time(),
        reason=best_result.get("reason")
    )
