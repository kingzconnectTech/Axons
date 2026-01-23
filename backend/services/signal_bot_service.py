import threading
import time
import logging
import os
import requests
import uuid
from services.iq_service import iq_manager
from services.strategy_service import StrategyService, resample_to_n_minutes
from services.notification_service import notification_service
from services.status_store import status_store

class SignalBotManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.sessions = {}

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def start_stream(self, email, pairs, timeframe, strategy):
        if email in self.sessions:
            return False, "Signal stream already active for this user"
        
        logging.info(f"Starting stream for {email}.")

        bot_id = str(uuid.uuid4())
        stop_event = threading.Event()
        stats = {"total": 0, "calls": 0, "puts": 0}
        history = []
        params = {
            "pairs": pairs,
            "timeframe": timeframe,
            "strategy": strategy
        }
        last_signal = None

        session = {
            "bot_id": bot_id,
            "params": params,
            "stats": stats,
            "history": history,
            "last_signal": last_signal,
            "stop_event": stop_event,
            "active": True
        }

        # Start thread
        thread = threading.Thread(
            target=self._run_loop, 
            args=(email, stop_event, params, stats, history, session), 
            daemon=True
        )
        thread.start()
        
        session["thread"] = thread
        self.sessions[email] = session
        
        return True, {"message": "Signal stream started", "bot_id": bot_id}

    def stop_stream(self, email):
        if email not in self.sessions:
            return False, "Signal stream not active"

        session = self.sessions[email]
        session["active"] = False
        session["stop_event"].set()
        
        if session["thread"]:
            session["thread"].join(timeout=2)
        
        del self.sessions[email]
        return True, "Signal stream stopped"

    def get_status(self, email):
        if email in self.sessions:
            session = self.sessions[email]
            return {
                "active": True,
                "params": session["params"],
                "stats": session["stats"],
                "last_signal": session.get("last_signal"),
                "history": session["history"],
            }
        return {
            "active": False,
            "params": {},
            "stats": {"total": 0, "calls": 0, "puts": 0},
            "last_signal": None,
            "history": [],
        }

    def _run_loop(self, email, stop_event, params, stats, history, session):
        logging.info(f"Signal Bot Started for {email}: {params}")
        pairs = params["pairs"]
        timeframe = params["timeframe"]
        strategy = params["strategy"]

        while not stop_event.is_set():
            try:
                # Iterate through all selected pairs
                for pair in pairs:
                    if stop_event.is_set():
                        break

                    supported = {1, 2, 5, 15, 60}
                    if timeframe in supported:
                        candles = iq_manager.get_candles(pair, timeframe)
                        spread = 0.0
                        if candles:
                            last_candle = candles[-1]
                            spread = last_candle["max"] - last_candle["min"]
                        result = StrategyService.analyze(pair, candles, strategy, spread=spread)
                    else:
                        m1 = iq_manager.get_candles(pair, 1, count=max(120, timeframe * 60))
                        mN = resample_to_n_minutes(m1, int(timeframe))
                        spread = 0.0
                        if mN:
                            last_candle = mN[-1]
                            spread = last_candle["max"] - last_candle["min"]
                        result = StrategyService.analyze(pair, mN, strategy, spread=spread)
                    
                    if result["action"] in ["CALL", "PUT"]:
                        # Update session last_signal directly
                        session["last_signal"] = {
                            "action": result["action"],
                            "confidence": result["confidence"],
                            "timestamp": time.time(),
                            "pair": pair
                        }

                        ts = time.time()
                        stats["total"] += 1
                        if result["action"] == "CALL":
                            stats["calls"] += 1
                        else:
                            stats["puts"] += 1
                        
                        logging.info(f"[{email}] SIGNAL FOUND: {pair} {result['action']} ({result['confidence']}%)")
                        
                        # Send Notification (Single User)
                        try:
                            token = status_store.get_token(email)
                            if token:
                                logging.info(f"[{email}] Sending notification to token: {token[:10]}...")
                                notification_service.send_multicast(
                                    tokens=[token],
                                    title=f"New Signal: {pair}",
                                    body=f"{result['action']} Signal Detected! Confidence: {result['confidence']}%",
                                    data={
                                        "pair": pair,
                                        "action": result["action"],
                                        "confidence": str(result["confidence"]),
                                        "timestamp": str(ts),
                                        "bot_id": session.get("bot_id", "")
                                    }
                                )
                            else:
                                logging.warning(f"[{email}] No token found. Skipping notification.")
                        except Exception as e:
                            logging.error(f"[{email}] Failed to send notification: {e}")

                        history.append({
                            "timestamp": ts,
                            "pair": pair,
                            "timeframe": timeframe,
                            "action": result["action"],
                            "status": None,
                        })
                        if len(history) > 100:
                            history.pop(0)

                        # Cooldown
                        logging.info(f"[{email}] Signal found. Resting for 60 seconds...")
                        time.sleep(60)

                # Wait for next cycle
                time.sleep(5) 

            except Exception as e:
                logging.error(f"[{email}] Signal Bot Error: {e}")
                time.sleep(5)

signal_bot_manager = SignalBotManager.get_instance()
