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
    pairs: List[str] = ["EURUSD-OTC"]
    amount: float
    timeframe: float
    strategy: str
    stop_loss: float
    take_profit: float
    max_consecutive_losses: int
    max_trades: int
    paper_trade: bool = False

class TradeStatus(BaseModel):
    active: bool
    total_trades: int
    wins: int
    losses: int
    profit: float
    consecutive_losses: int
    balance: float = 0.0
    currency: Optional[str] = None
    last_signal: Optional[dict] = None
