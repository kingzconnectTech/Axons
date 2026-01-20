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

OTC_ONLY = {
    "OTC Mean Reversion",
    "OTC Volatility Trap Break–Reclaim",
}

REAL_ONLY = {
    "Real Trend Pullback",
    "London Breakout",
    "NY Reversal",
}

REVERSAL_STRATEGIES = {
    "RSI + Support & Resistance Reversal",
    "NY Reversal",
}

STRATEGY_ALIASES = {
    "AGGRESIVE": "RSI + Support & Resistance Reversal",
    "OTC Trend Pullback": "OTC Trend-Pullback Engine Strategy",
}

LAST_SIGNAL = {}
COOLDOWN_SECONDS = 180


def detect_market_type(pair):
    otc_keywords = ["OTC", "-OTC"]
    upper_pair = pair.upper()
    for k in otc_keywords:
        if k in upper_pair:
            return "OTC"
    return "REAL"


def get_session(timestamp):
    ts = timestamp
    if ts > 1e12:
        ts = ts / 1000.0
    dt = datetime.fromtimestamp(ts)
    hour = dt.hour
    if 7 <= hour <= 11:
        return "LONDON"
    if 13 <= hour <= 17:
        return "NEW_YORK"
    return "OFF_SESSION"

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
    return pd.Series(prices).rolling(window=period).mean().iloc[FORMING]

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
    return pd.Series(prices).ewm(span=period, adjust=False).mean().iloc[FORMING]

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
    atr = tr.rolling(window=period).mean().iloc[FORMING]
    
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

def resample_to_n_minutes(m1_candles, n):
    mN = []
    if n <= 1:
        return m1_candles
    total = len(m1_candles)
    remainder = total % n
    start_idx = remainder
    for i in range(start_idx, total, n):
        chunk = m1_candles[i:i+n]
        if len(chunk) < n:
            break
        mN.append({
            'open': chunk[0]['open'],
            'close': chunk[-1]['close'],
            'max': max(c['max'] for c in chunk),
            'min': min(c['min'] for c in chunk),
            'volume': sum(c.get('volume', 0) for c in chunk)
        })
    return mN

def analyze_otc_mean_reversion(candles, cfg=None):
    """
    OTC Mean Reversion Strategy Logic
    """
    if len(candles) < 55: # Need enough for EMA50 + lookback
        return "NEUTRAL", 0
        
    close_prices = [c['close'] for c in candles]
    
    rsi_series = calculate_rsi_series(close_prices, 14)
    current_rsi = rsi_series.iloc[CONFIRM]
    prev_rsi = rsi_series.iloc[SETUP]
    
    # Calculate EMA on confirmed data or slice series
    ema_series = pd.Series(close_prices).ewm(span=50, adjust=False).mean()
    ema_50 = ema_series.iloc[CONFIRM]
    
    atr_series = calculate_atr_series(candles, 14)
    current_atr = atr_series.iloc[CONFIRM]
    if current_atr <= 0:
        return "NEUTRAL", 0

    atr_ma_20 = atr_series.rolling(window=20).mean().iloc[CONFIRM]
    
    # Current Candle (Signal Candle is CONFIRM)
    c = candles[CONFIRM]
    open_p = c['open']
    close_p = c['close']
    high_p = c['max']
    low_p = c['min']
    
    candle_range = high_p - low_p if high_p != low_p else 0.00001
    
    # Wick Ratios
    # Buy: LowerWick = min(Open, Close) - Low
    lower_wick = min(open_p, close_p) - low_p
    lower_wick_ratio = lower_wick / candle_range
    
    # Sell: UpperWick = High - max(Open, Close)
    upper_wick = high_p - max(open_p, close_p)
    upper_wick_ratio = upper_wick / candle_range
    
    # 5-candle lookback (excluding current CONFIRM candle)
    # candles[CONFIRM-5 : CONFIRM] gives the 5 candles before CONFIRM
    prev_5_candles = candles[CONFIRM-5:CONFIRM]
    if len(prev_5_candles) < 5:
        return "NEUTRAL", 0
        
    lowest_low_5 = min(x['min'] for x in prev_5_candles)
    highest_high_5 = max(x['max'] for x in prev_5_candles)
    
    action = "NEUTRAL"
    confidence = 0
    
    if cfg is None:
        cfg = PAIR_PROFILE["default"]

    if current_atr > atr_ma_20 * cfg["atr_volatility_limit"]:
        return "NEUTRAL", 0
        
    recent_ranges = [(x['max'] - x['min']) for x in prev_5_candles]
    avg_range = sum(recent_ranges) / len(recent_ranges) if recent_ranges else candle_range
    if candle_range > 1.8 * avg_range:
        return "NEUTRAL", 0

    rsi_buy_cond = (current_rsi <= cfg["rsi_buy"]) and (current_rsi > prev_rsi)
    
    if rsi_buy_cond:
        # 2. Current Low < lowest low of last 5
        if low_p < lowest_low_5:
            if lower_wick_ratio >= cfg["wick_ratio"]:
                # 4. Bullish Rejection (Close > Open)
                if close_p > open_p:
                    # 5. Distance from EMA50 >= configured ATR multiple
                    dist = abs(ema_50 - close_p)
                    if dist >= (cfg["ema_atr_distance"] * current_atr):
                        action = "CALL"
                        confidence = 88
                        
                        # Boosts
                        if lower_wick_ratio >= 0.7: confidence += 5
                        if current_rsi <= 20: confidence += 5

    rsi_sell_cond = (current_rsi >= cfg["rsi_sell"]) and (current_rsi < prev_rsi)
    
    if rsi_sell_cond:
        # 2. Current High > highest high of last 5
        if high_p > highest_high_5:
            if upper_wick_ratio >= cfg["wick_ratio"]:
                # 4. Bearish Rejection (Close < Open)
                if close_p < open_p:
                    dist = abs(close_p - ema_50)
                    if dist >= (cfg["ema_atr_distance"] * current_atr):
                        action = "PUT"
                        confidence = 88
                        
                        if upper_wick_ratio >= 0.7: confidence += 5
                        if current_rsi >= 80: confidence += 5

    return action, min(confidence, 100)

