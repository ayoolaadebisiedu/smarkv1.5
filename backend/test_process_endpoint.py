import requests
import json
import time

def test_process_data():
    url = "http://127.0.0.1:8000/process-data"
    
    # Create mock OHLCV data for 100 bars
    # Using a simple trend to trigger potential signals
    mock_data = []
    base_price = 50000
    for i in range(100):
        # Create a small dip and then a recovery (W pattern or similar potentially)
        price_change = -10 * i if i < 50 else 10 * (i - 50) - 500
        current_close = base_price + price_change
        
        mock_data.append({
            "time": f"2025-01-01T{i//60:02d}:{i%60:02d}:00",
            "open": current_close - 5,
            "high": current_close + 10,
            "low": current_close - 10,
            "close": current_close
        })
    
    payload = {
        "ticker": "TEST-BTC",
        "data": mock_data
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("SUCCESS: Endpoint processed data correctly.")
        else:
            print("FAILED: Endpoint returned non-200 status.")
            
    except Exception as e:
        print(f"ERROR: Could not connect to backend. {e}")

if __name__ == "__main__":
    test_process_data()
