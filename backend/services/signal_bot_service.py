import threading
import time
import logging
import os
import requests
from exponent_server_sdk import (
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from services.iq_service import iq_manager
from services.strategy_service import StrategyService, resample_to_n_minutes

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
        self.history = []

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def start_stream(self, pairs, timeframe, strategy, push_token=None):
        if self.active:
            return False, "Signal stream already active"

        self.params = {
            "pairs": pairs,
            "timeframe": timeframe,
            "strategy": strategy
        }
        self.push_token = push_token
        self.active = True
        self.stop_event.clear()
        self.stats = {"total": 0, "calls": 0, "puts": 0}
        self.last_signal = None
        self.history = []

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
            "last_signal": self.last_signal,
            "history": self.history,
        }

    def _run_loop(self):
        logging.info(f"Signal Bot Started: {self.params}")
        pairs = self.params["pairs"]
        timeframe = self.params["timeframe"]
        strategy = self.params["strategy"]

        while self.active and not self.stop_event.is_set():
            try:
                # Iterate through all selected pairs
                for pair in pairs:
                    if not self.active or self.stop_event.is_set():
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
                    
                    # Update Last Signal (Global for UI display)
                    # We only update last_signal if we find something interesting or just rotate?
                    # The UI likely polls this. If we update it for every pair, it will flicker rapidly.
                    # Better to only update it if we find a signal, or if we want to show "scanning X..."
                    
                    if result["action"] in ["CALL", "PUT"]:
                        self.last_signal = {
                            "action": result["action"],
                            "confidence": result["confidence"],
                            "timestamp": time.time(),
                            "pair": pair
                        }

                        ts = time.time()
                        self.stats["total"] += 1
                        if result["action"] == "CALL":
                            self.stats["calls"] += 1
                        else:
                            self.stats["puts"] += 1
                        
                        logging.info(f"SIGNAL FOUND: {pair} {result['action']} ({result['confidence']}%)")

                        self.history.append({
                            "timestamp": ts,
                            "pair": pair,
                            "timeframe": timeframe,
                            "action": result["action"],
                            "status": None,
                        })
                        if len(self.history) > 100:
                            self.history.pop(0)
                        
                        # Send Push Notification
                        if self.push_token:
                            self._send_push(pair, result["action"], result["confidence"])

                # Wait for next cycle
                time.sleep(5) 

            except Exception as e:
                logging.error(f"Signal Bot Error: {e}")
                time.sleep(5)

    def _send_push(self, pair, action, confidence):
        now = time.time()
        last_ts = getattr(self, 'last_notified_ts', 0)
        # Global cooldown of 50s to prevent spamming
        if now - last_ts < 50:
            return

        app_id = os.environ.get("ONESIGNAL_APP_ID")
        api_key = os.environ.get("ONESIGNAL_REST_API_KEY")

        if not app_id or not api_key:
            logging.error("OneSignal credentials not configured")
            return

        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Basic {api_key}",
        }

        payload = {
            "app_id": app_id,
            "include_player_ids": [self.push_token],
            "headings": {
                "en": f"{'🟢' if action == 'CALL' else '🔴'} {action} Signal Detected!"
            },
            "contents": {
                "en": f"{pair}: {action} with {confidence:.1f}% confidence."
            },
            "data": {
                "pair": pair,
                "action": action,
                "confidence": confidence,
            },
        }

        try:
            response = requests.post(
                "https://onesignal.com/api/v1/notifications",
                headers=headers,
                json=payload,
                timeout=10,
            )
            if response.status_code >= 200 and response.status_code < 300:
                self.last_notified_ts = now
            else:
                logging.error(f"OneSignal push failed: {response.status_code} {response.text}")
        except Exception as exc:
            logging.error(f"OneSignal push exception: {exc}")

signal_bot_manager = SignalBotManager.get_instance()
