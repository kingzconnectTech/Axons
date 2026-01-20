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
        
        logging.info(f"Starting stream. Push Token: {push_token}")
        print(f"DEBUG: Received Push Token: {push_token}")

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
            print(f"DEBUG: Push skipped due to cooldown ({int(50 - (now - last_ts))}s remaining)")
            return

        if not self.push_token:
            print("DEBUG: No push token available")
            return
            
        try:
            print(f"DEBUG: Attempting to send push to {self.push_token}...")
            # Check if token is valid Expo token
            if not self.push_token.startswith('ExponentPushToken') and not self.push_token.startswith('ExpoPushToken'):
                logging.warning(f"Invalid Expo Push Token: {self.push_token}")
                print(f"DEBUG: WARNING - Token format looks suspicious: {self.push_token}")

            response = PushClient().publish(
                PushMessage(
                    to=self.push_token,
                    title=f"{'🟢' if action == 'CALL' else '🔴'} {action} Signal Detected!",
                    body=f"{pair}: {action} with {confidence:.1f}% confidence.",
                    data={
                        "pair": pair,
                        "action": action,
                        "confidence": confidence,
                    },
                    sound="axon_notification", 
                    priority="high",
                    channel_id="default"
                )
            )
            
            print(f"DEBUG: Expo Response: {response}")
            try:
                response.validate_response()
                self.last_notified_ts = now
                logging.info(f"Push notification sent to {self.push_token}")
                print("DEBUG: Push notification sent successfully!")
                # Log ticket IDs for debugging
                for ticket in response.tickets:
                    if ticket.status == 'ok':
                        logging.info(f"Expo Ticket ID: {ticket.id}")
                        print(f"DEBUG: Expo Ticket ID: {ticket.id}")
                    else:
                        print(f"DEBUG: Expo Ticket Error: {ticket.details} - {ticket.message}")
            except PushServerError as exc:
                logging.error(f"Push Server Error: {exc.errors}")
                print(f"DEBUG: Push Server Error: {exc.errors}")
            except Exception as exc:
                logging.error(f"Push Error: {exc}")
                print(f"DEBUG: Push Error: {exc}")
                
        except Exception as exc:
            logging.error(f"Push notification exception: {exc}")

signal_bot_manager = SignalBotManager.get_instance()
