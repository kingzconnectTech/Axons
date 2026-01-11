import multiprocessing
import time
from services.trade_worker import run_trade_session

class TradeManager:
    _instance = None
    
    def __init__(self):
        self.sessions = {} # email -> {process, stop_event, stats}
        self.lock = multiprocessing.Lock()
        self.manager = multiprocessing.Manager()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def start_trading(self, config):
        with self.lock:
            if config.email in self.sessions:
                proc_info = self.sessions[config.email]
                if proc_info["process"].is_alive():
                    return False, "Session already active"
                else:
                    # Clean up dead session
                    del self.sessions[config.email]
            
            # Create shared objects
            stop_event = self.manager.Event()
            stats = self.manager.dict({
                "total_trades": 0,
                "wins": 0,
                "losses": 0,
                "profit": 0.0,
                "consecutive_losses": 0,
                "balance": 0.0,
                "currency": None,
                "active": True,
                "last_signal": None
            })
            
            # Start Process
            process = multiprocessing.Process(
                target=run_trade_session,
                args=(config, stats, stop_event)
            )
            process.start()
            
            self.sessions[config.email] = {
                "process": process,
                "stop_event": stop_event,
                "stats": stats
            }
            
            return True, "Started"

    def stop_trading(self, email):
        with self.lock:
            if email in self.sessions:
                proc_info = self.sessions[email]
                proc_info["stop_event"].set()
                # We don't join here to avoid blocking response, 
                # but we could update 'active' in stats immediately
                proc_info["stats"]["active"] = False
                return True, "Stopped"
            return False, "No active session"

    def get_status(self, email):
        with self.lock:
            if email in self.sessions:
                proc_info = self.sessions[email]
                stats = dict(proc_info["stats"]) # Convert Proxy to dict
                
                # Check if process is still alive
                is_alive = proc_info["process"].is_alive()
                stats['active'] = is_alive and not proc_info["stop_event"].is_set()
                
                return stats
            return {}

trade_manager = TradeManager.get_instance()
