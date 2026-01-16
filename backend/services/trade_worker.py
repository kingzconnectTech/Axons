import time
import traceback
import random
from iqoptionapi.stable_api import IQ_Option
from services.strategy_service import StrategyService, resample_to_n_minutes

def run_trade_session(config, shared_stats, stop_event):
    """
    Worker function to run in a separate process.
    """
    try:
        print(f"[Worker] Starting trade session for {config.email}")
        
        # Direct connection to ensure process isolation (Bypassing IQSessionManager Singleton)
        print(f"[Worker] Connecting to IQ Option for {config.email}...")
        iq = IQ_Option(config.email, config.password)
        check, reason = iq.connect()
        if not check:
             raise Exception(f"Failed to connect: {reason}")
        
        iq.change_balance(config.account_type)
        
        # Get Currency
        try:
            currency = iq.get_currency()
            shared_stats["currency"] = currency
            print(f"[Worker] Currency for {config.email}: {currency}")
        except Exception as e:
            print(f"[Worker] Failed to get currency: {e}")

        print(f"[Worker] Connected successfully for {config.email}")
        
        while not stop_event.is_set():
            # 1. Connection Maintenance
            if not iq.check_connect():
                print(f"[Worker] Connection lost for {config.email}. Reconnecting...")
                check, reason = iq.connect()
                if check:
                    print(f"[Worker] Reconnected successfully.")
                    iq.change_balance(config.account_type) # Ensure correct balance type
                else:
                    print(f"[Worker] Reconnection failed: {reason}")
                    time.sleep(5)
                    continue

            # Update shared stats (including balance)
            try:
                current_balance = iq.get_balance()
                shared_stats["balance"] = current_balance
            except Exception:
                pass

            if shared_stats["consecutive_losses"] >= config.max_consecutive_losses:
                print(f"[Worker] Max consecutive losses reached for {config.email}. Stopping.")
                break
            
            if shared_stats["total_trades"] >= config.max_trades:
                print(f"[Worker] Max trades reached for {config.email}. Stopping.")
                break

            # Scan pairs
            best_opportunity = {"pair": None, "action": "NEUTRAL", "confidence": 0, "timeframe": 0}
            
            # Support multiple pairs
            pairs_to_scan = config.pairs if hasattr(config, 'pairs') and config.pairs else ["EURUSD-OTC"]
            
            # Randomize order to prevent bias towards the first pair (especially with early exit)
            random.shuffle(pairs_to_scan)
            
            # Debug: Print scanning info
            print(f"[Worker] Scanning {len(pairs_to_scan)} pairs: {pairs_to_scan} | Strategy: {config.strategy}")

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
                                    print(f"[Worker] No candles for {pair} {tf}m")
                                    continue
                                curr_analysis = StrategyService.analyze(pair, candles, config.strategy)
                            else:
                                m1_count = max(180, int(tf) * 80)
                                m1_candles = iq.get_candles(pair, 60, m1_count, time.time())
                                if not m1_candles:
                                    print(f"[Worker] No M1 candles for {pair} to resample {tf}m (auto)")
                                    continue
                                mN_candles = resample_to_n_minutes(m1_candles, int(tf))
                                if not mN_candles or len(mN_candles) < 30:
                                    print(f"[Worker] Not enough resampled candles for {pair} {tf}m (auto)")
                                    continue
                                curr_analysis = StrategyService.analyze(pair, mN_candles, config.strategy)
                            
                            if curr_analysis["action"] in ["CALL", "PUT"] and curr_analysis["confidence"] > best_analysis["confidence"]:
                                best_analysis = curr_analysis
                                best_tf = tf
                        
                        analysis = best_analysis
                        selected_tf = best_tf
                    else:
                        supported_tfs = {1, 2, 5, 15, 60}
                        if target_timeframe in supported_tfs:
                            candles = iq.get_candles(pair, int(target_timeframe * 60), 100, time.time())
                            if not candles:
                                print(f"[Worker] No candles for {pair} {target_timeframe}m")
                                continue
                            analysis = StrategyService.analyze(pair, candles, config.strategy)
                        else:
                            m1_count = max(180, int(target_timeframe) * 80)
                            m1_candles = iq.get_candles(pair, 60, m1_count, time.time())
                            if not m1_candles:
                                print(f"[Worker] No M1 candles for {pair} to resample {target_timeframe}m")
                                continue
                            mN_candles = resample_to_n_minutes(m1_candles, int(target_timeframe))
                            if not mN_candles or len(mN_candles) < 30:
                                print(f"[Worker] Not enough resampled candles for {pair} {target_timeframe}m")
                                continue
                            analysis = StrategyService.analyze(pair, mN_candles, config.strategy)
                        
                        # Debug
                        if analysis["action"] != "NEUTRAL":
                            print(f"[Worker] Analysis {pair} {target_timeframe}m: {analysis}")

                    # Compare with best across pairs
                    if analysis["action"] in ["CALL", "PUT"] and analysis["confidence"] > best_opportunity["confidence"]:
                        best_opportunity = {
                            "pair": pair,
                            "action": analysis["action"],
                            "confidence": analysis["confidence"],
                            "timeframe": selected_tf
                        }
                        
                        # OPTIMIZATION: Early Exit on High Confidence
                        # If we find a very strong signal (e.g. > 90%), take it immediately to avoid delay
                        if analysis["confidence"] >= 90:
                            print(f"[Worker] High confidence signal found on {pair}. Executing immediately.")
                            break
                            
                except Exception as loop_e:
                    print(f"[Worker] Error scanning pair {pair}: {loop_e}")
                    continue

            # Execute Trade
            if not stop_event.is_set() and best_opportunity["action"] in ["CALL", "PUT"] and best_opportunity["confidence"] > 70:
                pair = best_opportunity["pair"]
                action = best_opportunity["action"]
                timeframe = best_opportunity["timeframe"]
                
                print(f"[Worker] Executing trade: {pair} {action} {timeframe}m ({best_opportunity['confidence']}%)")
                
                check, id = iq.buy(config.amount, pair, action, timeframe)
                if check:
                    print(f"[Worker] Trade placed for {config.email}: {action} (ID: {id})")
                    
                    # Update stats
                    # shared_stats is a DictProxy, need to copy-modify-assign or use keys
                    shared_stats["total_trades"] += 1
                    
                    # Wait for expiry
                    sleep_seconds = int(timeframe * 60 + 5)
                    print(f"[Worker] Sleeping for {sleep_seconds}s (Expiry)...")
                    for _ in range(sleep_seconds):
                        if stop_event.is_set():
                            break
                        time.sleep(1)
                    
                    # Check Result
                    try:
                        print(f"[Worker] Checking result for ID: {id}...")
                        profit = iq.check_win_v3(id)
                        print(f"[Worker] Win result: {profit}")
                        
                        # Update stats
                        # shared_stats is a DictProxy. We need to copy, modify, update.
                        # Or modify keys directly? Manager dicts allow key modification.
                        
                        # We must update the proxy directly for changes to be visible
                        if profit > 0:
                            print(f"[Worker] Trade WON: +{profit}")
                            shared_stats["wins"] += 1
                            shared_stats["profit"] += profit
                            shared_stats["consecutive_losses"] = 0
                        else:
                            print(f"[Worker] Trade LOST: -{config.amount}")
                            shared_stats["losses"] += 1
                            shared_stats["profit"] -= config.amount
                            shared_stats["consecutive_losses"] += 1
                            
                        # Refresh balance
                        shared_stats["balance"] = iq.get_balance()
                        
                    except Exception as e:
                        print(f"[Worker] Error checking win: {e}")
                        traceback.print_exc()
                        
                else:
                    print(f"[Worker] Trade failed for {config.email}: ID={id}")
            # else:
            #    print(f"[Worker] No suitable opportunity found. Best: {best_opportunity['confidence']}%")
            
            time.sleep(1)

    except Exception as e:
        print(f"[Worker] Error in trade session for {config.email}: {e}")
        traceback.print_exc()
        try:
            shared_stats["active"] = False
        except Exception:
            pass
        try:
            stop_event.set()
        except Exception:
            pass
    finally:
        print(f"[Worker] Session ended for {config.email}")
