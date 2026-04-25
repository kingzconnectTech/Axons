import time
import traceback
import random
from services.strategy_service import StrategyService, resample_to_n_minutes

# IQ Option minimum trade amounts per currency (in native currency units)
MIN_TRADE_AMOUNTS = {
    "USD": 1.0,
    "EUR": 1.0,
    "GBP": 1.0,
    "BRL": 5.0,
    "IDR": 10000.0,
    "MXN": 20.0,
    "TRY": 25.0,
    "INR": 70.0,
    "NGN": 500.0,
    "ZAR": 10.0,
    "AED": 5.0,
    "SGD": 2.0,
    "MYR": 5.0,
    "PHP": 50.0,
    "THB": 35.0,
    "VND": 25000.0,
    "COP": 4000.0,
    "PEN": 5.0,
    "CLP": 700.0,
    "ARS": 100.0,
}

def get_min_amount(currency: str) -> float:
    """Return the minimum trade amount for a given currency code."""
    return MIN_TRADE_AMOUNTS.get(currency.upper() if currency else "USD", 1.0)


def _worker_log(email, msg):
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        log_file = os.path.join(base_dir, "worker_debug.log")
        with open(log_file, "a") as f:
            f.write(f"[{email}] {time.ctime()} {msg}\n")
    except:
        pass


def _wait_for_result(iq, trade_id, email, stake_amount, stop_event):
    """
    Robust polling for binary option result.
    Checks multiple API endpoints for the trade status.
    """
    _worker_log(email, f"Waiting for result of trade {trade_id} (Stake: {stake_amount})...")
    start_wait = time.time()
    
    # Poll for up to 3 minutes
    while time.time() - start_wait < 180:
        if stop_event.is_set():
            return None
        
        try:
            # Method 1: get_binary_option_detail
            details = iq.get_binary_option_detail(trade_id)
            if details and details.get("result"):
                res = details.get("result")
                win_status = res.get("win")
                if win_status in ["win", "loose", "equal"]:
                    _worker_log(email, f"Result found via detail: {win_status}")
                    return res
            
            # Method 2: get_optioninfo_v2 (check last 10 trades)
            history = iq.get_optioninfo_v2(10)
            if history and history.get("items"):
                for item in history["items"]:
                    if str(item.get("id")) == str(trade_id):
                        # history entry usually has 'win' or 'result'
                        # but structure varies between versions
                        win = item.get("win")
                        if win in ["win", "loose", "equal"]:
                            _worker_log(email, f"Result found via history: {win}")
                            # Normalize history item to match expected res structure
                            return {"win": win, "profit": item.get("profit_amount", 0)}
                            
        except Exception as e:
            _worker_log(email, f"Error in result polling: {e}")
            
        time.sleep(5)
    
    _worker_log(email, f"Timeout waiting for trade {trade_id}")
    return None




def _get_iq_class():
    """
    Import IQ_Option directly — bypassing the shared IQSessionManager
    singleton so this worker is 100% isolated from the market-data
    account configured via environment variables.
    """
    from iqoptionapi.stable_api import IQ_Option
    return IQ_Option

