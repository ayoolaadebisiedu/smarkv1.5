from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, GetOrdersRequest
from alpaca.trading.enums import OrderSide, TimeInForce, QueryOrderStatus
from alpaca.data.historical import StockHistoricalDataClient
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AlpacaEngine")

class AlpacaEngine:
    def __init__(self, api_key=None, secret_key=None, paper=True):
        self.api_key = api_key or os.getenv("ALPACA_API_KEY", "")
        self.secret_key = secret_key or os.getenv("ALPACA_SECRET_KEY", "")
        self.paper = paper
        self.client = None
        self.data_client = None
        self.connected = False

    def connect(self):
        """Initialize Alpaca Trading Client."""
        if self.api_key and self.secret_key:
            try:
                self.client = TradingClient(self.api_key, self.secret_key, paper=self.paper)
                self.data_client = StockHistoricalDataClient(self.api_key, self.secret_key)
                
                # Verify connection by getting account info
                account = self.client.get_account()
                logger.info(f"Alpaca connected successfully. Account Status: {account.status}")
                self.connected = True
                return True
            except Exception as e:
                logger.error(f"Alpaca connection failed: {e}")
                return False
        else:
            logger.error("Alpaca API credentials missing")
            return False

    def get_account_info(self):
        """Get Alpaca account info."""
        if not self.connected:
            return None
        try:
            account = self.client.get_account()
            return dict(account)
        except Exception as e:
            logger.error(f"Failed to get account info: {e}")
            return None

    def place_market_order(self, symbol, side, qty, time_in_force=TimeInForce.GTC):
        """Place a market order on Alpaca."""
        if not self.connected:
            return None
        
        try:
            order_request = MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=OrderSide.BUY if side.lower() == "buy" else OrderSide.SELL,
                time_in_force=time_in_force
            )
            order = self.client.submit_order(order_data=order_request)
            logger.info(f"Alpaca order submitted: {order.id}")
            return dict(order)
        except Exception as e:
            logger.error(f"Alpaca order failed: {e}")
            return None

    def get_open_positions(self):
        """Get all open positions."""
        if not self.connected:
            return []
        try:
            positions = self.client.get_all_positions()
            return [dict(p) for p in positions]
        except Exception as e:
            logger.error(f"Failed to get positions: {e}")
            return []

    def close_position(self, symbol):
        """Close a specific position by symbol."""
        if not self.connected:
            return False
        try:
            self.client.close_position(symbol)
            logger.info(f"Alpaca position closed for {symbol}")
            return True
        except Exception as e:
            logger.error(f"Failed to close position for {symbol}: {e}")
            return False

    def get_orders(self, status=QueryOrderStatus.OPEN):
        """Get recent orders."""
        if not self.connected:
            return []
        try:
            request_params = GetOrdersRequest(status=status)
            orders = self.client.get_orders(filter=request_params)
            return [dict(o) for o in orders]
        except Exception as e:
            logger.error(f"Failed to get orders: {e}")
            return []