def analyze_otc_volatility_trap(candles):
    """
    OTC Volatility Trap Break–Reclaim Strategy Logic
    """
    if len(candles) < 40:
        return "NEUTRAL", 0
        
    close_prices = [c['close'] for c in candles]
    
    upper_band, middle_band, lower_band = calculate_bollinger_bands(close_prices, 20, 2)
    ema_20_series = pd.Series(close_prices).ewm(span=20, adjust=False).mean()
    atr_series = calculate_atr_series(candles, 14)
    atr_ma_20 = atr_series.rolling(window=20).mean().iloc[CONFIRM]
    
    current_atr = atr_series.iloc[CONFIRM]
    if current_atr <= 0:
        return "NEUTRAL", 0
    
    bb_width = upper_band - lower_band
    bb_width_ma_30 = bb_width.rolling(window=30).mean().iloc[CONFIRM]
    current_bb_width = bb_width.iloc[CONFIRM]
    
    # RSI for Upgrade
    rsi_series = calculate_rsi_series(close_prices, 14)
    rsi = rsi_series.iloc[CONFIRM]
    
    # Candles
    # We need:
    # Breakout Candle (SETUP)
    # Reclaim Candle (CONFIRM)
    
    breakout_c = candles[SETUP]
    reclaim_c = candles[CONFIRM]
    
    # Breakout Candle Features
    breakout_open = breakout_c['open']
    breakout_close = breakout_c['close']
    breakout_high = breakout_c['max']
    breakout_low = breakout_c['min']
    breakout_range = breakout_high - breakout_low if breakout_high != breakout_low else 0.00001
    breakout_body = abs(breakout_close - breakout_open)
    breakout_body_ratio = breakout_body / breakout_range
    
    # Reclaim Candle Features
    reclaim_open = reclaim_c['open']
    reclaim_close = reclaim_c['close']
    reclaim_high = reclaim_c['max']
    reclaim_low = reclaim_c['min']
    reclaim_range = reclaim_high - reclaim_low if reclaim_high != reclaim_low else 0.00001
    
    idx_reclaim = CONFIRM
    idx_breakout = SETUP
    idx_prev_breakout = SETUP - 1
    
    if bb_width.iloc[idx_reclaim] >= bb_width_ma_30 * 1.1:
        return "NEUTRAL", 0
        
    if atr_series.iloc[idx_reclaim] > atr_ma_20 * 1.15:
        return "NEUTRAL", 0
        
    # 3. Price oscillating around EMA 20
    
    action = "NEUTRAL"
    confidence = 0
    
    # Define Candles based on shifted indices
    breakout_c = candles[idx_breakout]
    reclaim_c = candles[idx_reclaim]
    prev_breakout_c = candles[idx_prev_breakout]

    # Re-extract features for correct indices
    breakout_open = breakout_c['open']
    breakout_close = breakout_c['close']
    breakout_high = breakout_c['max']
    breakout_low = breakout_c['min']
    breakout_range = breakout_high - breakout_low if breakout_high != breakout_low else 0.00001
    breakout_body = abs(breakout_close - breakout_open)
    breakout_body_ratio = breakout_body / breakout_range
    
    reclaim_open = reclaim_c['open']
    reclaim_close = reclaim_c['close']
    reclaim_high = reclaim_c['max']
    reclaim_low = reclaim_c['min']
    reclaim_range = reclaim_high - reclaim_low if reclaim_high != reclaim_low else 0.00001

    if breakout_body_ratio > 0.75:
        return "NEUTRAL", 0
        
    reclaim_body = abs(reclaim_close - reclaim_open)
    reclaim_total_wick = reclaim_range - reclaim_body
    reclaim_wick_ratio = reclaim_total_wick / reclaim_range
    if reclaim_wick_ratio < 0.07:
        return "NEUTRAL", 0
        
    # 3. Two band breaks occur without a reclaim
    prev_breakout_close = prev_breakout_c['close']
    
    ema_val = ema_20_series.iloc[idx_reclaim]

    lb_breakout = lower_band.iloc[idx_breakout]
    lb_reclaim = lower_band.iloc[idx_reclaim]
    
    if breakout_close < lb_breakout:
        # 2. Next candle closes back inside the bands (Reclaim)
        if reclaim_close > lb_reclaim:
            # 3. Reclaim candle closes above EMA 20
            if reclaim_close > ema_val:
                # 5. Check "Two band breaks" filter
                if prev_breakout_close < lower_band.iloc[idx_prev_breakout]:
                    return "NEUTRAL", 0
                
                if rsi < 50:
                    action = "CALL"
                    confidence = 90
                    if reclaim_close > middle_band.iloc[idx_reclaim]: confidence += 5

    ub_breakout = upper_band.iloc[idx_breakout]
    ub_reclaim = upper_band.iloc[idx_reclaim]
    
    if breakout_close > ub_breakout:
        # 2. Next candle closes back inside
        if reclaim_close < ub_reclaim:
            # 3. Reclaim candle closes below EMA 20
            if reclaim_close < ema_val:
                # 4. Check "Two band breaks"
                if prev_breakout_close > upper_band.iloc[idx_prev_breakout]:
                    return "NEUTRAL", 0
                    
                if rsi > 50:
                    action = "PUT"
                    confidence = 90
                    if reclaim_close < middle_band.iloc[idx_reclaim]: confidence += 5

    return action, min(confidence, 100)

