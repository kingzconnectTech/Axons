from fastapi import APIRouter, HTTPException
from models.schemas import AutoTradeConfig, TradeStatus, TokenUpdate
from services.queue_service import queue_service
from services.status_store import status_store

router = APIRouter()

@router.post("/start")
def start_autotrade(config: AutoTradeConfig):
    try:
        queue_service.enqueue_start(config.dict())
        return {"status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stop/{email}")
def stop_autotrade(email: str):
    try:
        queue_service.enqueue_stop(email)
        return {"status": "queued_stop"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/token")
def update_token(data: TokenUpdate):
    try:
        status_store.update_token(data.email, data.token)
        return {"status": "token_updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status/{email}", response_model=TradeStatus)
def get_status(email: str):
    item = status_store.get_status(email)
    if not item:
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
    return TradeStatus(
        active=bool(item.get("active", False)),
        total_trades=int(item.get("total_trades", 0)),
        wins=int(item.get("wins", 0)),
        losses=int(item.get("losses", 0)),
        profit=float(item.get("profit", 0.0)),
        consecutive_losses=int(item.get("consecutive_losses", 0)),
        balance=float(item.get("balance", 0.0)),
        currency=item.get("currency")
    )
