import threading
import time
import logging
from exponent_server_sdk import (
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from services.iq_service import iq_manager
from services.strategy_service import StrategyService

class SignalBotManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.active = False
        self.thread = None
        self.params = {}
        self.stats = {"total": 0, "calls": 0, "puts": 0}
        self.last_signal = None
        self.push_token = None
        self.stop_event = threading.Event()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def start_stream(self, pair, timeframe, strategy, push_token=None):
        if self.active:
            return False, "Signal stream already active"

        self.params = {
            "pair": pair,
            "timeframe": timeframe,
            "strategy": strategy
        }
        self.push_token = push_token
        self.active = True
        self.stop_event.clear()
        self.stats = {"total": 0, "calls": 0, "puts": 0}
        self.last_signal = None

        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        
        return True, "Signal stream started"

    def stop_stream(self):
        if not self.active:
            return False, "Signal stream not active"

        self.active = False
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=2)
        
        return True, "Signal stream stopped"

    def get_status(self):
        return {
            "active": self.active,
            "params": self.params,
            "stats": self.stats,
            "last_signal": self.last_signal
        }

    def _run_loop(self):
        logging.info(f"Signal Bot Started: {self.params}")
        pair = self.params["pair"]
        timeframe = self.params["timeframe"]
        strategy = self.params["strategy"]

        while self.active and not self.stop_event.is_set():
            try:
                # 1. Fetch Candles
                candles = iq_manager.get_candles(pair, timeframe)
                
                # 2. Analyze
                result = StrategyService.analyze(pair, candles, strategy)
                
                # Update Last Signal
                self.last_signal = {
                    "action": result["action"],
                    "confidence": result["confidence"],
                    "timestamp": time.time(),
                    "pair": pair
                }

                # 3. Handle Signal
                if result["action"] in ["CALL", "PUT"]:
                    self.stats["total"] += 1
                    if result["action"] == "CALL":
                        self.stats["calls"] += 1
                    else:
                        self.stats["puts"] += 1
                    
                    logging.info(f"SIGNAL FOUND: {result['action']} ({result['confidence']}%)")
                    
                    # Send Push Notification
                    if self.push_token:
                        self._send_push(result["action"], result["confidence"])

                # 4. Wait for next candle
                # For M1, we should check every ~10s to catch the "just closed" candle quickly?
                # Or wait 60s?
                # Strategy logic relies on "latest candle".
                # If we check every 10s, we might get duplicate signals for the same candle.
                # We should track the 'last_processed_candle_time'.
                
                # Simple approach: Wait 5s (polling), but de-duplicate based on timestamp?
                # The frontend was polling every 5s.
                # Let's poll every 5s, but only notify if it's a NEW signal or logic allows.
                # Actually, duplicate notifications are bad.
                # We need to store 'last_notification_time' and enforce a cooldown (e.g. 1 min).
                
                time.sleep(5) 

            except Exception as e:
                logging.error(f"Signal Bot Error: {e}")
                time.sleep(5)

    def _send_push(self, action, confidence):
        # Rate limit: Don't spam. Strategy might return same signal for the same candle multiple times if we poll every 5s.
        # We should only send ONCE per candle.
        # Check logic: if last_signal timestamp is fresh?
        # Better: store `last_notified_ts`.
        
        now = time.time()
        last_ts = getattr(self, 'last_notified_ts', 0)
        
        # 50 seconds cooldown (almost 1 candle)
        if now - last_ts < 50:
            return

        try:
            response = PushClient().publish(
                PushMessage(
                    to=self.push_token,
                    title=f"{'🟢' if action == 'CALL' else '🔴'} {action} Signal Detected!",
                    body=f"{self.params['pair']}: {action} with {confidence:.1f}% confidence.",
                    data={"pair": self.params['pair'], "action": action, "confidence": confidence},
                    sound="default",
                    priority="high"
                )
            )
            self.last_notified_ts = now
        except (PushServerError, PushTicketError) as exc:
            logging.error(f"Push Notification Failed: {exc}")
            # If token is invalid, maybe clear it?
            # self.push_token = None

signal_bot_manager = SignalBotManager.get_instance()