def run_trade_session(config, shared_stats, stop_event):
    """
    Worker function to run in a separate thread.
    Always logs in with config.email / config.password (the user's own
    IQ Option account entered in the app), NEVER the shared env credentials.
    """
    # Strip whitespace to avoid login failures from copy-paste errors
    email = config.email.strip()
    password = config.password.strip()
    
    try:
        print(f"[Worker: {email}] Starting trade session with strategy: {config.strategy}")

        IQ_Option = _get_iq_class()
        iq = IQ_Option(email, password)
        
        print(f"[Worker: {email}] Attempting to connect to IQ Option...")
        check, reason = iq.connect()
        
        if not check:
            print(f"[Worker: {email}] Connection failed. Reason: {reason}")
            # Translate the raw API reason into a human-readable message
            reason_str = str(reason).lower() if reason else ""
            if "wrongcredentials" in reason_str or "wrong" in reason_str or "invalid" in reason_str:
                user_message = "Wrong email or password. Please check your IQ Option credentials."
            elif "network" in reason_str or "connection" in reason_str or "timeout" in reason_str:
                user_message = "Connection failed. Check your internet connection and try again."
            else:
                user_message = f"Login failed: {reason}. Check your credentials and try again."
            shared_stats["error"] = user_message
            shared_stats["active"] = False
            stop_event.set()
            return # Don't raise, just exit cleanly after setting state
        
        print(f"[Worker: {email}] Login successful. Switching to {config.account_type} account...")
        iq.change_balance(config.account_type.upper())
        time.sleep(3)  # Wait longer for account switch and WebSocket sync
        
        # Get Currency & Balance
        try:
            currency = iq.get_currency()
            shared_stats["currency"] = currency
            min_amount = get_min_amount(currency)
            shared_stats["min_amount"] = min_amount
            
            balance = iq.get_balance()
            if balance is None:
                print(f"[Worker: {email}] Initial balance is None, retrying after 3s...")
                time.sleep(3)
                balance = iq.get_balance()
            
            shared_stats["balance"] = float(balance) if balance is not None else 0.0
            print(f"[Worker: {email}] Connection verified. Currency: {currency} | Balance: {balance}")
        except Exception as e:
            print(f"[Worker: {email}] Connected, but failed to load account profile: {e}")

        last_scan_time = 0
        while not stop_event.is_set():
            try:
                # 1. Connection Maintenance
                if not iq.check_connect():
                    print(f"[Worker: {email}] Connection lost. Reconnecting...")
                    check, reason = iq.connect()
                    if not check:
                        print(f"[Worker: {email}] Reconnection failed. Skipping this loop.")
                        time.sleep(5)
                        continue
                # Update shared stats (including balance)
                try:
                    current_balance = iq.get_balance()
                    if current_balance is not None:
                        shared_stats["balance"] = float(current_balance)
                except Exception:
                    pass

                if shared_stats["consecutive_losses"] >= config.max_consecutive_losses:
                    print(f"[Worker: {email}] Max consecutive losses reached. Stopping.")
                    break
                
                if int(shared_stats["total_trades"]) >= config.max_trades:
                    print(f"[Worker: {email}] Max trades reached. Stopping.")
                    break

                # Scan pairs
                best_opportunity = {"pair": None, "action": "NEUTRAL", "confidence": 0, "timeframe": 0}
                
                # Support multiple pairs
                pairs_to_scan = config.pairs if hasattr(config, 'pairs') and config.pairs else ["EURUSD-OTC"]
                
                # Randomize order to prevent bias towards the first pair
                random.shuffle(pairs_to_scan)
                print(f"[Worker: {email}] Scanning {len(pairs_to_scan)} pairs for signals (Strategy: {config.strategy})")
                
                for pair in pairs_to_scan:
                    if stop_event.is_set():
                        break
                    
                    # Log which pair we are scanning
                    print(f"[Worker: {email}] Analyzing {pair}...")
                    
                    try:
                        target_timeframe = config.timeframe
                        
                        analysis = {"action": "NEUTRAL", "confidence": 0}
                        selected_tf = target_timeframe

                        if target_timeframe == 0:
                            # Auto-Timeframe: Scan 1m, 2m, 3m, 4m, 5m
                            candidate_tfs = [1, 2, 3, 4, 5]
                            best_analysis = {"action": "NEUTRAL", "confidence": 0}
                            best_tf = 1
                            
                            for tf in candidate_tfs:
                                if stop_event.is_set():
                                    break
                                
                                # Use server time if available, fallback to local
                                try:
                                    server_time = iq.get_server_time()
                                except:
                                    server_time = int(time.time())

                                supported_tfs = {1, 2, 5, 15, 60}
                                if tf in supported_tfs:
                                    candles = iq.get_candles(pair, int(tf * 60), 100, server_time)
                                    if not candles or len(candles) < 50:
                                        continue
                                    analysis = StrategyService.analyze(pair, candles, config.strategy)
                                else:
                                    m1_candles = iq.get_candles(pair, 60, max(180, int(tf) * 80), server_time)
                                    if not m1_candles or len(m1_candles) < 50:
                                        continue
                                    mN_candles = resample_to_n_minutes(m1_candles, int(tf))
                                    analysis = StrategyService.analyze(pair, mN_candles, config.strategy)
                                
                                if analysis["action"] in ["CALL", "PUT"] and analysis["confidence"] > best_analysis["confidence"]:
                                    best_analysis = analysis
                                    best_tf = tf
                            
                            analysis = best_analysis
                            selected_tf = best_tf
                        else:
                            # Use server time if available, fallback to local
                            try:
                                server_time = iq.get_server_time()
                            except:
                                server_time = int(time.time())

                            supported_tfs = {1, 2, 5, 15, 60}
                            if target_timeframe in supported_tfs:
                                candles = iq.get_candles(pair, int(target_timeframe * 60), 100, server_time)
                                if not candles or len(candles) < 50:
                                    continue
                                analysis = StrategyService.analyze(pair, candles, config.strategy)
                            else:
                                m1_candles = iq.get_candles(pair, 60, max(180, int(target_timeframe) * 80), server_time)
                                if not m1_candles or len(m1_candles) < 50:
                                    continue
                                mN_candles = resample_to_n_minutes(m1_candles, int(target_timeframe))
                                analysis = StrategyService.analyze(pair, mN_candles, config.strategy)
                        
                        # Compare with best across pairs
                        if analysis["action"] in ["CALL", "PUT"] and analysis["confidence"] > best_opportunity["confidence"]:
                            best_opportunity = {
                                "pair": pair,
                                "action": analysis["action"],
                                "confidence": analysis["confidence"],
                                "timeframe": selected_tf
                            }
                            
                            # OPTIMIZATION: Early Exit on High Confidence
                            if analysis["confidence"] >= 90:
                                break
                                
                    except Exception as loop_e:
                        continue

                # Execute Trade
                if not stop_event.is_set() and best_opportunity["action"] in ["CALL", "PUT"] and best_opportunity["confidence"] > 70:
                    pair = best_opportunity["pair"]
                    action = best_opportunity["action"]
                    timeframe = best_opportunity["timeframe"]
                    confidence = best_opportunity["confidence"]

                    stake_amount = config.amount
                    # Enforce minimum trade amount for this currency
                    min_amt = shared_stats.get("min_amount") or get_min_amount(shared_stats.get("currency", "USD"))
                    if stake_amount < min_amt:
                        print(f"[Worker: {email}] Amount {stake_amount} is below minimum {min_amt}. Using minimum.")
                        stake_amount = min_amt
                    trade_duration = int(timeframe) if timeframe >= 1 else timeframe
                    
                    print(f"[Worker: {email}] Signal Found: {pair} {action} ({confidence}%). Executing Trade...")
                    
                    # Capture balance before trade for fallback verification
                    balance_before = iq.get_balance()
                    if balance_before is None:
                        # Try one more time
                        time.sleep(1)
                        balance_before = iq.get_balance() or 0.0

                    check, id = iq.buy(stake_amount, pair, action, trade_duration)
                    if check:
                        print(f"[Worker: {email}] Trade placed: {action} (ID: {id})")
                        shared_stats["total_trades"] = int(shared_stats["total_trades"]) + 1
                        
                        # Wait for expiry
                        sleep_seconds = int(timeframe * 60 + 5)
                        print(f"[Worker: {email}] Waiting {sleep_seconds}s for expiry...")
                        for _ in range(sleep_seconds):
                            if stop_event.is_set(): break
                            time.sleep(1)
                            shared_stats["heartbeat"] = time.time() # Keep heartbeat alive during long wait
                        
                        # Check Result
                        try:
                            result = _wait_for_result(iq, id, email, stake_amount, stop_event)
                            
                            if result:
                                win_status = result.get("win")
                                if win_status == "win":
                                    profit_val = float(result.get("profit", 0) or 0)
                                    # Net profit = total payout - stake
                                    net_profit = profit_val - float(stake_amount) if profit_val > float(stake_amount) else profit_val
                                    
                                    print(f"[Worker: {email}] Trade WON: +{net_profit}")
                                    _worker_log(email, f"WON! Net: {net_profit}")
                                    shared_stats["wins"] = int(shared_stats.get("wins", 0)) + 1
                                    shared_stats["profit"] = float(shared_stats.get("profit", 0.0)) + net_profit
                                    shared_stats["consecutive_losses"] = 0
                                elif win_status == "loose":
                                    loss_amount = float(stake_amount)
                                    print(f"[Worker: {email}] Trade LOST: -{loss_amount}")
                                    _worker_log(email, f"LOST! -{loss_amount}")
                                    shared_stats["losses"] = int(shared_stats.get("losses", 0)) + 1
                                    shared_stats["profit"] = float(shared_stats.get("profit", 0.0)) - loss_amount
                                    shared_stats["consecutive_losses"] = int(shared_stats.get("consecutive_losses", 0)) + 1
                                elif win_status == "equal":
                                    print(f"[Worker: {email}] Trade TIE (Equal).")
                                    _worker_log(email, "TIE")
                                    shared_stats["consecutive_losses"] = 0
                            else:
                                print(f"[Worker: {email}] Could not determine trade result for {id} after polling. Using balance fallback...")
                                _worker_log(email, "Result polling failed. Checking balance fallback...")
                                
                                # Fallback: Check balance difference
                                try:
                                    balance_after = iq.get_balance()
                                    if balance_after is not None:
                                        # If balance_after > balance_before, we likely won
                                        # Note: balance_after includes the return amount (stake + profit)
                                        if balance_after > (balance_before + 0.001): # Add small epsilon
                                            net_profit = balance_after - balance_before
                                            print(f"[Worker: {email}] Fallback: Trade WON identified by balance increase (+{net_profit})")
                                            _worker_log(email, f"Fallback WON! Net: {net_profit}")
                                            shared_stats["wins"] = int(shared_stats.get("wins", 0)) + 1
                                            shared_stats["profit"] = float(shared_stats.get("profit", 0.0)) + net_profit
                                            shared_stats["consecutive_losses"] = 0
                                        else:
                                            # If balance didn't increase, it's either a loss or a tie
                                            # In most iqoption binary cases, balance-before - stake = balance-after on loss.
                                            loss_amount = float(stake_amount)
                                            print(f"[Worker: {email}] Fallback: Trade likely LOST/TIE identified by no balance increase.")
                                            _worker_log(email, "Fallback LOST/TIE")
                                            shared_stats["losses"] = int(shared_stats.get("losses", 0)) + 1
                                            shared_stats["profit"] = float(shared_stats.get("profit", 0.0)) - loss_amount
                                            shared_stats["consecutive_losses"] = int(shared_stats.get("consecutive_losses", 0)) + 1
                                except Exception as fallback_e:
                                    _worker_log(email, f"Fallback check failed: {fallback_e}")
                            
                            # Update stats one more time explicitly to ensure propagation
                            shared_stats["heartbeat"] = time.time()
                            
                            # Cooldown
                            print(f"[Worker: {email}] Resting for 10 seconds...")
                            for _ in range(10):
                                if stop_event.is_set(): break
                                time.sleep(1)
                                shared_stats["heartbeat"] = time.time()
                                
                            # Refresh balance
                            current_balance = iq.get_balance()
                            if current_balance is not None:
                                shared_stats["balance"] = float(current_balance)
                            
                        except Exception as e:
                            print(f"[Worker: {email}] Error processing trade result: {e}")
                    else:
                        print(f"[Worker: {email}] Trade execution failed: {id}")
                
                # Heartbeat for monitor
                shared_stats["heartbeat"] = time.time()
                time.sleep(1)
            except Exception as outer_e:
                print(f"[Worker: {email}] Critical error in loop: {outer_e}")
                traceback.print_exc()
                time.sleep(5)
            
            # Heartbeat for monitor
            shared_stats["heartbeat"] = time.time()
            time.sleep(1)

    except Exception as e:
        print(f"[Worker: {email}] Session error: {e}")
        # traceback.print_exc()
        try:
            shared_stats["error"] = str(e)
            shared_stats["active"] = False
        except:
            pass
        stop_event.set()
    finally:
        try:
            shared_stats["active"] = False
        except:
            pass
        print(f"[Worker: {email}] Session ended.")
