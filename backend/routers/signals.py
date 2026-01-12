from fastapi import APIRouter, HTTPException
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
        timestamp=time.time()
    )
