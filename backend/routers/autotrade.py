from fastapi import APIRouter, HTTPException
from models.schemas import AutoTradeConfig, TradeStatus, TokenUpdate
from services.queue_service import queue_service
from services.status_store import status_store

router = APIRouter()

@router.post("/start")
def start_autotrade(config: AutoTradeConfig):
    # Validate user supplied their own IQ Option credentials
    if not config.email or not config.password:
        raise HTTPException(status_code=400, detail="IQ Option email and password are required.")

    # Check the iqoptionapi library is available before queuing
    try:
        from iqoptionapi.stable_api import IQ_Option  # noqa: F401
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail={"detail": "IQ Option library is unavailable on this server.", "error": str(exc)},
        ) from exc

    try:
        # Clear any previous error so the frontend shows a fresh state
        status_store.set_status(config.email, {"error": None, "active": False})
        queue_service.enqueue_start(config.dict())
        return {"status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/stop/{email}")
def stop_autotrade(email: str):
    try:
        # Immediately force status to inactive so the UI reflects stopped state,
        # even if the WorkerDaemon is not running (e.g. ENABLE_LOCAL_WORKER not set).
        print(f"[AutoTrade] Force-stopping session for {email}")
        status_store.set_status(email, {"active": False, "error": None})
        # Also enqueue stop so the worker process cleans up gracefully if running.
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
        error=item.get("error")      # Credential / connection errors from the worker
    )
