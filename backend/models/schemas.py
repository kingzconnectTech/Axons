from pydantic import BaseModel
from typing import Optional, List

class SignalRequest(BaseModel):
    pairs: List[str]
    timeframe: int  # in minutes
    strategy: str

class SignalBotStart(BaseModel):
    pairs: List[str]
    timeframe: int
    strategy: str
    push_token: Optional[str] = None

class SignalHistoryItem(BaseModel):
    timestamp: float
    pair: str
    timeframe: int
    action: str  # "CALL", "PUT"
    status: Optional[str] = None  # "WIN", "LOSS", or None/PENDING


class SignalBotStatus(BaseModel):
    active: bool
    params: dict
    stats: dict
    last_signal: Optional[dict]
    history: Optional[List[SignalHistoryItem]] = None

class SignalResponse(BaseModel):
    pair: str
    action: str  # "CALL", "PUT", "NEUTRAL"
    confidence: float
    timestamp: float
    reason: Optional[str] = None

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

class TradeStatus(BaseModel):
    active: bool
    total_trades: int
    wins: int
    losses: int
    profit: float
    consecutive_losses: int
    balance: float = 0.0
    currency: Optional[str] = None