def analyze_otc_trend_pullback(candles):
    if len(candles) < 60:
        return "NEUTRAL", 0
    close_prices = [c['close'] for c in candles]
    ema20_series = pd.Series(close_prices).ewm(span=20, adjust=False).mean()
    ema50_series = pd.Series(close_prices).ewm(span=50, adjust=False).mean()
    rsi_series = calculate_rsi_series(close_prices, 14)
    upper_band, middle_band, lower_band = calculate_bollinger_bands(close_prices, 20, 2)
    atr_series = calculate_atr_series(candles, 14)
    atr_ma_20 = atr_series.rolling(window=20).mean().iloc[CONFIRM]
    idx_confirm = CONFIRM
    idx_pullback = SETUP
    ema20_c = ema20_series.iloc[idx_confirm]
    ema50_c = ema50_series.iloc[idx_confirm]
    ema20_p = ema20_series.iloc[idx_pullback]
    ema50_p = ema50_series.iloc[idx_pullback]
    rsi_pull = rsi_series.iloc[idx_pullback]
    rsi_prev_pull = rsi_series.iloc[idx_pullback-1] if len(rsi_series) >= abs(idx_pullback-1) else rsi_pull
    bb_width = upper_band - lower_band
    bb_width_ma_30 = bb_width.rolling(window=30).mean().iloc[CONFIRM]
    c_confirm = candles[idx_confirm]
    c_pull = candles[idx_pullback]
    o_conf = c_confirm['open']
    c_conf = c_confirm['close']
    h_conf = c_confirm['max']
    l_conf = c_confirm['min']
    o_pull = c_pull['open']
    c_pull_close = c_pull['close']
    h_pull = c_pull['max']
    l_pull = c_pull['min']
    range_pull = h_pull - l_pull if h_pull != l_pull else 0.00001
    lower_wick_pull = min(o_pull, c_pull_close) - l_pull
    upper_wick_pull = h_pull - max(o_pull, c_pull_close)
    lower_wick_ratio = lower_wick_pull / range_pull
    upper_wick_ratio = upper_wick_pull / range_pull
    ema20_c_prev1 = ema20_series.iloc[idx_confirm-1]
    ema20_c_prev2 = ema20_series.iloc[idx_confirm-2]
    ema50_c_prev1 = ema50_series.iloc[idx_confirm-1]
    ema50_c_prev2 = ema50_series.iloc[idx_confirm-2]
    uptrend = (ema20_c > ema50_c) and (ema20_c > ema20_c_prev1 > ema20_c_prev2) and (ema50_c > ema50_c_prev1 > ema50_c_prev2) and (c_conf > ema20_c)
    downtrend = (ema20_c < ema50_c) and (ema20_c < ema20_c_prev1 < ema20_c_prev2) and (ema50_c < ema50_c_prev1 < ema50_c_prev2) and (c_conf < ema20_c)
    if bb_width.iloc[idx_confirm] < 0.7 * bb_width_ma_30:
        return "NEUTRAL", 0
    if atr_series.iloc[idx_confirm] <= 0:
        return "NEUTRAL", 0
    if atr_series.iloc[idx_confirm] > atr_ma_20 * 1.8:
        return "NEUTRAL", 0
    fail_count = 0
    lookback = min(len(candles)+SETUP, 12) # candles-3 if SETUP is -3
    for i in range(-lookback, SETUP):
        ema20_i = ema20_series.iloc[i]
        ema20_i_next = ema20_series.iloc[i+1] if (i+1) < 0 else ema20_series.iloc[FORMING]
        c_i = candles[i]
        c_i_next = candles[i+1]
        touched = (c_i['min'] <= ema20_i) or (c_i['max'] >= ema20_i)
        failed_up = (c_i['min'] <= ema20_i) and (c_i_next['close'] <= ema20_i_next)
        failed_down = (c_i['max'] >= ema20_i) and (c_i_next['close'] >= ema20_i_next)
        if touched and (failed_up or failed_down):
            fail_count += 1
    if fail_count >= 3:
        return "NEUTRAL", 0
    action = "NEUTRAL"
    confidence = 0
    if uptrend:
        if (l_pull <= ema20_p) and (lower_wick_ratio >= 0.35) and (rsi_pull >= 43) and (c_conf > ema20_c) and (c_pull_close >= ema50_p):
            action = "CALL"
            confidence = 85
            spread = abs(ema20_c - ema50_c)
            if lower_wick_ratio >= 0.6:
                confidence += 5
            if spread > 0 and spread >= (atr_series.iloc[idx_confirm] * 0.3):
                confidence += 5
    elif downtrend:
        if (h_pull >= ema20_p) and (upper_wick_ratio >= 0.35) and (rsi_pull <= 57) and (c_conf < ema20_c) and (c_pull_close <= ema50_p):
            action = "PUT"
            confidence = 85
            spread = abs(ema50_c - ema20_c)
            if upper_wick_ratio >= 0.6:
                confidence += 5
            if spread > 0 and spread >= (atr_series.iloc[idx_confirm] * 0.3):
                confidence += 5
    return action, min(confidence, 100)


