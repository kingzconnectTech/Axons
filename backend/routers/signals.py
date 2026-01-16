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
        data.pair, data.timeframe, data.strategy, data.push_token
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
    Scans common OTC and Normal pairs using the Quick 2M Strategy.
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
            analysis = StrategyService.analyze(pair, candles, "Quick 2M Strategy")
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

@router.post("/analyze", response_model=SignalResponse)
def get_signal(request: SignalRequest):
    supported = {1, 2, 5, 15, 60}
    if request.timeframe in supported:
        candles = iq_manager.get_candles(request.pair, request.timeframe)
        result = StrategyService.analyze(request.pair, candles, request.strategy)
    else:
        m1 = iq_manager.get_candles(request.pair, 1, count=max(120, request.timeframe * 60))
        mN = resample_to_n_minutes(m1, int(request.timeframe))
        result = StrategyService.analyze(request.pair, mN, request.strategy)
    
    return SignalResponse(
        pair=request.pair,
        action=result["action"],
        confidence=result["confidence"],
        timestamp=time.time(),
        reason=result.get("reason")
    )
