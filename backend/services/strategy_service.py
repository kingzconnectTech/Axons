import pandas as pd
import numpy as np

def calculate_rsi(prices, period=14):
    if len(prices) < period:
        return 50 # Default neutral if not enough data
    delta = pd.Series(prices).diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1] if not rsi.empty else 50

def calculate_sma(prices, period=14):
    if len(prices) < period:
        return prices[-1]
    return pd.Series(prices).rolling(window=period).mean().iloc[-1]

def get_candle_features(candle):
    """
    Extracts features from a candle dict:
    open, close, high (max), low (min)
    Returns: body_size, total_range, body_ratio, is_bullish, midpoint
    """
    o = candle['open']
    c = candle['close']
    h = candle['max']
    l = candle['min']
    
    body_size = abs(c - o)
    total_range = h - l if h != l else 0.00001
    body_ratio = body_size / total_range
    is_bullish = c > o
    midpoint = (o + c) / 2
    
    return {
        "body_size": body_size,
        "total_range": total_range,
        "body_ratio": body_ratio,
        "is_bullish": is_bullish,
        "midpoint": midpoint,
        "open": o,
        "close": c,
        "high": h,
        "low": l
    }

def is_near_zone(price, zones, buffer_percent=0.001):
    """
    Checks if price is within buffer_percent of any level in zones.
    """
    for level in zones:
        if abs(price - level) <= (price * buffer_percent):
            return True
    return False

def identify_zones(candles, window=50):
    """
    Identify Support (swing lows) and Resistance (swing highs) levels.
    """
    highs = pd.Series([c['max'] for c in candles])
    lows = pd.Series([c['min'] for c in candles])
    
    resistance_zones = []
    support_zones = []
    
    # Simple pivot detection
    for i in range(2, len(candles) - 2):
        # Swing High
        if highs[i] > highs[i-1] and highs[i] > highs[i-2] and \
           highs[i] > highs[i+1] and highs[i] > highs[i+2]:
            resistance_zones.append(highs[i])
            
        # Swing Low
        if lows[i] < lows[i-1] and lows[i] < lows[i-2] and \
           lows[i] < lows[i+1] and lows[i] < lows[i+2]:
            support_zones.append(lows[i])
            
    # Cluster zones (optional optimization could go here, but raw lists work for now)
    return support_zones, resistance_zones

def resample_to_m5(m1_candles):
    """
    Resamples M1 candles to M5 candles.
    Requires at least 5 M1 candles to make 1 M5 candle.
    """
    m5_candles = []
    # Process in chunks of 5
    # We want to align with clock if possible, but for simple RSI, rolling chunks work
    # or just non-overlapping chunks from the end.
    # Let's take len(candles) // 5 chunks.
    
    n = len(m1_candles)
    # Start from the index that leaves us with a multiple of 5, or just take latest full sets
    remainder = n % 5
    start_idx = remainder
    
    for i in range(start_idx, n, 5):
        chunk = m1_candles[i:i+5]
        if len(chunk) < 5: break
        
        m5_candle = {
            'open': chunk[0]['open'],
            'close': chunk[-1]['close'],
            'max': max(c['max'] for c in chunk),
            'min': min(c['min'] for c in chunk),
            'volume': sum(c.get('volume', 0) for c in chunk)
        }
        m5_candles.append(m5_candle)
        
    return m5_candles

