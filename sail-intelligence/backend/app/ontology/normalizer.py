"""
app/ontology/normalizer.py

Source-agnostic normaliser: raw connector dicts → unified domain models.

The normaliser does NOT know about individual connector schemas.
Instead, it uses a field-mapping registry — each connector registers its
own field-map on startup, and normalise_records() uses it to rewrite keys
before constructing the Pydantic model.

Design:
  - Zero string-parsing magic. Connectors own their own transform() if they
    need custom logic; this is the default path for simple field renaming.
  - All monetary amounts are preserved as-is; FX conversion happens downstream
    in the Financial Forensics Agent.
  - Unknown / unmapped fields are stored in `attributes` for traceability.
"""

from __future__ import annotations

from typing import Any

import structlog

from app.ontology.models import MarketEntity, EntityType, Platform
from app.core.exceptions import OntologyValidationError

logger = structlog.get_logger(__name__)


# ── Field-map registry ────────────────────────────────────────────────────────
#
# Maps connector_id → {source_field: target_field}.
# Target fields must match MarketEntity attribute names.
# Fields NOT in the map are stored in `attributes`.

_FIELD_MAPS: dict[str, dict[str, str]] = {
    "amazon-product-price": {
        "asin":          "raw_id",
        "seller_name":   "name",
        "item_url":      "url",
        "brand":         "description",
        "marketplace":   "location",
    },
    "ebay-product-price": {
        "item_id":       "raw_id",
        "title":         "name",
        "listing_url":   "url",
        "seller":        "description",
    },
    "alibaba-product-price": {
        "product_id":    "raw_id",
        "company_name":  "name",
        "product_url":   "url",
        "country":       "country_code",
    },
    "real-estate": {
        "listing_id":    "raw_id",
        "property_name": "name",
        "listing_url":   "url",
        "city":          "location",
        "country":       "country_code",
    },
    "automotive": {
        "ad_id":         "raw_id",
        "make_model":    "name",
        "ad_url":        "url",
        "city":          "location",
    },
    "tiktok-ads": {
        "ad_id":         "raw_id",
        "brand_name":    "name",
        "profile_url":   "url",
        "region":        "location",
    },
    "youtube-ads": {
        "channel_id":    "raw_id",
        "channel_name":  "name",
        "channel_url":   "url",
    },
    "meta-ads": {
        "page_id":       "raw_id",
        "page_name":     "name",
        "page_url":      "url",
        "country":       "country_code",
    },
    "spotify-creator": {
        "artist_id":     "raw_id",
        "artist_name":   "name",
        "profile_url":   "url",
        "country":       "country_code",
    },
}

# Platform inference from connector_id prefix
_PLATFORM_MAP: dict[str, Platform] = {
    "amazon":       Platform.AMAZON,
    "ebay":         Platform.EBAY,
    "alibaba":      Platform.ALIBABA,
    "tiktok":       Platform.TIKTOK,
    "youtube":      Platform.YOUTUBE,
    "meta":         Platform.META,
    "spotify":      Platform.SPOTIFY,
    "real-estate":  Platform.REAL_ESTATE,
    "automotive":   Platform.AUTOMOTIVE,
}

# Entity-type inference from connector_id
_ENTITY_TYPE_MAP: dict[str, EntityType] = {
    "amazon":       EntityType.SELLER,
    "ebay":         EntityType.SELLER,
    "alibaba":      EntityType.BRAND,
    "tiktok":       EntityType.CREATOR,
    "youtube":      EntityType.CREATOR,
    "meta":         EntityType.BRAND,
    "spotify":      EntityType.CREATOR,
    "real-estate":  EntityType.PROPERTY,
    "automotive":   EntityType.VEHICLE,
}


def register_field_map(connector_id: str, field_map: dict[str, str]) -> None:
    """Allow connectors to register their own field maps at startup."""
    _FIELD_MAPS[connector_id] = field_map
    logger.debug("field_map_registered", connector_id=connector_id)


def _infer_platform(connector_id: str) -> Platform:
    for prefix, platform in _PLATFORM_MAP.items():
        if connector_id.startswith(prefix):
            return platform
    return Platform.UNKNOWN


def _infer_entity_type(connector_id: str) -> EntityType:
    for prefix, etype in _ENTITY_TYPE_MAP.items():
        if connector_id.startswith(prefix):
            return etype
    return EntityType.UNKNOWN


def _remap(raw: dict[str, Any], field_map: dict[str, str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Apply field_map to `raw`.
    Returns (mapped_fields, unmapped_fields).
    unmapped_fields → stored in attributes.
    """
    mapped:   dict[str, Any] = {}
    unmapped: dict[str, Any] = {}
    mapped_source_keys = set(field_map.keys())

    for k, v in raw.items():
        if k in mapped_source_keys:
            mapped[field_map[k]] = v
        else:
            unmapped[k] = v

    return mapped, unmapped


def normalise_record(
    raw: dict[str, Any],
    source_connector: str,
) -> MarketEntity:
    """
    Normalise a single raw connector dict to a MarketEntity.

    Raises:
        OntologyValidationError — if Pydantic validation fails.
    """
    field_map = _FIELD_MAPS.get(source_connector, {})
    mapped, unmapped = _remap(raw, field_map)

    # Ensure required `name` field has a fallback
    if "name" not in mapped:
        mapped["name"] = raw.get("title") or raw.get("name") or f"[{source_connector}:{raw.get('id', '?')}]"

    try:
        entity = MarketEntity(
            source_connector=source_connector,
            platform=_infer_platform(source_connector),
            entity_type=_infer_entity_type(source_connector),
            attributes=unmapped,
            **mapped,
        )
        return entity
    except Exception as exc:
        raise OntologyValidationError(
            message=f"Normalisation failed for record from '{source_connector}': {exc}",
            source=source_connector,
            detail={"raw_keys": list(raw.keys()), "error": str(exc)},
        ) from exc


def normalise_records(
    raws: list[dict[str, Any]],
    source_connector: str,
) -> list[MarketEntity]:
    """
    Normalise a batch of raw records.

    Invalid records are logged and skipped — a single bad record must not
    abort the entire batch.  Returns only valid MarketEntity objects.
    """
    entities: list[MarketEntity] = []
    skipped = 0

    for raw in raws:
        try:
            entities.append(normalise_record(raw, source_connector))
        except OntologyValidationError as exc:
            skipped += 1
            logger.warning(
                "ontology_normalisation_skipped",
                source_connector=source_connector,
                error=exc.message,
            )

    if skipped:
        logger.warning(
            "ontology_batch_partial",
            source_connector=source_connector,
            total=len(raws),
            valid=len(entities),
            skipped=skipped,
        )

    return entities
