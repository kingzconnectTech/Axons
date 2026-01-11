from fastapi import APIRouter, HTTPException
from services.trade_service import trade_manager
from models.schemas import AutoTradeConfig, TradeStatus

router = APIRouter()

@router.post("/start")
def start_autotrade(config: AutoTradeConfig):
    success, msg = trade_manager.start_trading(config)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "started"}

@router.post("/stop/{email}")
def stop_autotrade(email: str):
    success, msg = trade_manager.stop_trading(email)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "stopped"}

@router.get("/status/{email}", response_model=TradeStatus)
def get_status(email: str):
    stats = trade_manager.get_status(email)
    if not stats:
        # Return empty/inactive status if not found
        return TradeStatus(
            active=False,
            total_trades=0,
            wins=0,
            losses=0,
            profit=0.0,
            consecutive_losses=0,
            balance=0.0,
            currency=None
        )
    # stats now contains 'active' key from TradeManager
    return TradeStatus(**stats)
