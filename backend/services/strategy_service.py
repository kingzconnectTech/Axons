import time
from datetime import datetime
import pandas as pd
import numpy as np

# --- Candle Indexing Constants ---
FORMING = -1  # Forming candle (DO NOT USE FOR SIGNALS)
CONFIRM = -2  # Last closed candle (SIGNAL CANDLE)
SETUP = -3    # Setup / Indecision candle
# ---------------------------------

PAIR_PROFILE = {
    "default": {
        "rsi_buy": 32,
        "rsi_sell": 68,
        "wick_ratio": 0.6,
        "ema_atr_distance": 0.3,
        "atr_volatility_limit": 1.2,
        "max_spread_atr_factor": 0.25,
        "spread_scale": 1.0,
        "enable_spread_filter": True,
        "sr_lookback": 60,
        "sr_rsi_buy": 45,
        "sr_rsi_sell": 55,
        "sr_rsi_strong_buy": 35,
        "sr_rsi_extreme_buy": 30,
        "sr_rsi_strong_sell": 65,
        "sr_rsi_extreme_sell": 70,
        "ny_overbought": 70,
        "ny_oversold": 30,
    }
}



LAST_SIGNAL = {}
COOLDOWN_SECONDS = 180




def calculate_rsi(prices, period=14):
    if len(prices) < period:
        return 50 # Default neutral if not enough data
    delta = pd.Series(prices).diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[CONFIRM] if not rsi.empty else 50

def calculate_sma(prices, period=14):
    if len(prices) < period:
        return prices[FORMING]
    return pd.Series(prices).rolling(window=period).mean().iloc[CONFIRM]

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    if len(prices) < period:
        return pd.Series([0]*len(prices)), pd.Series([0]*len(prices)), pd.Series([0]*len(prices))
        
    prices_series = pd.Series(prices)
    sma = prices_series.rolling(window=period).mean()
    std = prices_series.rolling(window=period).std()
    
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    
    return upper, sma, lower # sma is middle band

def calculate_ema(prices, period=50):
    if len(prices) < period:
        return prices[FORMING]
    return pd.Series(prices).ewm(span=period, adjust=False).mean().iloc[CONFIRM]

def calculate_atr(candles, period=14):
    if len(candles) < period + 1:
        return 0.0001 # Avoid division by zero
    
    highs = pd.Series([c['max'] for c in candles])
    lows = pd.Series([c['min'] for c in candles])
    closes = pd.Series([c['close'] for c in candles])
    
    # TR calculation
    # TR = max(high-low, abs(high-prev_close), abs(low-prev_close))
    # Pandas approach
    prev_closes = closes.shift(1)
    tr1 = highs - lows
    tr2 = (highs - prev_closes).abs()
    tr3 = (lows - prev_closes).abs()
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean().iloc[CONFIRM]
    
    return atr if not pd.isna(atr) else 0.0001

def calculate_atr_series(candles, period=14):
    """Returns the full ATR series for MA calculation"""
    if len(candles) < period + 1:
        return pd.Series([0.0001] * len(candles))
        
    highs = pd.Series([c['max'] for c in candles])
    lows = pd.Series([c['min'] for c in candles])
    closes = pd.Series([c['close'] for c in candles])
    
    prev_closes = closes.shift(1)
    tr1 = highs - lows
    tr2 = (highs - prev_closes).abs()
    tr3 = (lows - prev_closes).abs()
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr_series = tr.rolling(window=period).mean()
    return atr_series

def calculate_rsi_series(prices, period=14):
    if len(prices) < period:
        return pd.Series([50] * len(prices))
    delta = pd.Series(prices).diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)

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
            
    return support_zones, resistance_zones

def cluster_levels(levels, atr, tolerance=0.5):
    clusters = []
    for lvl in sorted(levels):
        if not clusters or abs(lvl - clusters[-1]) > atr * tolerance:
            clusters.append(lvl)
    return clusters

