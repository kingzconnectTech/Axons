from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from routers import signals, autotrade, market

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Axon Trading App")

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
