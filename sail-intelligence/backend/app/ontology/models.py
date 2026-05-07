"""
app/ontology/models.py

Unified domain models for Sail Intelligence.

Design philosophy (inspired by Palantir Foundry object-type graph):
  - Every ingested record is normalised into one of these models BEFORE storage.
  - Models are source-agnostic: an Amazon "Seller" and a TikTok "Creator" both
    resolve to MarketEntity, differing only in `entity_type` and `attributes`.
  - All monetary values are stored as floats with an explicit `currency` field.
  - `source_connector` preserves provenance for audit and re-normalisation.

Hierarchy:
    MarketEntity     — who (brand, seller, creator, property owner…)
    PricePoint       — what it costs (product, rent, ad CPM…)
    AdAsset          — ad creative with performance signals
    TrendSignal      — time-series observation (BSR, playlist velocity, virality…)
    EntityLink       — cross-platform identity resolution edge
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enumerations ──────────────────────────────────────────────────────────────

class EntityType(str, Enum):
    BRAND           = "brand"
    SELLER          = "seller"
    CREATOR         = "creator"
    PROPERTY        = "property"
    VEHICLE         = "vehicle"
    UNKNOWN         = "unknown"


class PriceType(str, Enum):
    PRODUCT         = "product"       # retail / wholesale unit price
    RENT_MONTHLY    = "rent_monthly"  # real estate monthly rent
    RENT_PER_SQM    = "rent_per_sqm"  # price per m²
    AD_CPM          = "ad_cpm"        # ad cost per mille impressions
    AD_CPC          = "ad_cpc"        # ad cost per click
    ARBITRAGE       = "arbitrage"     # sourcing vs retail delta
    UNKNOWN         = "unknown"


class Platform(str, Enum):
    AMAZON          = "amazon"
    EBAY            = "ebay"
    ALIBABA         = "alibaba"
    TIKTOK          = "tiktok"
    YOUTUBE         = "youtube"
    META            = "meta"
    SPOTIFY         = "spotify"
    REAL_ESTATE     = "real_estate"
    AUTOMOTIVE      = "automotive"
    UNKNOWN         = "unknown"


# ── Base ──────────────────────────────────────────────────────────────────────

class OntologyBase(BaseModel):
    """Shared fields on every domain model."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    source_connector: str              # connector_id that produced this record
    platform: Platform = Platform.UNKNOWN
    ingested_at: datetime = Field(default_factory=datetime.utcnow)
    raw_id: str = ""                   # original ID in source system
    attributes: dict[str, Any] = Field(default_factory=dict)   # escape hatch for extra fields

    class Config:
        use_enum_values = True


# ── MarketEntity ──────────────────────────────────────────────────────────────

class MarketEntity(OntologyBase):
    """
    Who — a market participant identifiable across one or more platforms.

    Examples:
        Amazon seller  → entity_type=SELLER,  name="TechGadgetsCo"
        TikTok creator → entity_type=CREATOR, name="@gadget_guru"
        Property       → entity_type=PROPERTY, name="Maslak Plaza Office 4B"
    """
    entity_type: EntityType = EntityType.UNKNOWN
    name: str
    description: str = ""
    url: str = ""
    location: str = ""                 # free-text: city, region, country
    country_code: str = ""             # ISO 3166-1 alpha-2
    verified: bool = False
    trust_index: float = Field(default=0.5, ge=0.0, le=1.0)

    # Cross-platform identity — populated by Entity Resolution Agent
    canonical_id: str | None = None    # stable ID after cross-platform resolution
    linked_entity_ids: list[str] = Field(default_factory=list)


# ── PricePoint ────────────────────────────────────────────────────────────────

class PricePoint(OntologyBase):
    """
    What something costs at a specific point in time.

    `entity_id` links back to a MarketEntity (seller / property / etc.).
    """
    entity_id: str                     # FK → MarketEntity.id
    price_type: PriceType = PriceType.UNKNOWN
    amount: float = Field(..., ge=0.0)
    currency: str = "USD"              # ISO 4217
    amount_usd: float | None = None    # filled by normaliser if FX rate available

    # Context
    product_name: str = ""
    sku: str = ""
    unit: str = ""                     # "per item" | "per m²" | "per month" | …
    is_sale_price: bool = False
    stock_depth: int | None = None     # units available (e-commerce)
    best_seller_rank: int | None = None   # Amazon BSR

    # Temporal
    observed_at: datetime = Field(default_factory=datetime.utcnow)
    valid_until: datetime | None = None
    ad_lifespan_days: int | None = None   # real estate: how long listing was active

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, v: str) -> str:
        return v.upper()


# ── AdAsset ───────────────────────────────────────────────────────────────────

class AdAsset(OntologyBase):
    """
    An advertising creative with copy, targeting, and performance signals.
    Sourced from Meta Ads Library, TikTok, YouTube.
    """
    entity_id: str                     # FK → MarketEntity.id (advertiser)
    platform: Platform

    # Creative
    headline: str = ""
    body_copy: str = ""
    call_to_action: str = ""
    media_type: str = ""               # "image" | "video" | "carousel"
    media_url: str = ""

    # Performance signals (if available)
    estimated_reach: int | None = None
    engagement_rate: float | None = None
    virality_score: float | None = None   # 0–1, normalised by Trend Agent

    # Psychographic signals — filled by NLP Psychographic Agent
    target_archetype: str = ""
    emotional_triggers: list[str] = Field(default_factory=list)
    unmet_need: str = ""
    sentiment: float | None = None     # -1.0 (negative) → 1.0 (positive)

    started_at: datetime | None = None
    ended_at:   datetime | None = None
    is_active: bool = True


# ── TrendSignal ───────────────────────────────────────────────────────────────

class TrendSignal(OntologyBase):
    """
    A time-series observation — the atomic unit for the Predictive Signal Agent.

    Examples:
        BSR rank drop for a product → metric="bsr", value=1234
        Playlist velocity spike     → metric="playlist_adds_24h", value=5800
        Price drop event            → metric="price_delta_pct", value=-12.5
    """
    entity_id: str                     # FK → MarketEntity.id
    metric: str                        # snake_case metric name
    value: float
    unit: str = ""                     # "rank" | "%" | "count" | "USD" | …
    observed_at: datetime = Field(default_factory=datetime.utcnow)

    # Statistical context — filled by Predictive Signal Agent
    baseline: float | None = None      # rolling average for anomaly detection
    sigma_deviation: float | None = None  # how many σ from baseline
    is_anomaly: bool = False


# ── EntityLink ────────────────────────────────────────────────────────────────

class EntityLink(OntologyBase):
    """
    Cross-platform identity resolution edge — produced by Entity Resolution Agent.

    Connects two MarketEntity records that are believed to represent the same
    real-world actor (e.g., Shopify storefront + Meta Ads account).
    """
    source_entity_id: str
    target_entity_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list)  # reasons / signals used
    resolved_by: str = "entity_resolution_agent"

    @model_validator(mode="after")
    def source_target_differ(self) -> "EntityLink":
        if self.source_entity_id == self.target_entity_id:
            raise ValueError("source_entity_id and target_entity_id must differ.")
        return self
