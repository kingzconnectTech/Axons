from pydantic import BaseModel
from typing import Optional, List

class SignalRequest(BaseModel):
    pairs: List[str]
    timeframe: int  # in minutes
    strategy: str

class SignalBotStart(BaseModel):
    email: str
    pairs: List[str]
    timeframe: int
    strategy: str

class SignalBotStop(BaseModel):
    email: str

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

class TokenUpdate(BaseModel):
    email: str
    token: str
