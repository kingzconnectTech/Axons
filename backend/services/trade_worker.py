import time
import traceback
import random
from services.strategy_service import StrategyService, resample_to_n_minutes

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
    email = config.email
    try:
        print(f"[Worker: {email}] Starting trade session.")

        IQ_Option = _get_iq_class()
        iq = IQ_Option(email, config.password)
        check, reason = iq.connect()
        if not check:
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
            raise Exception(user_message)
        
        iq.change_balance(config.account_type)
        
        # Get Currency & Balance
        try:
            currency = iq.get_currency()
            shared_stats["currency"] = currency
            balance = iq.get_balance()
            shared_stats["balance"] = balance
            print(f"[Worker: {email}] Connected successfully. Account Type: {config.account_type} | Balance: {balance} {currency}")
        except Exception as e:
            print(f"[Worker: {email}] Connected, but failed to load account info: {e}")

        while not stop_event.is_set():
            # 1. Connection Maintenance
            if not iq.check_connect():
                print(f"[Worker: {email}] Connection lost. Reconnecting...")
                check, reason = iq.connect()
                if check:
                    print(f"[Worker: {email}] Reconnected successfully.")
                    iq.change_balance(config.account_type) # Ensure correct balance type
                else:
                    print(f"[Worker: {email}] Reconnection failed: {reason}")
                    time.sleep(5)
                    continue

            # Update shared stats (including balance)
            try:
                current_balance = iq.get_balance()
                shared_stats["balance"] = current_balance
            except Exception:
                pass

            if shared_stats["consecutive_losses"] >= config.max_consecutive_losses:
                print(f"[Worker: {email}] Max consecutive losses reached. Stopping.")
                break
            
            if shared_stats["total_trades"] >= config.max_trades:
                print(f"[Worker: {email}] Max trades reached. Stopping.")
                break

            # Scan pairs
            best_opportunity = {"pair": None, "action": "NEUTRAL", "confidence": 0, "timeframe": 0}
            
            # Support multiple pairs
            pairs_to_scan = config.pairs if hasattr(config, 'pairs') and config.pairs else ["EURUSD-OTC"]
            
            # Randomize order to prevent bias towards the first pair
            random.shuffle(pairs_to_scan)
            
            # Debug: Print scanning info
            # print(f"[Worker: {email}] Scanning {len(pairs_to_scan)} pairs...")

            for pair in pairs_to_scan:
                if stop_event.is_set():
                    break
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
                            supported_tfs = {1, 2, 5, 15, 60}
                            if tf in supported_tfs:
                                candles = iq.get_candles(pair, int(tf * 60), 100, time.time())
                                if not candles:
                                    continue
                                analysis = StrategyService.analyze(pair, candles, config.strategy)
                            else:
                                m1_candles = iq.get_candles(pair, 60, max(180, int(tf) * 80), time.time())
                                if not m1_candles:
                                    continue
                                mN_candles = resample_to_n_minutes(m1_candles, int(tf))
                                analysis = StrategyService.analyze(pair, mN_candles, config.strategy)
                            
                            if analysis["action"] in ["CALL", "PUT"] and analysis["confidence"] > best_analysis["confidence"]:
                                best_analysis = analysis
                                best_tf = tf
                        
                        analysis = best_analysis
                        selected_tf = best_tf
                    else:
                        supported_tfs = {1, 2, 5, 15, 60}
                        if target_timeframe in supported_tfs:
                            candles = iq.get_candles(pair, int(target_timeframe * 60), 100, time.time())
                            if not candles:
                                continue
                            analysis = StrategyService.analyze(pair, candles, config.strategy)
                        else:
                            m1_candles = iq.get_candles(pair, 60, max(180, int(target_timeframe) * 80), time.time())
                            if not m1_candles:
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
                trade_duration = int(timeframe) if timeframe >= 1 else timeframe
                
                print(f"[Worker: {email}] Signal Found: {pair} {action} ({confidence}%). Executing Trade...")
                
                check, id = iq.buy(stake_amount, pair, action, trade_duration)
                if check:
                    print(f"[Worker: {email}] Trade placed: {action} (ID: {id})")
                    shared_stats["total_trades"] += 1
                    
                    # Wait for expiry
                    sleep_seconds = int(timeframe * 60 + 5)
                    for _ in range(sleep_seconds):
                        if stop_event.is_set():
                            break
                        time.sleep(1)
                    
                    # Check Result
                    try:
                        profit = iq.check_win_v3(id)
                        if profit > 0:
                            print(f"[Worker: {email}] Trade WON: +{profit}")
                            shared_stats["wins"] += 1
                            shared_stats["profit"] += profit
                            shared_stats["consecutive_losses"] = 0
                        else:
                            print(f"[Worker: {email}] Trade LOST: -{stake_amount}")
                            shared_stats["losses"] += 1
                            shared_stats["profit"] -= stake_amount
                            shared_stats["consecutive_losses"] += 1
                        
                        # Cooldown
                        print(f"[Worker: {email}] Resting for 60 seconds...")
                        for _ in range(60):
                            if stop_event.is_set():
                                break
                            time.sleep(1)
                            
                        # Refresh balance
                        shared_stats["balance"] = iq.get_balance()
                        
                    except Exception as e:
                        print(f"[Worker: {email}] Error checking result: {e}")
                else:
                    print(f"[Worker: {email}] Trade execution failed: {id}")
            
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
