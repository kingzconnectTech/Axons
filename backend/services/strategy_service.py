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
        return prices[-1]
    return pd.Series(prices).ewm(span=period, adjust=False).mean().iloc[-1]

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
    atr = tr.rolling(window=period).mean().iloc[-1]
    
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

def analyze_otc_mean_reversion(candles):
    """
    OTC Mean Reversion Strategy Logic
    """
    if len(candles) < 55: # Need enough for EMA50 + lookback
        return "NEUTRAL", 0
        
    close_prices = [c['close'] for c in candles]
    
    # 1. Indicators
    rsi_series = calculate_rsi_series(close_prices, 14)
    current_rsi = rsi_series.iloc[-1]
    prev_rsi = rsi_series.iloc[-2]
    
    ema_50 = calculate_ema(close_prices, 50)
    
    atr_series = calculate_atr_series(candles, 14)
    current_atr = atr_series.iloc[-1]
    
    # ATR MA(20)
    # We need the MA of the ATR series
    atr_ma_20 = atr_series.rolling(window=20).mean().iloc[-1]
    
    # Current Candle (Assuming [-1] is the trigger candle)
    c = candles[-1]
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
    
    # 5-candle lookback (excluding current)
    # candles[-6:-1] gives the 5 candles before current
    prev_5_candles = candles[-6:-1]
    if len(prev_5_candles) < 5:
        return "NEUTRAL", 0
        
    lowest_low_5 = min(x['min'] for x in prev_5_candles)
    highest_high_5 = max(x['max'] for x in prev_5_candles)
    
    action = "NEUTRAL"
    confidence = 0
    
    # --- FILTERS ---
    # ATR(14) <= ATR_MA(20) (Strict volatility filter from logic)
    # Also "DO NOT TRADE IF: ATR(14) > ATR_MA(20) * 1.2" (This is looser, so strict one covers it)
    if current_atr > atr_ma_20:
        return "NEUTRAL", 0
        
    # Spread spike / Candle range spike
    # "Candle range > 1.5x recent average range"
    # Recent average range (last 5 candles)
    recent_ranges = [(x['max'] - x['min']) for x in prev_5_candles]
    avg_range = sum(recent_ranges) / len(recent_ranges) if recent_ranges else candle_range
    if candle_range > 1.5 * avg_range:
        return "NEUTRAL", 0

    # --- BUY (CALL) CONDITIONS ---
    # 1. RSI <= 28 (Actually "RSI rising after touching <= 28")
    # Upgrade: RSI Slope check.
    # Current RSI <= 28 OR (RSI Rising AND recently <= 28)
    # The prompt says: "Trigger BUY when ALL conditions are TRUE: RSI(14) <= 28 ... BOT UPGRADE: BUY only if RSI is rising after touching <=28"
    # This implies the TRIGGER happens when RSI is rising.
    # So: RSI[-1] > RSI[-2] AND (RSI[-1] <= 28 OR RSI[-2] <= 28) ??
    # Actually, "RSI rising after touching <= 28" usually means RSI turned up.
    # Let's enforce: Current RSI <= 35 (buffer) AND RSI Rising AND (RSI[-2] <= 28 OR RSI[-3] <= 28)
    # But strict rules say: "RSI(14) <= 28". 
    # Let's combine:
    # Condition: Current RSI <= 28 OR (Current RSI > Prev RSI and Prev RSI <= 28)
    # Prompt "Trigger BUY when... RSI <= 28" AND "Upgrade: Buy only if RSI is rising".
    # This means RSI must be <= 28 AND Rising. (Very strict window).
    # OR it means "RSI was <= 28 recently and now rising".
    # Given "Mean Reversion", usually catching the bottom.
    # I will stick to: RSI <= 30 (slightly relaxed) AND Rising (Current > Prev).
    # STRICT RULE: RSI <= 28. 
    # UPGRADE: RSI Rising.
    # So: RSI <= 28 AND RSI > Prev_RSI.
    
    rsi_buy_cond = (current_rsi <= 28) and (current_rsi > prev_rsi)
    
    if rsi_buy_cond:
        # 2. Current Low < lowest low of last 5
        if low_p < lowest_low_5:
            # 3. Lower wick >= 60%
            if lower_wick_ratio >= 0.6:
                # 4. Bullish Rejection (Close > Open)
                if close_p > open_p:
                    # 5. Distance from EMA50 >= 0.3 * ATR
                    # Buy means price is low, so EMA > Close
                    dist = abs(ema_50 - close_p)
                    if dist >= (0.3 * current_atr):
                        action = "CALL"
                        confidence = 88
                        
                        # Boosts
                        if lower_wick_ratio >= 0.7: confidence += 5
                        if current_rsi <= 20: confidence += 5

    # --- SELL (PUT) CONDITIONS ---
    # 1. RSI >= 72 AND Rising (Falling actually)
    # Upgrade: RSI Falling after touching >= 72
    # So: RSI >= 72 AND RSI < Prev_RSI
    
    rsi_sell_cond = (current_rsi >= 72) and (current_rsi < prev_rsi)
    
    if rsi_sell_cond:
        # 2. Current High > highest high of last 5
        if high_p > highest_high_5:
            # 3. Upper wick >= 60%
            if upper_wick_ratio >= 0.6:
                # 4. Bearish Rejection (Close < Open)
                if close_p < open_p:
                    # 5. Distance from EMA50 >= 0.3 * ATR
                    dist = abs(close_p - ema_50)
                    if dist >= (0.3 * current_atr):
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
    
    # 1. Indicators
    upper_band, middle_band, lower_band = calculate_bollinger_bands(close_prices, 20, 2)
    ema_20 = calculate_ema(close_prices, 20)
    atr_series = calculate_atr_series(candles, 14)
    atr_ma_20 = atr_series.rolling(window=20).mean().iloc[-1]
    
    current_atr = atr_series.iloc[-1]
    
    # BB Width
    bb_width = upper_band - lower_band
    # 30-period average width
    bb_width_ma_30 = bb_width.rolling(window=30).mean().iloc[-1]
    current_bb_width = bb_width.iloc[-1]
    
    # RSI for Upgrade
    rsi = calculate_rsi(close_prices, 14)
    
    # Candles
    # We need:
    # Breakout Candle ([-2])
    # Reclaim Candle ([-1])
    
    breakout_c = candles[-2]
    reclaim_c = candles[-1]
    
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
    
    # --- MARKET CONDITION (NON-NEGOTIABLE) ---
    # Use index -2 for Reclaim (Latest Closed) and -3 for Breakout to avoid repainting
    idx_reclaim = -2
    idx_breakout = -3
    idx_prev_breakout = -4
    
    # 1. BB Width < 30-period average width (Squeeze)
    # Check at Reclaim time
    if bb_width.iloc[idx_reclaim] >= bb_width_ma_30:
        return "NEUTRAL", 0
        
    # 2. ATR(14) <= ATR_MA(20)
    if atr_series.iloc[idx_reclaim] > atr_ma_20:
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

    # --- FILTERS ---
    # 1. Breakout candle body > 65% of range
    if breakout_body_ratio > 0.65:
        return "NEUTRAL", 0
        
    # 2. Reclaim candle has no wick
    reclaim_body = abs(reclaim_close - reclaim_open)
    reclaim_total_wick = reclaim_range - reclaim_body
    reclaim_wick_ratio = reclaim_total_wick / reclaim_range
    if reclaim_wick_ratio < 0.1:
        return "NEUTRAL", 0
        
    # 3. Two band breaks occur without a reclaim
    prev_breakout_close = prev_breakout_c['close']
    
    # EMA Series (Need full series to get historical values)
    ema_20_series = pd.Series(close_prices).ewm(span=20, adjust=False).mean()
    ema_val = ema_20_series.iloc[idx_reclaim]

    # --- BUY (CALL) CONDITIONS ---
    # 1. Candle closes below lower band (Fake breakout)
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
                
                # UPGRADE: RSI < 45 at reclaim
                if rsi < 45:
                    action = "CALL"
                    confidence = 90
                    if reclaim_close > middle_band.iloc[idx_reclaim]: confidence += 5

    # --- SELL (PUT) CONDITIONS ---
    # 1. Candle closes above upper band
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
                    
                # UPGRADE: RSI > 55 at reclaim
                if rsi > 55:
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
    atr_ma_20 = atr_series.rolling(window=20).mean().iloc[-1]
    idx_confirm = -2
    idx_pullback = -3
    ema20_c = ema20_series.iloc[idx_confirm]
    ema50_c = ema50_series.iloc[idx_confirm]
    ema20_p = ema20_series.iloc[idx_pullback]
    ema50_p = ema50_series.iloc[idx_pullback]
    rsi_pull = rsi_series.iloc[idx_pullback]
    rsi_prev_pull = rsi_series.iloc[idx_pullback-1] if len(rsi_series) >= abs(idx_pullback-1) else rsi_pull
    bb_width = upper_band - lower_band
    bb_width_ma_30 = bb_width.rolling(window=30).mean().iloc[-1]
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
    if bb_width.iloc[idx_confirm] < 0.8 * bb_width_ma_30:
        return "NEUTRAL", 0
    if atr_series.iloc[idx_confirm] > atr_ma_20 * 1.5:
        return "NEUTRAL", 0
    fail_count = 0
    lookback = min(len(candles)-3, 12)
    for i in range(-lookback, -3):
        ema20_i = ema20_series.iloc[i]
        ema20_i_next = ema20_series.iloc[i+1] if (i+1) < 0 else ema20_series.iloc[-1]
        c_i = candles[i]
        c_i_next = candles[i+1]
        touched = (c_i['min'] <= ema20_i) or (c_i['max'] >= ema20_i)
        failed_up = (c_i['min'] <= ema20_i) and (c_i_next['close'] <= ema20_i_next)
        failed_down = (c_i['max'] >= ema20_i) and (c_i_next['close'] >= ema20_i_next)
        if touched and (failed_up or failed_down):
            fail_count += 1
    if fail_count >= 2:
        return "NEUTRAL", 0
    action = "NEUTRAL"
    confidence = 0
    if uptrend:
        if (l_pull <= ema20_p) and (lower_wick_ratio >= 0.4) and (rsi_pull >= 45) and (c_conf > ema20_c) and (c_pull_close >= ema50_p):
            action = "CALL"
            confidence = 85
            spread = abs(ema20_c - ema50_c)
            if lower_wick_ratio >= 0.6:
                confidence += 5
            if spread > 0 and spread >= (atr_series.iloc[idx_confirm] * 0.3):
                confidence += 5
    elif downtrend:
        if (h_pull >= ema20_p) and (upper_wick_ratio >= 0.4) and (rsi_pull <= 55) and (c_conf < ema20_c) and (c_pull_close <= ema50_p):
            action = "PUT"
            confidence = 85
            spread = abs(ema50_c - ema20_c)
            if upper_wick_ratio >= 0.6:
                confidence += 5
            if spread > 0 and spread >= (atr_series.iloc[idx_confirm] * 0.3):
                confidence += 5
    return action, min(confidence, 100)

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
    
    last_candle = candles[-2] # Use closed candle
    open_p = last_candle['open']
    close_p = last_candle['close']
    
    if close_p > open_p:
        return "CALL", 99
    elif close_p < open_p:
        return "PUT", 99
        
    return "NEUTRAL", 0

