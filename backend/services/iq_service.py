from iqoptionapi.stable_api import IQ_Option
import time
import logging
from threading import Lock

# Default Credentials for Signals
DEFAULT_EMAIL = "prosperousdellahs@gmail.com"
DEFAULT_PASSWORD = "Prosperous911@"

class IQSessionManager:
    _instance = None
    _lock = Lock()
    
    def __init__(self):
        self.sessions = {}
        self.default_session = None
        self.session_lock = Lock()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def get_default_session(self):
        with self.session_lock:
            if not self.default_session or not self.default_session.check_connect():
                print("Connecting to default IQ Option account...")
                self.default_session = IQ_Option(DEFAULT_EMAIL, DEFAULT_PASSWORD)
                check, reason = self.default_session.connect()
                if not check:
                    print(f"Error connecting default account: {reason}")
                    return None
            return self.default_session

    def create_user_session(self, email, password):
        with self.session_lock:
            if email in self.sessions:
                if self.sessions[email].check_connect():
                    return self.sessions[email]
            
            print(f"Connecting user {email}...")
            iq = IQ_Option(email, password)
            check, reason = iq.connect()
            if check:
                self.sessions[email] = iq
                return iq
            else:
                raise Exception(f"Failed to connect: {reason}")

    def get_candles(self, pair, timeframe, count=100):
        iq = self.get_default_session()
        if not iq:
            return []
        # timeframe in seconds for API? 
        # usually timeframe is 60 for 1m, 300 for 5m
        # user passes timeframe in minutes
        tf_seconds = int(timeframe * 60)
        raw = iq.get_candles(pair, tf_seconds, count, time.time())
        candles = []
        for c in raw or []:
            ts = c.get("timestamp", c.get("from"))
            normalized = dict(c)
            if ts is not None:
                normalized["timestamp"] = int(ts)
            candles.append(normalized)
        return candles

    def get_balance(self, email):
        with self.session_lock:
            if email in self.sessions and self.sessions[email].check_connect():
                return self.sessions[email].get_balance()
            return 0.0

iq_manager = IQSessionManager.get_instance()
