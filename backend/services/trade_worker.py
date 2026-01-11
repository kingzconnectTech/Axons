import time
import traceback
from services.iq_service import IQSessionManager
from services.strategy_service import StrategyService

def run_trade_session(config, shared_stats, stop_event):
    """
    Worker function to run in a separate process.
    """
    try:
        print(f"[Worker] Starting trade session for {config.email}")
        
        # In a new process, this creates a new instance (singleton per process)
        iq_manager = IQSessionManager.get_instance()
        
        # Connect to IQ Option
        iq = iq_manager.create_user_session(config.email, config.password)
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
            pairs_to_scan = config.pairs if hasattr(config, 'pairs') and config.pairs else [config.pair]
            # Use 'getattr' for safety if config is a dict or object
            # Since config is Pydantic model passed via pickle, it acts as object
            
            for pair in pairs_to_scan:
                target_timeframe = config.timeframe
                
                analysis = {"action": "NEUTRAL", "confidence": 0}
                selected_tf = target_timeframe

                if target_timeframe == 0:
                    # Auto-Timeframe: Scan 1m, 2m, 5m
                    candidate_tfs = [1, 2, 5]
                    best_analysis = {"action": "NEUTRAL", "confidence": 0}
                    best_tf = 1
                    
                    for tf in candidate_tfs:
                        # Use user's own connection to get candles
                        # get_candles expects seconds for API? 
                        # IQSessionManager.get_candles helper does conversion.
                        # But here we use 'iq' object directly.
                        # iq.get_candles(pair, timeframe_in_seconds, count, end_time)
                        candles = iq.get_candles(pair, int(tf * 60), 100, time.time())
                        curr_analysis = StrategyService.analyze(pair, candles, config.strategy)
                        
                        if curr_analysis["action"] in ["CALL", "PUT"] and curr_analysis["confidence"] > best_analysis["confidence"]:
                            best_analysis = curr_analysis
                            best_tf = tf
                    
                    analysis = best_analysis
                    selected_tf = best_tf
                else:
                    candles = iq.get_candles(pair, int(target_timeframe * 60), 100, time.time())
                    analysis = StrategyService.analyze(pair, candles, config.strategy)
                    selected_tf = target_timeframe

                # Compare with best across pairs
                if analysis["action"] in ["CALL", "PUT"] and analysis["confidence"] > best_opportunity["confidence"]:
                    best_opportunity = {
                        "pair": pair,
                        "action": analysis["action"],
                        "confidence": analysis["confidence"],
                        "timeframe": selected_tf
                    }

            # Execute Trade
            if best_opportunity["action"] in ["CALL", "PUT"] and best_opportunity["confidence"] > 70:
                pair = best_opportunity["pair"]
                action = best_opportunity["action"]
                timeframe = best_opportunity["timeframe"]
                
                # Check for Paper Trade
                if hasattr(config, 'paper_trade') and config.paper_trade:
                    print(f"[Worker] Signal Found (Paper): {pair} {action} {timeframe}m ({best_opportunity['confidence']}%)")
                    
                    # Update shared stats with signal
                    # Use a timestamp to distinguish unique signals
                    signal_data = {
                        "pair": pair,
                        "action": action,
                        "confidence": best_opportunity["confidence"],
                        "timeframe": timeframe,
                        "timestamp": time.time()
                    }
                    
                    # Avoid spamming the same signal (simple dedup by timestamp/candle time?)
                    # Since we scan continuously, we might hit the same condition for the duration of the candle.
                    # We can check if the last signal was recent and same pair/action.
                    last_sig = shared_stats.get("last_signal")
                    is_new = True
                    if last_sig and last_sig["pair"] == pair and last_sig["action"] == action:
                         if time.time() - last_sig["timestamp"] < (timeframe * 60):
                             is_new = False
                    
                    if is_new:
                        shared_stats["last_signal"] = signal_data
                        # Increment 'total_trades' to show activity? 
                        # Maybe separate 'signals_found'? For now reuse total_trades for "Events"
                        shared_stats["total_trades"] += 1
                        
                        # Wait a bit to avoid re-triggering instantly
                        # Wait for half the timeframe?
                        time.sleep(10) 
                    
                else:
                    print(f"[Worker] Executing trade: {pair} {action} {timeframe}m ({best_opportunity['confidence']}%)")
                    
                    check, id = iq.buy(config.amount, pair, action, timeframe)
                    if check:
                        print(f"[Worker] Trade placed for {config.email}: {action} (ID: {id})")
                        
                        # Update stats
                        # shared_stats is a DictProxy, need to copy-modify-assign or use keys
                        shared_stats["total_trades"] += 1
                        
                        # Wait for expiry
                        sleep_seconds = int(timeframe * 60 + 5)
                        for _ in range(sleep_seconds):
                            if stop_event.is_set():
                                break
                            time.sleep(1)
                        
                        # Check Result
                        # profit = iq.check_win_v3(id) # This blocks sometimes, use get_optioninfo or similar
                        # For simplicity, we assume result is available or we check balance change next loop
                        
                        # If we really want to track wins/losses, we need check_win logic
                        # This often blocks. Let's try non-blocking check if possible
                        # Or just rely on balance update for now to avoid complexity in this step
                        
                    else:
                        print(f"[Worker] Trade failed for {config.email}")
            
            time.sleep(1)

    except Exception as e:
        print(f"[Worker] Error in trade session for {config.email}: {e}")
        traceback.print_exc()
    finally:
        print(f"[Worker] Session ended for {config.email}")
