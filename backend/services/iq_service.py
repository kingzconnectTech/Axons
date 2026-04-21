import os
import time
import logging
from threading import Lock


class IQOptionUnavailableError(RuntimeError):
    pass


_iq_option_class = None
_iq_import_error = None
_iq_import_attempted = False
_iq_import_lock = Lock()


def _load_iq_option_class():
    global _iq_option_class, _iq_import_error, _iq_import_attempted

    with _iq_import_lock:
        if _iq_import_attempted:
            return _iq_option_class

        _iq_import_attempted = True
        try:
            from iqoptionapi.stable_api import IQ_Option as imported_iq_option

            _iq_option_class = imported_iq_option
            _iq_import_error = None
        except Exception as exc:
            _iq_option_class = None
            _iq_import_error = exc
            logging.exception("IQ Option dependency failed to load")

        return _iq_option_class


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

    def get_default_credentials(self):
        return os.environ.get("IQ_OPTION_EMAIL"), os.environ.get("IQ_OPTION_PASSWORD")

    def dependency_error(self):
        _load_iq_option_class()
        return _iq_import_error

    def unavailable_detail(self, detail):
        payload = {
            "detail": detail,
            "service": "iqoption",
        }
        if self.dependency_error():
            payload["dependency_error"] = str(self.dependency_error())
        return payload

    def require_dependency(self):
        iq_option_class = _load_iq_option_class()
        if iq_option_class is None:
            raise IQOptionUnavailableError(
                "IQ Option support is unavailable. Verify the iqoptionapi dependency is installed correctly."
            )
        return iq_option_class

    def ensure_market_data_ready(self):
        self.require_dependency()
        email, password = self.get_default_credentials()
        if not email or not password:
            raise IQOptionUnavailableError(
                "IQ Option shared credentials are not configured. Set IQ_OPTION_EMAIL and IQ_OPTION_PASSWORD."
            )
        return self.get_default_session()

    def get_default_session(self):
        iq_option_class = self.require_dependency()
        email, password = self.get_default_credentials()
        if not email or not password:
            raise IQOptionUnavailableError(
                "IQ Option shared credentials are not configured. Set IQ_OPTION_EMAIL and IQ_OPTION_PASSWORD."
            )

        with self.session_lock:
            if self.default_session and self.default_session.check_connect():
                return self.default_session

            print("Connecting to default IQ Option account...")
            self.default_session = iq_option_class(email, password)
            check, reason = self.default_session.connect()
            if not check:
                self.default_session = None
                raise IQOptionUnavailableError(
                    f"IQ Option shared account connection failed: {reason}"
                )

            return self.default_session

    def create_user_session(self, email, password):
        iq_option_class = self.require_dependency()

        with self.session_lock:
            if email in self.sessions and self.sessions[email].check_connect():
                return self.sessions[email]

            print(f"Connecting user {email}...")
            iq = iq_option_class(email, password)
            check, reason = iq.connect()
            if check:
                self.sessions[email] = iq
                return iq

            raise Exception(f"Failed to connect: {reason}")

    def get_candles(self, pair, timeframe, count=100):
        iq = self.get_default_session()
        tf_seconds = int(timeframe * 60)
        raw = iq.get_candles(pair, tf_seconds, count, time.time())
        candles = []
        for candle in raw or []:
            ts = candle.get("timestamp", candle.get("from"))
            normalized = dict(candle)
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