def analyze_real_trend_pullback(candles, cfg):
    if len(candles) < 20:
        return "NEUTRAL", 0
    close_prices = [c["close"] for c in candles]
    closes_series = pd.Series(close_prices)
    ema20_series = closes_series.ewm(span=20, adjust=False).mean()
    ema50_series = closes_series.ewm(span=50, adjust=False).mean()
    ema200_series = closes_series.ewm(span=200, adjust=False).mean()
    atr_series = calculate_atr_series(candles, 14)
    current_atr = atr_series.iloc[CONFIRM]
    if current_atr <= 0:
        return "NEUTRAL", 0
    c = candles[CONFIRM]
    trend_up = ema50_series.iloc[CONFIRM] > ema200_series.iloc[CONFIRM]
    trend_down = ema50_series.iloc[CONFIRM] < ema200_series.iloc[CONFIRM]
    if not (trend_up or trend_down):
        return "NEUTRAL", 0
    pullback_dist = abs(c["close"] - ema20_series.iloc[CONFIRM])
    if pullback_dist > current_atr * 1.2:
        return "NEUTRAL", 0
    body = abs(c["close"] - c["open"])
    range_ = c["max"] - c["min"]
    if range_ == 0:
        return "NEUTRAL", 0
    confidence = 70
    if trend_up:
        lower_wick = min(c["open"], c["close"]) - c["min"]
        if c["close"] > ema20_series.iloc[CONFIRM] and lower_wick / range_ >= cfg["wick_ratio"]:
            confidence += 15
            return "CALL", min(confidence, 100)
    if trend_down:
        upper_wick = c["max"] - max(c["open"], c["close"])
        if c["close"] < ema20_series.iloc[CONFIRM] and upper_wick / range_ >= cfg["wick_ratio"]:
            confidence += 15
            return "PUT", min(confidence, 100)
    return "NEUTRAL", 0


