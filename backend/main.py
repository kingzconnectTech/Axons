from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from routers import signals, autotrade, market
from services.queue_service import queue_service
from services.status_store import status_store
from worker_daemon import WorkerDaemon
import threading

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Axon Trading App")


def should_start_local_worker():
    explicit = os.environ.get("ENABLE_LOCAL_WORKER")
    if explicit is not None:
        return explicit.strip().lower() in {"1", "true", "yes", "on"}
    # On Render, start by default unless explicitly disabled, 
    # but only if we ARE on Render.
    if os.environ.get("RENDER") == "true":
        # Check if we want it off by default on Render to save resources
        return explicit is not None # If it's None, it will return False
    return True

@app.on_event("startup")
def startup_event():
    # --- Startup Diagnostics ---
    iq_email = os.environ.get("IQ_OPTION_EMAIL")
    iq_pass = os.environ.get("IQ_OPTION_PASSWORD")
    firebase_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    enable_worker = os.environ.get("ENABLE_LOCAL_WORKER")

    print("=" * 60)
    print("[Startup] Axon Backend Environment Check:")
    print(f"  IQ_OPTION_EMAIL     : {'[SET]' if iq_email else '[MISSING] - market/signals will return 503!'}")
    print(f"  IQ_OPTION_PASSWORD  : {'[SET]' if iq_pass else '[MISSING] - market/signals will return 503!'}")
    print(f"  FIREBASE_SERVICE_ACCOUNT_JSON: {'[SET]' if firebase_json else '[MISSING] - push notifications disabled'}")
    print(f"  ENABLE_LOCAL_WORKER : {enable_worker or 'not set (worker disabled on Render by default)'}")
    print("=" * 60)

    try:
        with open("startup_debug.log", "a") as f:
            f.write(f"Startup event fired. Queue local_mode: {queue_service.local_mode}\n")
            f.write(f"IQ_OPTION_EMAIL set: {bool(iq_email)}\n")
            f.write(f"IQ_OPTION_PASSWORD set: {bool(iq_pass)}\n")
    except:
        pass

    if queue_service.local_mode and should_start_local_worker():
        print("[Startup] Starting local worker daemon thread...")
        worker = WorkerDaemon(local_queue=queue_service.local_queue)
        t = threading.Thread(target=worker.run, daemon=True)
        t.start()
    elif queue_service.local_mode:
        print("[Startup] Skipping local worker daemon (hosted environment, ENABLE_LOCAL_WORKER not set).")

    # Reset any stale active sessions left from a previous deployment/crash
    print("[Startup] Resetting stale active sessions...")
    status_store.reset_all_active()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(signals.router, prefix="/api/signals", tags=["signals"])
app.include_router(autotrade.router, prefix="/api/autotrade", tags=["autotrade"])
app.include_router(market.router, prefix="/api/market", tags=["market"])

@app.get("/")
def read_root():
    return {"message": "Axon Backend is running"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=True,
        reload_excludes=["*.log", "*.json", "local_status_store.json", "local_queue.json"]
    )
