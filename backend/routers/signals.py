from fastapi import APIRouter, HTTPException
from services.iq_service import iq_manager
from services.strategy_service import StrategyService
from models.schemas import SignalRequest, SignalResponse
import time

router = APIRouter()

@router.post("/analyze", response_model=SignalResponse)
def get_signal(request: SignalRequest):
    # Fetch candles
    candles = iq_manager.get_candles(request.pair, request.timeframe)
    
    # Analyze
    result = StrategyService.analyze(request.pair, candles, request.strategy)
    
    return SignalResponse(
        pair=request.pair,
        action=result["action"],
        confidence=result["confidence"],
        timestamp=time.time()
    )