def analyze_london_breakout(candles, cfg):
    if len(candles) < 25:
        return "NEUTRAL", 0
    atr_series = calculate_atr_series(candles, 14)
    recent_atr = atr_series.iloc[CONFIRM]
    if recent_atr <= 0:
        return "NEUTRAL", 0
    avg_atr = atr_series.rolling(30).mean().iloc[CONFIRM]
    if recent_atr > avg_atr * 1.1:
        return "NEUTRAL", 0
    c = candles[CONFIRM]
    ts = c.get("timestamp")
    if ts is None:
        return "NEUTRAL", 0
    session = get_session(ts)
    if session != "LONDON":
        return "NEUTRAL", 0
    if abs(c["close"] - c["open"]) < recent_atr * 0.25:
        return "NEUTRAL", 0
    asian_ts = candles[-20].get("timestamp")
    if asian_ts is None:
        return "NEUTRAL", 0
    if get_session(asian_ts) != "OFF_SESSION":
        return "NEUTRAL", 0
    asian_slice = candles[-20:-5]
    if len(asian_slice) < 5:
        return "NEUTRAL", 0
    asian_high = max(x["max"] for x in asian_slice)
    asian_low = min(x["min"] for x in asian_slice)
    confidence = 75
    if c["close"] > asian_high and (c["close"] - c["open"]) > recent_atr * 0.4:
        confidence += 10
        return "CALL", min(confidence, 100)
    if c["close"] < asian_low and (c["open"] - c["close"]) > recent_atr * 0.4:
        confidence += 10
        return "PUT", min(confidence, 100)
    return "NEUTRAL", 0


def analyze_ny_reversal(candles, cfg):
    if len(candles) < 20:
        return "NEUTRAL", 0
    close_prices = [c["close"] for c in candles]
    rsi_series = calculate_rsi_series(close_prices, 14)
    atr_series = calculate_atr_series(candles, 14)
    current_atr = atr_series.iloc[CONFIRM]
    if current_atr <= 0:
        return "NEUTRAL", 0
    c = candles[CONFIRM]
    ts = c.get("timestamp")
    if ts is None:
        return "NEUTRAL", 0
    session = get_session(ts)
    if session != "NEW_YORK":
        return "NEUTRAL", 0
    if len(candles) < 16:
        return "NEUTRAL", 0
    origin = candles[-15]
    move = abs(c["close"] - origin["open"])
    if move < current_atr * 1.5:
        return "NEUTRAL", 0
    range_ = c["max"] - c["min"]
    if range_ == 0:
        return "NEUTRAL", 0
    confidence = 70
    rsi_value = rsi_series.iloc[CONFIRM]
    ny_overbought = cfg.get("ny_overbought", 70)
    ny_oversold = cfg.get("ny_oversold", 30)
    if rsi_value > ny_overbought:
        upper_wick = c["max"] - max(c["open"], c["close"])
        if upper_wick / range_ >= cfg["wick_ratio"]:
            confidence += 20
            return "PUT", min(confidence, 100)
    if rsi_value < ny_oversold:
        lower_wick = min(c["open"], c["close"]) - c["min"]
        if lower_wick / range_ >= cfg["wick_ratio"]:
            confidence += 20
            return "CALL", min(confidence, 100)
    return "NEUTRAL", 0

