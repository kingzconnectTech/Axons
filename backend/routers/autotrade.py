from fastapi import APIRouter, HTTPException
from models.schemas import AutoTradeConfig, TradeStatus, TokenUpdate, TradeConfirmation
from services.queue_service import queue_service
from services.status_store import status_store

router = APIRouter()

@router.post("/start")
def start_autotrade(config: AutoTradeConfig):
    if not config.email or not config.password:
        raise HTTPException(status_code=400, detail="IQ Option email and password are required.")

    try:
        from iqoptionapi.stable_api import IQ_Option  # noqa: F401
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail={"detail": "IQ Option library is unavailable on this server.", "error": str(exc)},
        ) from exc

    try:
        status_store.set_status(config.email, {"error": None, "active": False})
        queue_service.enqueue_start(config.dict())
        return {"status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stop/{email}")
def stop_autotrade(email: str):
    try:
        print(f"[AutoTrade] Force-stopping session for {email}")
        status_store.set_status(email, {"active": False, "error": None})
        queue_service.enqueue_stop(email)
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/token")
def update_token(data: TokenUpdate):
    try:
        print(f"[AutoTrade] Received token update for {data.email}")
        status_store.update_token(data.email, data.token)
        return {"status": "token_updated"}
    except Exception as e:
        print(f"[AutoTrade] Token update failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status/{email}", response_model=TradeStatus)
def get_status(email: str):
    item = status_store.get_status(email)
    print(f"[AutoTrade] Status requested for {email}. Found: {bool(item)} | Active: {item.get('active') if item else 'N/A'}")
    if not item:
        return TradeStatus(
            active=False,
            total_trades=0,
            wins=0,
            losses=0,
            profit=0.0,
            consecutive_losses=0,
            balance=0.0,
            currency=None,
            error=None
        )
    return TradeStatus(
        active=bool(item.get("active", False)),
        total_trades=int(item.get("total_trades", 0)),
        wins=int(item.get("wins", 0)),
        losses=int(item.get("losses", 0)),
        profit=float(item.get("profit", 0.0)),
        consecutive_losses=int(item.get("consecutive_losses", 0)),
        balance=float(item.get("balance", 0.0)),
        currency=item.get("currency"),
        min_amount=float(item["min_amount"]) if item.get("min_amount") is not None else None,
        error=item.get("error")
    )

@router.get("/pending-trade/{email}")
def get_pending_trade(email: str):
    pending = status_store.get_pending_trade(email)
    return {"pending_trade": pending}

@router.post("/confirm-trade")
def confirm_trade(data: TradeConfirmation):
    try:
        pending = status_store.get_pending_trade(data.email)
        if not pending:
            raise HTTPException(status_code=404, detail="No pending trade found")
        if pending.get("id") != data.trade_id:
            raise HTTPException(status_code=400, detail="Trade ID mismatch")
        
        updated_pending = pending.copy()
        if data.confirm:
            updated_pending["confirmed"] = True
        else:
            updated_pending["cancelled"] = True
        
        status_store.set_pending_trade(data.email, updated_pending)
        return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
