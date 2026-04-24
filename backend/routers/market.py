from fastapi import APIRouter
import httpx
import time

router = APIRouter()

# Mapping from plain pair names to Yahoo Finance ticker symbols
YAHOO_SYMBOLS = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "EURJPY": "EURJPY=X",
    "AUDCAD": "AUDCAD=X",
    # OTC variants: map to their real-world equivalent
    "EURUSD-OTC": "EURUSD=X",
    "GBPUSD-OTC": "GBPUSD=X",
    "EURJPY-OTC": "EURJPY=X",
    "AUDCAD-OTC": "AUDCAD=X",
}

# Simple in-memory cache so we don't hammer Yahoo Finance
_price_cache = {}
_cache_ttl = 10  # seconds


def _get_cached(pair: str):
    entry = _price_cache.get(pair)
    if entry and (time.time() - entry["ts"] < _cache_ttl):
        return entry["data"]
    return None


def _set_cached(pair: str, data: dict):
    _price_cache[pair] = {"data": data, "ts": time.time()}


def _fetch_yahoo_price(symbol: str) -> dict:
    """Fetch the current price and daily change % from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.get(url, headers=headers)
            r.raise_for_status()
            data = r.json()

        result = data["chart"]["result"][0]
        meta = result["meta"]
        price = float(meta.get("regularMarketPrice", 0))
        prev_close = float(meta.get("previousClose") or meta.get("chartPreviousClose", price))
        change = ((price - prev_close) / prev_close * 100) if prev_close else 0.0
        return {"price": price, "change": round(change, 4)}
    except Exception as e:
        print(f"[Market] Error fetching {symbol}: {e}")
        return None


@router.get("/prices")
def get_prices(pairs: str = "EURUSD,GBPUSD,EURJPY,AUDCAD"):
    """Return live forex prices from Yahoo Finance. No IQ Option account required."""
    pair_list = [p.strip() for p in pairs.split(",")]
    results = {}

    for pair in pair_list:
        # Normalise: strip -OTC for display key
        display_key = pair.replace("-OTC", "")

        # Check cache first
        cached = _get_cached(display_key)
        if cached:
            results[display_key] = cached
            continue

        symbol = YAHOO_SYMBOLS.get(pair) or YAHOO_SYMBOLS.get(display_key)
        if not symbol:
            results[display_key] = {"price": 0.0, "change": 0.0}
            continue

        data = _fetch_yahoo_price(symbol)
        if data:
            _set_cached(display_key, data)
            results[display_key] = data
        else:
            results[display_key] = {"price": 0.0, "change": 0.0}

    return results