def analyze_quick_2m(candles):
    """
    Quick 2M Analysis Strategy
    Uses 1m candles to predict 2m movement.
    Trend following based on last few candles.
    Returns: (action, confidence, reason)
    """
    if len(candles) < 5:
        return "NEUTRAL", 0, "Insufficient data"
    
    # Analyze last 3 CLOSED candles (excluding forming one if present, assume -1 is forming)
    # We use CONFIRM, SETUP, SETUP-1 as the confirmed history
    c1 = candles[CONFIRM] # Most recent closed
    c2 = candles[SETUP]
    c3 = candles[SETUP-1]
    
    def is_green(c): return c['close'] > c['open']
    def is_red(c): return c['close'] < c['open']
    def body(c): return abs(c['close'] - c['open'])
    
    # Logic: Strong Momentum (3 consecutive candles)
    if is_green(c1) and is_green(c2) and is_green(c3):
        # Filter: Sustained momentum (latest body is not tiny compared to previous)
        if body(c1) > body(c2) * 0.5: 
             return "CALL", 88, "3 Consecutive Green Candles with strong momentum"
             
    if is_red(c1) and is_red(c2) and is_red(c3):
        if body(c1) > body(c2) * 0.5:
            return "PUT", 88, "3 Consecutive Red Candles with strong momentum"

    avg_body_2 = (body(c1) + body(c2)) / 2.0

    if is_green(c1) and is_green(c2) and avg_body_2 > 0:
        if body(c1) >= avg_body_2 * 0.6:
            return "CALL", 74, "2 Green candles with sustained upward momentum"

    if is_red(c1) and is_red(c2) and avg_body_2 > 0:
        if body(c1) >= avg_body_2 * 0.6:
            return "PUT", 74, "2 Red candles with sustained downward momentum"

    return "NEUTRAL", 0, "No strong trend pattern detected (Side-ways)"

def analyze_test_execution(candles):
    """
    Test Execution Strategy:
    Simple momentum/reversal logic for verifying execution.
    Green candle -> CALL
    Red candle -> PUT
    Confidence: 99
    """
    if len(candles) < 2:
        return "NEUTRAL", 0
    
    last_candle = candles[CONFIRM] # Use closed candle
    open_p = last_candle['open']
    close_p = last_candle['close']
    
    if close_p > open_p:
        return "CALL", 99
    elif close_p < open_p:
        return "PUT", 99
        
    return "NEUTRAL", 0

