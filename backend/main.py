from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from routers import signals, autotrade, market
from services.queue_service import queue_service
from services.status_store import status_store
from worker_daemon import WorkerDaemon
import threading

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def should_start_local_worker():
    explicit = os.environ.get("ENABLE_LOCAL_WORKER")
    if explicit is not None:
        return explicit.strip().lower() in {"1", "true", "yes", "on"}
    # On Render, start by default unless explicitly disabled, 
    # but only if we ARE on Render.
    if os.environ.get("RENDER") == "true":
        return os.environ.get("ENABLE_LOCAL_WORKER") is not None
    return True

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    iq_email = os.environ.get("IQ_OPTION_EMAIL")
    enable_worker = os.environ.get("ENABLE_LOCAL_WORKER")

    print("=" * 60, flush=True)
    print("[Lifespan] Axon Backend Startup Diagnostics:", flush=True)
    print(f"  PORT                : {os.environ.get('PORT', '8000')}", flush=True)
    print(f"  IQ_OPTION_EMAIL     : {'[SET]' if iq_email else '[MISSING]'}", flush=True)
    print(f"  ENABLE_LOCAL_WORKER : {enable_worker or 'not set'}", flush=True)
    print("=" * 60, flush=True)

    if queue_service.local_mode and should_start_local_worker():
        print("[Lifespan] Starting local worker daemon...", flush=True)
        try:
            worker = WorkerDaemon(local_queue=queue_service.local_queue)
            t = threading.Thread(target=worker.run, daemon=True)
            t.start()
            print("[Lifespan] Worker thread started.", flush=True)
        except Exception as e:
            print(f"[Lifespan] CRITICAL: Failed to start worker: {e}", flush=True)

    print("[Lifespan] Resetting stale active sessions...", flush=True)
    status_store.reset_all_active()
    
    yield
    # --- Shutdown ---
    print("[Lifespan] Shutting down...", flush=True)

app = FastAPI(title="Axon Trading App", lifespan=lifespan)

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
@app.get("/api/health")
def read_root():
    return {"status": "healthy", "message": "Axon Backend is running"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    print(f"Starting server on port {port}...", flush=True)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
