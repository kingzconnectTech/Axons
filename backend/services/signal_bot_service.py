import threading
import time
import logging
import os
import requests
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
        self.stop_event = threading.Event()
        self.history = []

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def start_stream(self, pairs, timeframe, strategy):
        if self.active:
            return False, "Signal stream already active"
        
        logging.info(f"Starting stream.")

        self.params = {
            "pairs": pairs,
            "timeframe": timeframe,
            "strategy": strategy
        }
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

                # Wait for next cycle
                time.sleep(5) 

            except Exception as e:
                logging.error(f"Signal Bot Error: {e}")
                time.sleep(5)

signal_bot_manager = SignalBotManager.get_instance()
