import pandas as pd
import numpy as np
import alphalens
from alphalens.utils import get_clean_factor_and_forward_returns
import logging
import yfinance as yf
from ..database import SessionLocal, Signal, Asset

logger = logging.getLogger("AlphaAnalyzer")

class AlphaAnalyzer:
    def __init__(self):
        pass

    def prepare_alphalens_data(self, factor_data: pd.DataFrame, price_data: pd.DataFrame, periods=[1, 5, 10]):
        """
        Prepare data for Alphalens.
        
        factor_data: Series with MultiIndex (date, asset) and factor values.
        price_data: DataFrame with index (date) and columns (assets) containing close prices.
        """
        try:
            # Ensure price_data index is datetime
            price_data.index = pd.to_datetime(price_data.index)
            factor_data.index = factor_data.index.set_levels([pd.to_datetime(factor_data.index.levels[0]), factor_data.index.levels[1]])

            # Call Alphalens utility
            clean_data = get_clean_factor_and_forward_returns(
                factors=factor_data,
                prices=price_data,
                periods=periods,
                quantiles=5,
                filter_zscore=None
            )
            return clean_data
        except Exception as e:
            logger.error(f"Error in prepare_alphalens_data: {e}")
            return None

    def calculate_ic_metrics(self, clean_data):
        """Calculate Information Coefficient metrics."""
        if clean_data is None:
            return None
        
        ic = alphalens.performance.factor_information_coefficient(clean_data)
        ic_summary = ic.mean()
        return {
            "ic_mean": ic_summary.to_dict(),
            "ic_std": ic.std().to_dict(),
            "ic_t_stat": (ic.mean() / ic.std() * np.sqrt(len(ic))).to_dict()
        }

    def calculate_return_metrics(self, clean_data):
        """Calculate returns metrics."""
        if clean_data is None:
            return None
        
        mean_return_by_q, std_err_by_q = alphalens.performance.mean_return_by_quantile(clean_data)
        return {
            "mean_return_by_quantile": mean_return_by_q.to_dict(),
            "cumulative_returns": alphalens.performance.factor_cumulative_returns(clean_data, period=1).to_dict()
        }

    def run_full_analysis(self, signals_df: pd.DataFrame, prices_df: pd.DataFrame):
        """
        Run end-to-end analysis.
        signals_df: columns [date, asset, factor_value]
        prices_df: columns [date, asset, price]
        """
        # Pivot prices
        prices_pivoted = prices_df.pivot(index='date', columns='asset', values='price')
        
        # Format factors
        factors = signals_df.set_index(['date', 'asset'])['factor_value']
        
        clean_data = self.prepare_alphalens_data(factors, prices_pivoted)
        
        if clean_data is None:
            return {"error": "Failed to clean data for Alphalens"}
            
        ic_metrics = self.calculate_ic_metrics(clean_data)
        return_metrics = self.calculate_return_metrics(clean_data)
        
        return {
            "ic_metrics": ic_metrics,
            "return_metrics": return_metrics,
            "summary": "Analysis complete"
        }

class FactorConverter:
    @staticmethod
    def signals_to_factor_df(signals: list):
        """Convert a list of Signal objects to a DataFrame for AlphaAnalyzer."""
        data = []
        for sig in signals:
            data.append({
                "date": sig.created_at,
                "asset": sig.asset.ticker,
                "factor_value": sig.confidence
            })
        return pd.DataFrame(data)

class AlphaDataBridge:
    @staticmethod
    def fetch_historical_prices(tickers: list, start_date: str, end_date: str):
        """Fetch historical close prices for all tickers in signal list."""
        data = []
        for ticker in tickers:
            df = yf.download(ticker, start=start_date, end=end_date)
            if not df.empty:
                df = df.reset_index()
                for _, row in df.iterrows():
                    data.append({
                        "date": row['Date'],
                        "asset": ticker,
                        "price": row['Close']
                    })
        return pd.DataFrame(data)
