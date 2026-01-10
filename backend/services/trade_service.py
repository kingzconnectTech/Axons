import threading
import time
from services.iq_service import IQSessionManager
from services.strategy_service import StrategyService


class TradeSession(threading.Thread):
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.active = True
        self.stats = {
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "profit": 0.0,
            "consecutive_losses": 0
        }
        self.iq_manager = IQSessionManager.get_instance()

    def run(self):
        try:
            iq = self.iq_manager.create_user_session(self.config.email, self.config.password)
            iq.change_balance(self.config.account_type)
            
            while self.active:
                if self.stats["consecutive_losses"] >= self.config.max_consecutive_losses:
                    print(f"Max consecutive losses reached for {self.config.email}. Stopping.")
                    break
                
                if self.stats["total_trades"] >= self.config.max_trades:
                    print(f"Max trades reached for {self.config.email}. Stopping.")
                    break

                # Get Candles
                pair = self.config.pair
                
                candles = iq.get_candles(pair, self.config.timeframe * 60, 100, time.time())
                analysis = StrategyService.analyze(pair, candles, self.config.strategy)
                
                if analysis["action"] in ["CALL", "PUT"] and analysis["confidence"] > 70:
                    # Place Trade
                    check, id = iq.buy(self.config.amount, pair, analysis["action"], self.config.timeframe)
                    if check:
                        print(f"Trade placed for {self.config.email}: {analysis['action']}")
                        self.stats["total_trades"] += 1
                        
                        # Wait for result (simplistic)
                        # In real app we should use websocket callback or poll result
                        time.sleep(self.config.timeframe * 60 + 5) 
                        
                        # Check win/loss (simplified logic)
                        # profit = iq.check_win_v3(id) ...
                        # For now just mock stats update
                        # self.stats["wins"] += 1
                    else:
                        print("Trade failed")
                
                time.sleep(1) # Loop delay
                
        except Exception as e:
            print(f"Error in trade session for {self.config.email}: {e}")
        finally:
            self.active = False

    def stop(self):
        self.active = False

class TradeManager:
    _instance = None
    
    def __init__(self):
        self.sessions = {} # email -> TradeSession

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def start_trading(self, config):
        if config.email in self.sessions and self.sessions[config.email].is_alive():
            return False, "Session already active"
        
        session = TradeSession(config)
        self.sessions[config.email] = session
        session.start()
        return True, "Started"

    def stop_trading(self, email):
        if email in self.sessions:
            self.sessions[email].stop()
            return True, "Stopped"
        return False, "No active session"

    def get_status(self, email):
        if email in self.sessions:
            return self.sessions[email].stats
        return None

trade_manager = TradeManager.get_instance()
