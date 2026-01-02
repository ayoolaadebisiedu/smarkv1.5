import MetaTrader5 as mt5
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MT5Engine")

class MT5Engine:
    def __init__(self, account=None, password=None, server=None):
        self.account = account or int(os.getenv("MT5_ACCOUNT", 0))
        self.password = password or os.getenv("MT5_PASSWORD", "")
        self.server = server or os.getenv("MT5_SERVER", "")
        self.connected = False

    def connect(self):
        """Initialize and login to MT5."""
        if not mt5.initialize():
            logger.error(f"MT5 initialization failed, error code: {mt5.last_error()}")
            return False
        
        if self.account and self.password and self.server:
            authorized = mt5.login(self.account, password=self.password, server=self.server)
            if authorized:
                logger.info(f"MT5 authorized successfully for account {self.account}")
                self.connected = True
                return True
            else:
                logger.error(f"MT5 login failed, error code: {mt5.last_error()}")
                return False
        else:
            logger.info("MT5 initialized but no credentials provided. Using existing terminal login.")
            self.connected = True
            return True

    def get_account_info(self):
        """Get MT5 account info."""
        if not self.connected:
            return None
        return mt5.account_info()._asdict()

    def get_symbol_info(self, symbol):
        """Get symbol information."""
        if not self.connected:
            return None
        return mt5.symbol_info(symbol)._asdict() if mt5.symbol_info(symbol) else None

    def place_order(self, symbol, order_type, volume, price=None, sl=None, tp=None, comment="Smark Trade"):
        """Place an order on MT5."""
        if not self.connected:
            logger.error("MT5 not connected")
            return None

        # Prepare request
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": float(volume),
            "type": order_type,
            "magic": 123456,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        if price:
            request["price"] = float(price)
        if sl:
            request["sl"] = float(sl)
        if tp:
            request["tp"] = float(tp)

        # Send order
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Order failed, retcode: {result.retcode}")
        else:
            logger.info(f"Order placed successfully: Ticket {result.order}")
        
        return result._asdict()

    def get_open_positions(self):
        """Get all open positions."""
        if not self.connected:
            return []
        positions = mt5.positions_get()
        if positions is None:
            return []
        return [p._asdict() for p in positions]

    def close_position(self, ticket):
        """Close an open position."""
        if not self.connected:
            return False
            
        position = mt5.positions_get(ticket=ticket)
        if not position:
            logger.error(f"Position {ticket} not found")
            return False
            
        pos = position[0]
        symbol = pos.symbol
        volume = pos.volume
        order_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
        
        # Determine closing price based on position type
        symbol_info = mt5.symbol_info_tick(symbol)
        price = symbol_info.bid if order_type == mt5.ORDER_TYPE_SELL else symbol_info.ask

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": order_type,
            "position": ticket,
            "price": price,
            "magic": 123456,
            "comment": "Smark Close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Close failed, retcode: {result.retcode}")
            return False
        
        logger.info(f"Position {ticket} closed successfully")
        return True

    def shutdown(self):
        """Disconnect from MT5."""
        mt5.shutdown()
        self.connected = False
        logger.info("MT5 connection closed")
