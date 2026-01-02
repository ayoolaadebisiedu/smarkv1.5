import logging
import os
from .mt5_engine import MT5Engine
from .alpaca_engine import AlpacaEngine

logger = logging.getLogger("ExecutionManager")

class ExecutionManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ExecutionManager, cls).__new__(cls)
            cls._instance.mt5 = MT5Engine()
            cls._instance.alpaca = AlpacaEngine()
            cls._instance.active_platform = os.getenv("ACTIVE_TRADING_PLATFORM", "mt5").lower()
            cls._instance.initialized = False
        return cls._instance

    def initialize(self):
        """Initialize both engines if credentials exist."""
        if self.initialized:
            return True
            
        logger.info(f"Initializing ExecutionManager. Active Platform: {self.active_platform}")
        
        # Initialize MT5
        mt5_success = self.mt5.connect()
        
        # Initialize Alpaca
        alpaca_success = self.alpaca.connect()
        
        self.initialized = True
        return mt5_success or alpaca_success

    def set_active_platform(self, platform):
        """Switch active trading platform."""
        if platform.lower() in ["mt5", "alpaca"]:
            self.active_platform = platform.lower()
            logger.info(f"Active platform switched to: {self.active_platform}")
            return True
        return False

    def execute_trade(self, symbol, side, volume, price=None, sl=None, tp=None):
        """Route trade execution to active platform."""
        if not self.initialized:
            self.initialize()
            
        if self.active_platform == "mt5":
            import MetaTrader5 as mt_const
            order_type = mt_const.ORDER_TYPE_BUY if side.lower() == "buy" else mt_const.ORDER_TYPE_SELL
            return self.mt5.place_order(symbol, order_type, volume, price, sl, tp)
        elif self.active_platform == "alpaca":
            return self.alpaca.place_market_order(symbol, side, volume)
        else:
            logger.error(f"Invalid active platform: {self.active_platform}")
            return None

    def get_positions(self):
        """Get positions from active platform."""
        if self.active_platform == "mt5":
            return self.mt5.get_open_positions()
        elif self.active_platform == "alpaca":
            return self.alpaca.get_open_positions()
        return []

    def close_position(self, ticket_or_symbol):
        """Close position on active platform."""
        if self.active_platform == "mt5":
            return self.mt5.close_position(ticket_or_symbol)
        elif self.active_platform == "alpaca":
            return self.alpaca.close_position(ticket_or_symbol)
        return False

    def get_status(self):
        """Get status of both platforms."""
        return {
            "active_platform": self.active_platform,
            "mt5": {"connected": self.mt5.connected, "account": self.mt5.account},
            "alpaca": {"connected": self.alpaca.connected, "paper": self.alpaca.paper}
        }
