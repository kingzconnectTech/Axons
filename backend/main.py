from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from routers import signals, autotrade, market
from services.queue_service import queue_service
from worker_daemon import WorkerDaemon
import threading

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Axon Trading App")

@app.on_event("startup")
def startup_event():
    if queue_service.local_mode:
        print("Starting local worker daemon thread...")
        worker = WorkerDaemon(local_queue=queue_service.local_queue)
        t = threading.Thread(target=worker.run, daemon=True)
        t.start()

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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
