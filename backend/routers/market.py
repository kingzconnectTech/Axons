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
            # Get current price (1 min timeframe)
            candles_current = iq_manager.get_candles(pair, 1, 1)
            
            # Get daily open price (1440 min = 1 day timeframe)
            # This returns the current day's candle, where 'open' is the day's open price
            candles_day = iq_manager.get_candles(pair, 1440, 1)
            
            price = 0.0
            change = 0.0
            
            if candles_current and len(candles_current) > 0:
                price = candles_current[-1]['close']
                
                if candles_day and len(candles_day) > 0:
                    open_price = candles_day[-1]['open']
                    if open_price > 0:
                        change = ((price - open_price) / open_price) * 100
            
            results[pair] = {
                "price": price,
                "change": change
            }
            
        except Exception as e:
            print(f"Error fetching price for {pair}: {e}")
            results[pair] = {"price": 0.0, "change": 0.0}
            
    return results
