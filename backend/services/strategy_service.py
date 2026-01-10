import pandas as pd
import numpy as np

def calculate_rsi(prices, period=14):
    delta = pd.Series(prices).diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]

def calculate_sma(prices, period=14):
    return pd.Series(prices).rolling(window=period).mean().iloc[-1]

class StrategyService:
    @staticmethod
    def analyze(pair, candles, strategy_name):
        if not candles:
            return {"action": "NEUTRAL", "confidence": 0}

        close_prices = [c['close'] for c in candles]
        
        if strategy_name == "RSI Reversal":
            rsi = calculate_rsi(close_prices)
            if rsi < 30:
                return {"action": "CALL", "confidence": (30 - rsi) / 30 * 100}
            elif rsi > 70:
                return {"action": "PUT", "confidence": (rsi - 70) / 30 * 100}
            else:
                return {"action": "NEUTRAL", "confidence": 0}
        
        elif strategy_name == "SMA Trend":
            sma = calculate_sma(close_prices, 14)
            current_price = close_prices[-1]
            if current_price > sma:
                return {"action": "CALL", "confidence": 60}
            elif current_price < sma:
                return {"action": "PUT", "confidence": 60}
            
        return {"action": "NEUTRAL", "confidence": 0}
