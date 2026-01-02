from backend.database import engine, Base
from sqlalchemy import inspect

def verify_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables in database:", tables)
    
    expected = ["backtest_results", "strategy_states"]
    for table in expected:
        if table in tables:
            print(f"PASS: Table '{table}' exists.")
        else:
            print(f"FAIL: Table '{table}' missing.")

if __name__ == "__main__":
    verify_tables()