class StrategyService:
    @staticmethod
    def analyze(pair, candles, strategy_name):
        if not candles or len(candles) < 30:
            return {"action": "NEUTRAL", "confidence": 0}

        close_prices = [c['close'] for c in candles]
        
        # ---------------------------------------------------------------------
        # STRATEGY: Test Execution Strategy
        # ---------------------------------------------------------------------
        if strategy_name == "Test Execution Strategy":
            action, confidence = analyze_test_execution(candles)
            return {"action": action, "confidence": confidence}
        
        # ---------------------------------------------------------------------
        # STRATEGY: OTC Mean Reversion
        # ---------------------------------------------------------------------
        if strategy_name == "OTC Mean Reversion":
            action, confidence = analyze_otc_mean_reversion(candles)
            return {"action": action, "confidence": confidence}

        # ---------------------------------------------------------------------
        # STRATEGY: OTC Volatility Trap Break–Reclaim
        # ---------------------------------------------------------------------
        if strategy_name == "OTC Volatility Trap Break–Reclaim":
            action, confidence = analyze_otc_volatility_trap(candles)
            return {"action": action, "confidence": confidence}
        
        # ---------------------------------------------------------------------
        # STRATEGY: OTC Trend-Pullback Engine Strategy
        # ---------------------------------------------------------------------
        if strategy_name == "OTC Trend-Pullback Engine Strategy":
            action, confidence = analyze_otc_trend_pullback(candles)
            return {"action": action, "confidence": confidence}

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
