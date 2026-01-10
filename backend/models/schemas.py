from pydantic import BaseModel
from typing import Optional, List

class SignalRequest(BaseModel):
    pair: str
    timeframe: int  # in minutes
    strategy: str

class SignalResponse(BaseModel):
    pair: str
    action: str  # "CALL", "PUT", "NEUTRAL"
    confidence: float
    timestamp: float

class AutoTradeConfig(BaseModel):
    email: str
    password: str
    account_type: str = "PRACTICE"  # PRACTICE or REAL
    pair: str = "EURUSD-OTC"
    amount: float
    timeframe: int
    strategy: str
    stop_loss: float
    take_profit: float
    max_consecutive_losses: int
    max_trades: int

class TradeStatus(BaseModel):
    active: bool
    total_trades: int
    wins: int
    losses: int
    profit: float
    consecutive_losses: int
