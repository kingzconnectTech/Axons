from fastapi import APIRouter
from services.iq_service import iq_manager
from typing import List

router = APIRouter()

@router.get("/prices")
def get_prices(pairs: str = "EURUSD-OTC,GBPUSD-OTC,USDJPY-OTC,NZDUSD-OTC"):
    pair_list = pairs.split(",")
    results = {}
    for pair in pair_list:
        try:
            # Get 1 candle (current minute) to get the close price
            # Timeframe 1 min
            candles = iq_manager.get_candles(pair, 1, 1) 
            if candles and len(candles) > 0:
                results[pair] = candles[-1]['close']
            else:
                 results[pair] = 0.0
        except Exception as e:
            print(f"Error fetching price for {pair}: {e}")
            results[pair] = 0.0
            
    return results