class StrategyService:
    @staticmethod
    def analyze(pair, candles, strategy_name, spread=None):
        if not candles or len(candles) < 20:
            return {"action": "NEUTRAL", "confidence": 0}

        close_prices = [c["close"] for c in candles]
        canonical_name = STRATEGY_ALIASES.get(strategy_name, strategy_name)
        cfg = PAIR_PROFILE.get(pair, PAIR_PROFILE["default"])
        market_type = detect_market_type(pair)
        is_real_pair = market_type == "REAL"

        if canonical_name in OTC_ONLY and market_type != "OTC":
            return {"action": "NEUTRAL", "confidence": 0}

        if canonical_name in REAL_ONLY and market_type != "REAL":
            return {"action": "NEUTRAL", "confidence": 0}

        if is_real_pair:
            atr_series_filters = calculate_atr_series(candles, 14)
            current_atr_f = atr_series_filters.iloc[CONFIRM]
            atr_ma_50_f = atr_series_filters.rolling(window=50).mean().iloc[CONFIRM]

            if pd.isna(atr_ma_50_f) or atr_ma_50_f <= 0:
                return {"action": "NEUTRAL", "confidence": 0}

            if spread is not None and current_atr_f > 0:
                if cfg.get("enable_spread_filter", True):
                    spread_scale = cfg.get(
                        "spread_scale",
                        PAIR_PROFILE["default"].get("spread_scale", 1.0),
                    )
                    max_factor = cfg.get(
                        "max_spread_atr_factor",
                        PAIR_PROFILE["default"].get("max_spread_atr_factor", 0.25),
                    )
                    effective_spread = spread * spread_scale
                    if effective_spread > current_atr_f * max_factor:
                        return {"action": "NEUTRAL", "confidence": 0}

            if canonical_name not in {"London Breakout", "Real Trend Pullback"}:
                if current_atr_f < atr_ma_50_f * 0.6:
                    return {"action": "NEUTRAL", "confidence": 0}

            confirm_candle = candles[CONFIRM]
            ts = confirm_candle.get("timestamp")
            if ts is None:
                return {"action": "NEUTRAL", "confidence": 0}
            session = get_session(ts)
            if session == "OFF_SESSION" and canonical_name not in REVERSAL_STRATEGIES:
                return {"action": "NEUTRAL", "confidence": 0}

        # ---------------------------------------------------------------------
        # STRATEGY: Test Execution Strategy
        # ---------------------------------------------------------------------
        if canonical_name == "Test Execution Strategy":
            action, confidence = analyze_test_execution(candles)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)
        
        # ---------------------------------------------------------------------
        # STRATEGY: OTC Mean Reversion
        # ---------------------------------------------------------------------
        if canonical_name == "OTC Mean Reversion":
            action, confidence = analyze_otc_mean_reversion(candles, cfg)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)

        # ---------------------------------------------------------------------
        # STRATEGY: OTC Volatility Trap Break–Reclaim
        # ---------------------------------------------------------------------
        if canonical_name == "OTC Volatility Trap Break–Reclaim":
            action, confidence = analyze_otc_volatility_trap(candles)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)
        
        # ---------------------------------------------------------------------
        # STRATEGY: OTC Trend-Pullback Engine Strategy
        # ---------------------------------------------------------------------
        if canonical_name == "OTC Trend-Pullback Engine Strategy":
            action, confidence = analyze_otc_trend_pullback(candles)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)

        # ---------------------------------------------------------------------
        # STRATEGY: Real Trend Pullback
        # ---------------------------------------------------------------------
        if canonical_name == "Real Trend Pullback":
            action, confidence = analyze_real_trend_pullback(candles, cfg)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)

        # ---------------------------------------------------------------------
        # STRATEGY: London Breakout
        # ---------------------------------------------------------------------
        if canonical_name == "London Breakout":
            action, confidence = analyze_london_breakout(candles, cfg)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)

        # ---------------------------------------------------------------------
        # STRATEGY: NY Reversal
        # ---------------------------------------------------------------------
        if canonical_name == "NY Reversal":
            action, confidence = analyze_ny_reversal(candles, cfg)
            result = {"action": action, "confidence": confidence}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)

        # ---------------------------------------------------------------------
        # STRATEGY: Quick 2M Strategy
        # ---------------------------------------------------------------------
        if canonical_name == "Quick 2M Strategy":
            action, confidence, reason = analyze_quick_2m(candles)
            result = {"action": action, "confidence": confidence, "reason": reason}
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)

        # ---------------------------------------------------------------------
        # STRATEGY: RSI + Support & Resistance Reversal (M1 Binary)
        # ---------------------------------------------------------------------
        target_strategy = "RSI + Support & Resistance Reversal"
        
        if canonical_name == target_strategy:
             
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
                 # Strict trend filter: if it was overbought for a while, maybe don't fade it?
                 # But strategy says "Market shows loss of bullish momentum".
                 # If we have the candle confirmation, we can ignore this, or reduce confidence.
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
            result = StrategyService._apply_real_trend_filter(
                pair, canonical_name, result, close_prices
            )
            return StrategyService._apply_cooldown(pair, canonical_name, result)
        
        return {"action": "NEUTRAL", "confidence": 0}

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

    @staticmethod
    def _apply_real_trend_filter(pair, strategy_name, result, close_prices):
        market_type = detect_market_type(pair)
        if market_type != "REAL":
            return result

        action = result.get("action")
        if action not in ["CALL", "PUT"]:
            return result

        if strategy_name in REVERSAL_STRATEGIES:
            return result

        if not close_prices or len(close_prices) < 200:
            return {"action": "NEUTRAL", "confidence": 0}

        closes_series = pd.Series(close_prices)
        ema50_series = closes_series.ewm(span=50, adjust=False).mean()
        ema200_series = closes_series.ewm(span=200, adjust=False).mean()
        ema50 = ema50_series.iloc[CONFIRM]
        ema200 = ema200_series.iloc[CONFIRM]

        trend_up = ema50 > ema200
        trend_down = ema50 < ema200

        if action == "CALL" and trend_down:
            return {"action": "NEUTRAL", "confidence": 0}
        if action == "PUT" and trend_up:
            return {"action": "NEUTRAL", "confidence": 0}

        return result