class StrategyService:
    @staticmethod
    def analyze(pair, candles, strategy_name):
        if not candles or len(candles) < 30:
            return {"action": "NEUTRAL", "confidence": 0}

        close_prices = [c['close'] for c in candles]
        
        # ---------------------------------------------------------------------
        # STRATEGY: RSI + Support & Resistance Reversal (M1 Binary)
        # ---------------------------------------------------------------------
        target_strategy = "RSI + Support & Resistance Reversal"
        
        # Match simplified names if needed
        if strategy_name == target_strategy or strategy_name == "AGGRESIVE": # Overwriting AGGRESIVE for now or strictly matching
             
            # 1. Indicators
            rsi = calculate_rsi(close_prices, 14)
            
            # 2. Structure (Support/Resistance)
            support_zones, resistance_zones = identify_zones(candles[-60:]) # Look at last 60 candles
            
            # 3. Candles (Current is confirmation, Previous is Indecision)
            # We analyze the LATEST COMPLETED candle for entry?
            # Usually bots run on "tick" or "new candle". 
            # If we assume 'candles' includes the currently forming candle as the last one:
            # The strategy says "Entry is taken at the close of the bullish confirmation candle".
            # So we should look at the LAST CLOSED candle (candles[-2]) as Confirmation, 
            # and candles[-3] as Indecision. 
            # OR, if the bot runs precisely at candle close, candles[-1] is the just-closed candle.
            # Let's assume candles[-1] is the 'just closed' or 'current active'.
            # If it's real-time, candles[-1] is usually forming.
            # Strategy says: "A bullish confirmation candle CLOSES". 
            # So we trigger when we detect the pattern on the JUST COMPLETED candle.
            # Let's assume candles[-1] is the latest data point. If it's forming, we might be premature.
            # However, for backtest/analysis APIs, usually last candle is "current".
            # Let's check logic: "A bullish confirmation candle closes".
            # We should look at candles[-1] (if it's the completed one) or candles[-2] (if -1 is forming).
            # Standard practice: Check pattern on [-1] assuming we are checking "at close". 
            # But if -1 is "forming", we can't know if it "closed" yet unless we track time.
            # For this implementation, let's analyze the pattern on [-1] (latest available) 
            # assuming the user invokes this when they want a signal.
            
            # Actually, standard bot logic:
            # -1 is Current (Forming).
            # -2 is Last Closed.
            # If we wait for -1 to close, we are technically trading on the open of Next.
            # So we look for pattern on -2 (Confirmation) and -3 (Indecision).
            
            current_candle = candles[-1] # This might be forming.
            # Let's look at the LAST TWO fully formed candles for the pattern?
            # Or does the user want "Real-time" signal?
            # "Entry is taken at the close of the bullish confirmation candle".
            # This implies we trade on the OPEN of the NEXT candle immediately after confirmation closes.
            # So we analyze [-1] (assuming it just closed or is about to).
            
            # Let's use [-1] as Confirmation and [-2] as Indecision.
            
            conf_candle = get_candle_features(candles[-1])
            indec_candle = get_candle_features(candles[-2])
            
            action = "NEUTRAL"
            confidence = 0
            
            # --- BUY CONDITIONS ---
            # 1. Price enters strong support zone (Indecision candle or Confirmation candle touched it)
            # Using Indecision Low or Confirmation Low
            touched_support = is_near_zone(indec_candle['low'], support_zones) or \
                              is_near_zone(conf_candle['low'], support_zones)
            
            if touched_support:
                # 2. RSI <= 35 (Ideal <= 30)
                if rsi <= 35:
                    # 3. Indecision Candle (Body <= 30% of range)
                    if indec_candle['body_ratio'] <= 0.30:
                        # 4. Bullish Confirmation Candle
                        # Close > Open
                        # Body >= 50%
                        # Close > Indecision Midpoint
                        if conf_candle['is_bullish'] and \
                           conf_candle['body_ratio'] >= 0.50 and \
                           conf_candle['close'] > indec_candle['midpoint']:
                            
                            action = "CALL"
                            confidence = 85 # High base confidence
                            if rsi <= 30: confidence += 5
                            if conf_candle['close'] > indec_candle['high']: confidence += 5 # Strong engulfing

            # --- SELL CONDITIONS ---
            # 1. Price enters strong resistance zone
            touched_resistance = is_near_zone(indec_candle['high'], resistance_zones) or \
                                 is_near_zone(conf_candle['high'], resistance_zones)
                                 
            if touched_resistance:
                # 2. RSI >= 65 (Ideal >= 70)
                if rsi >= 65:
                    # 3. Indecision Candle
                    if indec_candle['body_ratio'] <= 0.30:
                        # 4. Bearish Confirmation Candle
                        # Close < Open
                        # Body >= 50%
                        # Close < Indecision Midpoint
                        if not conf_candle['is_bullish'] and \
                           conf_candle['body_ratio'] >= 0.50 and \
                           conf_candle['close'] < indec_candle['midpoint']:
                            
                            action = "PUT"
                            confidence = 85
                            if rsi >= 70: confidence += 5
                            if conf_candle['close'] < indec_candle['low']: confidence += 5

            # --- FILTERS ---
            # 1. Trend Filter (Reject if RSI stuck in overbought/oversold for multiple candles)
            # Check last 3 candles RSI
            recent_rsis = [calculate_rsi(close_prices[:-(i)], 14) for i in range(3)]
            # If all are >= 65 (strong uptrend), risk for PUT
            # If all are <= 35 (strong downtrend), risk for CALL
            
            if action == "PUT" and all(r >= 65 for r in recent_rsis):
                 # Strict trend filter: if it was overbought for a while, maybe don't fade it?
                 # But strategy says "Market shows loss of bullish momentum".
                 # If we have the candle confirmation, we can ignore this, or reduce confidence.
                 pass 

            # 2. M5 Range Confirmation (Optional)
            # Confirm M5 RSI between 40-60 (Range Bound)
            m5_candles = resample_to_m5(candles)
            if len(m5_candles) >= 14:
                m5_close = [c['close'] for c in m5_candles]
                m5_rsi = calculate_rsi(m5_close, 14)
                
                # If M5 RSI is clearly trending (>60 or <40), reduce confidence for a range strategy
                if not (40 <= m5_rsi <= 60):
                     # If we are betting on Reversal, maybe extreme M5 RSI is okay?
                     # User said: "Confirm M5 RSI between 40–60 (range confirmation)"
                     # This implies we ONLY want to trade when the higher timeframe is RANGING.
                     # So if M5 is trending (e.g. 70), M1 reversals might fail.
                     confidence -= 20 # Penalize heavily if not in range
                else:
                     confidence += 5 # Boost if confirmed range

            return {
                "action": action, 
                "confidence": min(confidence, 100) # Cap at 100
            }
        
        return {"action": "NEUTRAL", "confidence": 0}
