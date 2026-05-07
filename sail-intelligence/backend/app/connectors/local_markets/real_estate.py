"""
app/connectors/local_markets/real_estate.py

Full-stack multi-market real estate connector.

Five Apify actors cover five geographic markets, auto-selected from query text:
  ZILLOW      — apify/zillow-com-scraper            (US, default)
  RIGHTMOVE   — dtrungtin/rightmove-scraper          (UK)
  SAHIBINDEN  — apify/sahibinden-scraper             (TR)
  IDEALISTA   — apify/idealista-scraper              (ES / IT / PT)
  IMMOSCOUT   — apify/immobilienscout24-scraper      (DE / AT / CH)

Market detection uses keyword matching on the raw query strings.
Precedence: TR > UK > ES > DE > US (Zillow default)

Rich transform step computes:
  - sqm                (sqft / 10.764)
  - price_per_sqm      (pricePerSquareFoot × 10.764 to convert ft² → m²)
  - gross_yield_pct    (estimated_rent × 12 / price × 100)
  - investment_grade   (A if yield > 8%, B if > 5%, C if > 3%, D otherwise)
  - neighborhood_heat  (hot / warm / cold based on days_on_market)
  - is_distressed      (price_cut > 10% AND days_on_market > 60)
  - market             (human-readable market label e.g. "US/Zillow")

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback connector: none
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger   = structlog.get_logger(__name__)
settings = get_settings()

# ── Conversion constant ───────────────────────────────────────────────────────

_SQFT_TO_SQM = 10.764  # 1 m² = 10.764 ft²

# ── Market keyword sets ───────────────────────────────────────────────────────

_TR_KEYWORDS = {"istanbul", "ankara", "izmir", "türkiye", "turkey", "antalya", "bursa", "tr"}
_UK_KEYWORDS = {"london", "manchester", "birmingham", "england", "uk", "scotland", "wales", "bristol", "leeds"}
_ES_KEYWORDS = {"madrid", "barcelona", "españa", "spain", "valencia", "sevilla", "malaga", "lisbon", "portugal", "rome", "milan", "italy"}
_DE_KEYWORDS = {"berlin", "münchen", "munich", "hamburg", "frankfurt", "cologne", "köln", "deutschland", "germany", "vienna", "austria", "zürich", "zurich", "switzerland"}

# ── Actor IDs ─────────────────────────────────────────────────────────────────

_ACTOR_ZILLOW     = "apify/zillow-com-scraper"
_ACTOR_RIGHTMOVE  = "dtrungtin/rightmove-scraper"
_ACTOR_SAHIBINDEN = "apify/sahibinden-scraper"
_ACTOR_IDEALISTA  = "apify/idealista-scraper"
_ACTOR_IMMOSCOUT  = "apify/immobilienscout24-scraper"

# ── Market labels ─────────────────────────────────────────────────────────────

_MARKET_LABELS: dict[str, str] = {
    _ACTOR_ZILLOW:     "US/Zillow",
    _ACTOR_RIGHTMOVE:  "UK/Rightmove",
    _ACTOR_SAHIBINDEN: "TR/Sahibinden",
    _ACTOR_IDEALISTA:  "ES/Idealista",
    _ACTOR_IMMOSCOUT:  "DE/ImmoScout",
}

# ── Default currencies per market ─────────────────────────────────────────────

_MARKET_CURRENCY: dict[str, str] = {
    _ACTOR_ZILLOW:     "USD",
    _ACTOR_RIGHTMOVE:  "GBP",
    _ACTOR_SAHIBINDEN: "TRY",
    _ACTOR_IDEALISTA:  "EUR",
    _ACTOR_IMMOSCOUT:  "EUR",
}


def _detect_market(queries: list[str]) -> str:
    """
    Identify the target real-estate market from query keyword matches.

    Precedence (first match wins):
      1. Turkish market  (TR keywords)
      2. UK market       (UK keywords)
      3. Spanish/Southern European market (ES keywords)
      4. German/DACH market (DE keywords)
      5. US / Zillow (default)

    Args:
        queries: Raw query strings as supplied to fetch().

    Returns:
        Apify actor ID string for the detected market.
    """
    combined = " ".join(queries).lower()
    if any(kw in combined for kw in _TR_KEYWORDS):
        return _ACTOR_SAHIBINDEN
    if any(kw in combined for kw in _UK_KEYWORDS):
        return _ACTOR_RIGHTMOVE
    if any(kw in combined for kw in _ES_KEYWORDS):
        return _ACTOR_IDEALISTA
    if any(kw in combined for kw in _DE_KEYWORDS):
        return _ACTOR_IMMOSCOUT
    return _ACTOR_ZILLOW


def _build_actor_input(actor: str, queries: list[str]) -> dict[str, Any]:
    """
    Build the Apify actor input dict for the detected market actor.

    Zillow uses search-URL inputs; all others use a plain text ``searchQuery``.

    Args:
        actor:   Apify actor ID selected by _detect_market().
        queries: Raw query strings.

    Returns:
        Dict suitable for posting as the actor's ``input`` body.
    """
    if actor == _ACTOR_ZILLOW:
        return {
            "searchUrls": [
                f"https://www.zillow.com/homes/{q.replace(' ', '-')}_rb/"
                for q in queries
            ],
            "maxItems": 20,
            "proxyConfiguration": {
                "useApifyProxy":    True,
                "apifyProxyGroups": ["RESIDENTIAL"],
            },
        }

    # All non-Zillow actors share a simpler query-based input schema
    return {
        "searchQuery":  queries[0] if queries else "",
        "maxItems":     20,
        "listingType":  "forRent",
        "proxyConfiguration": {
            "useApifyProxy":    True,
            "apifyProxyGroups": ["RESIDENTIAL"],
        },
    }


def _sqm_from_sqft(sqft: float | None) -> float | None:
    """Convert square feet to square metres, returning None if input is None."""
    if sqft is None:
        return None
    return round(sqft / _SQFT_TO_SQM, 2)


def _price_per_sqm(price_per_sqft: float | None) -> float | None:
    """Convert a per-square-foot price to per-square-metre."""
    if price_per_sqft is None:
        return None
    return round(price_per_sqft * _SQFT_TO_SQM, 2)


def _gross_yield(estimated_rent: float | None, price: float | None) -> float | None:
    """
    Compute gross rental yield percentage.

    Formula: estimated_rent × 12 / price × 100
    Returns None if either input is missing or price is zero.
    """
    if not estimated_rent or not price or price == 0:
        return None
    return round(estimated_rent * 12 / price * 100, 2)


def _investment_grade(gross_yield: float | None) -> str:
    """
    Classify a property's investment attractiveness based on gross yield.

    Grades:
      A — yield > 8%
      B — yield > 5%
      C — yield > 3%
      D — yield ≤ 3% or unknown
    """
    if gross_yield is None:
        return "D"
    if gross_yield > 8:
        return "A"
    if gross_yield > 5:
        return "B"
    if gross_yield > 3:
        return "C"
    return "D"


def _neighborhood_heat(days_on_market: int | None) -> str:
    """
    Classify local demand temperature from days-on-market.

    hot  — < 7 days (extremely competitive)
    warm — < 30 days (active market)
    cold — 30+ days (buyer's market)
    """
    if days_on_market is None:
        return "cold"
    if days_on_market < 7:
        return "hot"
    if days_on_market < 30:
        return "warm"
    return "cold"


def _is_distressed(price_cut_pct: float | None, days_on_market: int | None) -> bool:
    """
    Flag a listing as potentially distressed.

    Criterion: price has been cut by more than 10% AND the listing has been
    sitting on the market for over 60 days — both conditions must hold.
    """
    if price_cut_pct is None or days_on_market is None:
        return False
    return price_cut_pct > 10 and days_on_market > 60


class RealEstateConnector(AbstractDataConnector):
    """
    Multi-market real estate connector with automatic geographic routing.

    Covers US (Zillow), UK (Rightmove), Turkey (Sahibinden), Spain/Southern
    Europe (Idealista), and Germany/DACH (ImmoScout24) via dedicated Apify
    actors. Market selection is keyword-based and requires no configuration.

    The transform step produces investment-grade classifications, yield estimates,
    distressed-property flags, and neighbourhood heat signals on top of the
    standard listing fields.
    """

    meta = ConnectorMeta(
        connector_id="real-estate",
        domain="local_markets",
        rate_limit_rpm=10,
        fallback_ids=[],
    )

    ACTOR_ZILLOW     = _ACTOR_ZILLOW
    ACTOR_RIGHTMOVE  = _ACTOR_RIGHTMOVE
    ACTOR_SAHIBINDEN = _ACTOR_SAHIBINDEN
    ACTOR_IDEALISTA  = _ACTOR_IDEALISTA
    ACTOR_IMMOSCOUT  = _ACTOR_IMMOSCOUT

    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    # ── Public entry point ────────────────────────────────────────────────────

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Detect market from query keywords, select actor, fetch listings.

        Args:
            queries: Location search strings (e.g. "istanbul apartments",
                     "2 bed London", "berlin wohnung mieten").

        Returns:
            Raw listing dicts from the selected Apify actor's dataset, with
            "_actor" and "_market" keys injected for use in transform().
        """
        return await self._fetch_with_resilience(queries)

    # ── Resilience-wrapped internal fetcher ───────────────────────────────────

    @with_resilience(
        connector_id="real-estate",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Select actor by market, build input, POST run, GET dataset items.

        Args:
            queries: Location search strings.

        Returns:
            Parsed JSON list of raw listing dicts.

        Raises:
            ConnectorRateLimitError: HTTP 429 from Apify.
            ConnectorError:          Non-success actor launch response.
            ConnectorTimeoutError:   Non-success dataset fetch response.
        """
        actor       = _detect_market(queries)
        actor_input = _build_actor_input(actor, queries)
        market      = _MARKET_LABELS[actor]

        logger.info("real_estate_actor_selected", actor=actor, market=market, queries=queries)

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            # ── Step 1: Launch actor ────────────────────────────────────────
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=actor),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                json={"input": actor_input},
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message=f"Apify rate limit hit for Real Estate actor ({market}).",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=(
                        f"Apify Real Estate actor launch failed ({market}): "
                        f"HTTP {run_resp.status_code}"
                    ),
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message=f"Apify Real Estate response missing defaultDatasetId ({market}).",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset ───────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=(
                        f"Apify Real Estate dataset fetch failed ({market}): "
                        f"HTTP {dataset_resp.status_code}"
                    ),
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            # Inject routing metadata for use in transform()
            for item in items:
                item["_actor"]  = actor
                item["_market"] = market

            logger.info(
                "real_estate_fetch_done",
                actor=actor,
                market=market,
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify real estate output to enriched, normalised listing records.

        Handles the field-name divergence across Zillow, Rightmove, Sahibinden,
        Idealista, and ImmoScout24 by probing multiple candidate keys.

        Computed fields:
          - sqm               — living area in square metres
          - price_per_sqm     — price per m² (Zillow provides ft², converted here)
          - gross_yield_pct   — annualised gross rental yield
          - investment_grade  — A / B / C / D
          - neighborhood_heat — hot / warm / cold
          - is_distressed     — bool: price cut > 10% AND days on market > 60
          - market            — human-readable market label
          - currency          — detected from market if not present in raw record
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            actor   = item.get("_actor", _ACTOR_ZILLOW)
            market  = item.get("_market", "US/Zillow")
            address = item.get("address", {}) if isinstance(item.get("address"), dict) else {}

            # ── Core identity ───────────────────────────────────────────────
            listing_id    = item.get("zpid") or item.get("id") or item.get("listingId", "")
            property_name = item.get("streetAddress") or item.get("title") or item.get("address", "")
            listing_url   = item.get("hdpUrl") or item.get("url") or item.get("detailUrl", "")

            # ── Location ────────────────────────────────────────────────────
            city    = address.get("city") or item.get("city") or item.get("district", "")
            country = address.get("state") or item.get("country") or item.get("region", "")

            # ── Pricing ─────────────────────────────────────────────────────
            price: float | None = (
                item.get("price")
                or item.get("unformattedPrice")
                or item.get("salePrice")
                or item.get("rentPrice")
            )
            raw_currency: str = (
                item.get("currency")
                or _MARKET_CURRENCY.get(actor, "USD")
            )

            # Zillow gives pricePerSquareFoot (ft²) — convert to m²
            price_per_sqft: float | None = item.get("pricePerSquareFoot") or item.get("pricePerSqft")
            computed_price_per_sqm        = _price_per_sqm(price_per_sqft)

            # Non-Zillow actors may provide per-m² directly
            raw_price_per_sqm: float | None = item.get("pricePerSqm") or item.get("pricePerM2")
            price_per_sqm_final             = raw_price_per_sqm or computed_price_per_sqm

            # ── Size ────────────────────────────────────────────────────────
            sqft: float | None = item.get("livingArea") or item.get("sqft") or item.get("floorArea")
            sqm: float | None  = (
                item.get("sqm")
                or item.get("areaM2")
                or _sqm_from_sqft(sqft)
            )

            # ── Property attributes ─────────────────────────────────────────
            bedrooms      = item.get("beds") or item.get("bedrooms") or item.get("rooms")
            bathrooms     = item.get("baths") or item.get("bathrooms")
            property_type = item.get("homeType") or item.get("propertyType") or item.get("type", "")
            year_built    = item.get("yearBuilt") or item.get("constructionYear")

            # ── Listing status ──────────────────────────────────────────────
            listing_type  = str(item.get("listingType") or item.get("listingCategory") or "")
            is_for_rent   = (
                item.get("isRentalWithReducedLease", False)
                or "rent" in listing_type.lower()
                or "miete" in listing_type.lower()  # German
                or "kiralık" in listing_type.lower()  # Turkish
                or "alquiler" in listing_type.lower()  # Spanish
            )

            days_on_market: int | None = item.get("daysOnZillow") or item.get("daysOnMarket")

            # ── Price history ────────────────────────────────────────────────
            price_cut_raw: float | None = item.get("priceReduction") or item.get("priceReductionPct")
            # Normalise: some actors give a negative delta amount, not a percentage
            if price_cut_raw and price and price > 0 and price_cut_raw > 100:
                price_cut_pct: float | None = round(abs(price_cut_raw) / price * 100, 2)
            else:
                price_cut_pct = abs(price_cut_raw) if price_cut_raw else None

            # ── Rental yield ─────────────────────────────────────────────────
            estimated_rent: float | None = item.get("rentZestimate") or item.get("estimatedRent")
            gross_yield                   = _gross_yield(estimated_rent, price)

            # ── Images ──────────────────────────────────────────────────────
            photos     = item.get("photos") or []
            first_photo = photos[0] if isinstance(photos, list) and photos else ""
            if isinstance(first_photo, dict):
                first_photo = first_photo.get("url", "")
            image_url = item.get("imgSrc") or item.get("imageUrl") or str(first_photo)

            remapped.append({
                # Identity
                "listing_id":        str(listing_id),
                "property_name":     str(property_name),
                "listing_url":       listing_url,
                # Location
                "city":              city,
                "country":           country,
                "market":            market,
                # Pricing
                "price":             price,
                "currency":          raw_currency,
                "price_per_sqm":     price_per_sqm_final,
                # Size
                "bedrooms":          bedrooms,
                "bathrooms":         bathrooms,
                "sqft":              sqft,
                "sqm":               sqm,
                # Property
                "property_type":     property_type,
                "is_for_rent":       is_for_rent,
                "year_built":        year_built,
                "description":       (item.get("description") or "")[:300],
                "image_url":         image_url,
                # Market timing
                "days_on_market":    days_on_market,
                "price_cut_pct":     price_cut_pct,
                "hoa_fee_monthly":   item.get("monthlyHoaFee") or item.get("hoaFee"),
                # Investment signals
                "estimated_rent":    estimated_rent,
                "gross_yield_pct":   gross_yield,
                "investment_grade":  _investment_grade(gross_yield),
                "neighborhood_heat": _neighborhood_heat(days_on_market),
                "is_distressed":     _is_distressed(price_cut_pct, days_on_market),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