def resample_to_n_minutes(m1_candles, n_minutes):
    """
    Resamples M1 candles to M{n} candles.
    Requires at least n M1 candles to make 1 M{n} candle.
    """
    if not m1_candles or n_minutes < 1:
        return []

    mn_candles = []
    total_candles = len(m1_candles)
    
    # Start from the index that leaves us with a multiple of n
    # (Align to the end of the series so the latest candle is complete if possible)
    remainder = total_candles % n_minutes
    start_idx = remainder
    
    for i in range(start_idx, total_candles, n_minutes):
        chunk = m1_candles[i:i+n_minutes]
        if len(chunk) < n_minutes:
            break
            
        mn_candle = {
            'open': chunk[0]['open'],
            'close': chunk[-1]['close'],
            'max': max(c['max'] for c in chunk),
            'min': min(c['min'] for c in chunk),
            'volume': sum(c.get('volume', 0) for c in chunk)
        }
        mn_candles.append(mn_candle)
        
    return mn_candles

def resample_to_m5(m1_candles):
    """
    Resamples M1 candles to M5 candles.
    """
    return resample_to_n_minutes(m1_candles, 5)


class StrategyService:
    @staticmethod
    def analyze(pair, candles, strategy_name, spread=None):
        if not candles or len(candles) < 20:
            return {"action": "NEUTRAL", "confidence": 0}

        if strategy_name == "Quick 2M Strategy":
            # Quick 2M Strategy: Fast Momentum (2 Candles)
            # Tuned for quicker signals (2 consecutive candles instead of 3)
            c1 = candles[CONFIRM]     # Last closed
            c2 = candles[CONFIRM-1]   # Previous

            def is_green(c): return c['close'] > c['open']
            def is_red(c): return c['close'] < c['open']
            
            # CALL: 2 Green Candles
            if is_green(c2) and is_green(c1):
                return {"action": "CALL", "confidence": 80, "reason": "Fast Bullish Momentum (2 Candles)"}
            
            # PUT: 2 Red Candles
            if is_red(c2) and is_red(c1):
                return {"action": "PUT", "confidence": 80, "reason": "Fast Bearish Momentum (2 Candles)"}
                
            return {"action": "NEUTRAL", "confidence": 0}

        if strategy_name == "RSI EMA Pullback Fast":
            close_prices = [c["close"] for c in candles]

            ema20 = calculate_ema(close_prices, 20)
            ema50 = calculate_ema(close_prices, 50)
            rsi = calculate_rsi(close_prices, 14)

            conf = get_candle_features(candles[CONFIRM])

            # ----- CALL -----
            if ema20 > ema50:
                if abs(conf['close'] - ema20) <= (conf['total_range'] * 0.3):
                    if 40 <= rsi <= 55:
                        if conf['is_bullish'] and conf['body_ratio'] >= 0.4:
                            return {
                                "action": "CALL",
                                "confidence": 82,
                                "reason": "EMA Pullback Buy"
                            }

            # ----- PUT -----
            if ema20 < ema50:
                if abs(conf['close'] - ema20) <= (conf['total_range'] * 0.3):
                    if 45 <= rsi <= 60:
                        if not conf['is_bullish'] and conf['body_ratio'] >= 0.4:
                            return {
                                "action": "PUT",
                                "confidence": 82,
                                "reason": "EMA Pullback Sell"
                            }

            return {"action": "NEUTRAL", "confidence": 0}

        if strategy_name == "RSI Extreme Reversal Fast":
            close_prices = [c["close"] for c in candles]
            rsi = calculate_rsi(close_prices, 14)
            conf = get_candle_features(candles[CONFIRM])

            wick_down = conf['low'] < min(conf['open'], conf['close'])
            wick_up = conf['high'] > max(conf['open'], conf['close'])

            if rsi <= 28 and conf['is_bullish'] and wick_down and conf['body_ratio'] >= 0.35:
                return {"action": "CALL", "confidence": 80}

            if rsi >= 72 and not conf['is_bullish'] and wick_up and conf['body_ratio'] >= 0.35:
                return {"action": "PUT", "confidence": 80}

            return {"action": "NEUTRAL", "confidence": 0}

        if strategy_name == "Engulfing Momentum Fast":
            prev = get_candle_features(candles[SETUP])
            conf = get_candle_features(candles[CONFIRM])

            # CALL
            if not prev['is_bullish'] and conf['is_bullish']:
                if conf['open'] < prev['close'] and conf['close'] > prev['open']:
                    if conf['body_ratio'] >= 0.5:
                        return {"action": "CALL", "confidence": 83}

            # PUT
            if prev['is_bullish'] and not conf['is_bullish']:
                if conf['open'] > prev['close'] and conf['close'] < prev['open']:
                    if conf['body_ratio'] >= 0.5:
                        return {"action": "PUT", "confidence": 83}

            return {"action": "NEUTRAL", "confidence": 0}

        if strategy_name == "Bollinger Snap Fast":
            close_prices = [c["close"] for c in candles]
            upper, mid, lower = calculate_bollinger_bands(close_prices)

            conf = get_candle_features(candles[CONFIRM])
            close_price = conf['close']

            if close_price < lower.iloc[CONFIRM] and conf['is_bullish'] and conf['body_ratio'] >= 0.4:
                return {"action": "CALL", "confidence": 81}

            if close_price > upper.iloc[CONFIRM] and not conf['is_bullish'] and conf['body_ratio'] >= 0.4:
                return {"action": "PUT", "confidence": 81}

            return {"action": "NEUTRAL", "confidence": 0}

        if strategy_name == "RSI Directional Every Minute":
            close_prices = [c["close"] for c in candles]
            rsi = calculate_rsi(close_prices, 14)
            conf = get_candle_features(candles[CONFIRM])

            # Ignore doji
            if conf['body_ratio'] < 0.2:
                return {"action": "NEUTRAL", "confidence": 0}

            # CALL
            if conf['is_bullish'] and rsi <= 60:
                return {
                    "action": "CALL",
                    "confidence": 72,
                    "reason": "Bullish candle + RSI bias"
                }

            # PUT
            if not conf['is_bullish'] and rsi >= 40:
                return {
                    "action": "PUT",
                    "confidence": 72,
                    "reason": "Bearish candle + RSI bias"
                }

            return {"action": "NEUTRAL", "confidence": 0}

        target_strategy = "RSI + Support & Resistance Reversal"
        if strategy_name != target_strategy:
             return {"action": "NEUTRAL", "confidence": 0}

        close_prices = [c["close"] for c in candles]
        cfg = PAIR_PROFILE.get(pair, PAIR_PROFILE["default"])

        # ---------------------------------------------------------------------
        # STRATEGY: RSI + Support & Resistance Reversal (M1 Binary)
        # ---------------------------------------------------------------------
         
        # 1. Indicators
        # Use confirmed RSI to avoid repainting
        rsi_series = calculate_rsi_series(close_prices, 14)
        rsi = rsi_series.iloc[CONFIRM]

        sr_rsi_buy = cfg.get("sr_rsi_buy", 45)
        sr_rsi_sell = cfg.get("sr_rsi_sell", 55)
        sr_rsi_strong_buy = cfg.get("sr_rsi_strong_buy", 35)
        sr_rsi_extreme_buy = cfg.get("sr_rsi_extreme_buy", 30)
        sr_rsi_strong_sell = cfg.get("sr_rsi_strong_sell", 65)
        sr_rsi_extreme_sell = cfg.get("sr_rsi_extreme_sell", 70)

        atr_series = calculate_atr_series(candles, 14)
        current_atr = atr_series.iloc[CONFIRM]
        if current_atr <= 0:
            return {"action": "NEUTRAL", "confidence": 0}
        
        lookback = cfg.get("sr_lookback", 60)
        support_zones, resistance_zones = identify_zones(candles[-lookback:])
        support_zones = cluster_levels(support_zones, current_atr)
        resistance_zones = cluster_levels(resistance_zones, current_atr)
        
        # 3. Candles
        # We use the standard indexing convention:
        # CONFIRM (-2) = Last Closed Candle (Signal Candle)
        # SETUP (-3) = Indecision Candle (Setup Candle)
        
        conf_candle = get_candle_features(candles[CONFIRM])
        indec_candle = get_candle_features(candles[SETUP])
        
        action = "NEUTRAL"
        confidence = 0
        
        # --- BUY CONDITIONS ---
        # 1. Price enters strong support zone (Indecision candle or Confirmation candle touched it)
        # Using Indecision Low or Confirmation Low
        touched_support = is_near_zone(indec_candle['low'], support_zones) or \
                          is_near_zone(conf_candle['low'], support_zones)
        
        if touched_support:
            if rsi <= sr_rsi_buy:
                if indec_candle['body_ratio'] <= 0.45:
                    if conf_candle['is_bullish'] and \
                       conf_candle['body_ratio'] >= 0.40 and \
                       conf_candle['close'] > indec_candle['midpoint']:
                        
                        action = "CALL"
                        if rsi <= sr_rsi_strong_buy and indec_candle['body_ratio'] <= 0.30 and conf_candle['body_ratio'] >= 0.50:
                            confidence = 88
                        else:
                            confidence = 78
                        if rsi <= sr_rsi_extreme_buy:
                            confidence += 4
                        if conf_candle['close'] > indec_candle['high']:
                            confidence += 4

        # --- SELL CONDITIONS ---
        # 1. Price enters strong resistance zone
        touched_resistance = is_near_zone(indec_candle['high'], resistance_zones) or \
                             is_near_zone(conf_candle['high'], resistance_zones)
                             
        if touched_resistance:
            if rsi >= sr_rsi_sell:
                if indec_candle['body_ratio'] <= 0.45:
                    if not conf_candle['is_bullish'] and \
                       conf_candle['body_ratio'] >= 0.40 and \
                       conf_candle['close'] < indec_candle['midpoint']:
                        
                        action = "PUT"
                        if rsi >= sr_rsi_strong_sell and indec_candle['body_ratio'] <= 0.30 and conf_candle['body_ratio'] >= 0.50:
                            confidence = 88
                        else:
                            confidence = 78
                        if rsi >= sr_rsi_extreme_sell:
                            confidence += 4
                        if conf_candle['close'] < indec_candle['low']:
                            confidence += 4

        # --- FILTERS ---
        # 1. Trend Filter (Reject if RSI stuck in overbought/oversold for multiple candles)
        # Check last 3 candles RSI (using closed data)
        # i=1 -> [:-1] (CONFIRM), i=2 -> [:-2] (SETUP), i=3 -> [:-3] (SETUP-1)
        recent_rsis = [
            rsi_series.iloc[CONFIRM],
            rsi_series.iloc[SETUP],
            rsi_series.iloc[SETUP - 1],
        ]
        # If all are >= 65 (strong uptrend), risk for PUT
        # If all are <= 35 (strong downtrend), risk for CALL
        
        if action == "PUT" and all(r >= 65 for r in recent_rsis):
             pass 

        m5_candles = resample_to_m5(candles)
        if len(m5_candles) >= 14:
            m5_close = [c['close'] for c in m5_candles]
            m5_rsi = calculate_rsi(m5_close, 14)
            
            if not (35 <= m5_rsi <= 65):
                 confidence -= 10
            else:
                 confidence += 3

        clamped_confidence = max(confidence, 0)
        result = {
            "action": action,
            "confidence": min(clamped_confidence, 100),
        }
        return StrategyService._apply_cooldown(pair, target_strategy, result)

    @staticmethod
    def _apply_cooldown(pair, strategy_name, result):
        key = f"{pair}:{strategy_name}"
        action = result.get("action")
        if action in ["CALL", "PUT"]:
            now = time.time()
            last_ts = LAST_SIGNAL.get(key)
            if last_ts is not None and now - last_ts < COOLDOWN_SECONDS:
                return {"action": "NEUTRAL", "confidence": 0}
            LAST_SIGNAL[key] = now
        confidence = result.get("confidence", 0)
        result["confidence"] = max(0, min(confidence, 100))
        return result

