"""
app/connectors/social/meta.py

Full-stack Meta (Facebook + Instagram + Messenger) Ads intelligence connector.

Two Apify actors are run in parallel and their results merged:
  PRIMARY:   apify/facebook-ads-scraper  — Meta Ad Library (paid ads)
  SECONDARY: apify/facebook-pages-scraper — Brand page organic posts

Rich transform step computes:
  - funnel_stage          (conversion / consideration / awareness)
  - creative_format       (single_image / video / carousel / collection)
  - ab_test_group         (likely_ab_test if same page has 3+ ads with same CTA)
  - psychographic_triggers (urgency / social_proof / scarcity / authority)
  - spend_estimate_usd    (estimated from reach × avg CPM $5)

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback: none (terminal social connector)
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger   = structlog.get_logger(__name__)
settings = get_settings()

# ── CTA funnel mapping ────────────────────────────────────────────────────────

_CONVERSION_CTAS  = {"SHOP_NOW", "BUY_NOW", "ORDER_NOW", "ADD_TO_CART", "GET_OFFER"}
_CONSIDERATION_CTAS = {"LEARN_MORE", "SIGN_UP", "SUBSCRIBE", "WATCH_MORE", "GET_QUOTE", "BOOK_NOW"}

# ── Ad-type → creative format mapping ────────────────────────────────────────

_AD_TYPE_FORMAT: dict[str, str] = {
    "IMAGE":      "single_image",
    "PHOTO":      "single_image",
    "VIDEO":      "video",
    "CAROUSEL":   "carousel",
    "COLLECTION": "collection",
    "DYNAMIC":    "dynamic",
}

# ── Psychographic trigger keyword sets ───────────────────────────────────────

_URGENCY_WORDS   = {"limited", "today only", "ending soon", "last chance", "hurry", "expires", "24 hours"}
_SOCIAL_WORDS    = {"reviews", "customers", "people love", "bestseller", "popular", "community", "join"}
_SCARCITY_WORDS  = {"only", "left", "few", "sold out", "almost gone", "stock", "exclusive"}
_AUTHORITY_WORDS = {"expert", "#1", "number one", "award", "proven", "certified", "doctor", "scientist"}


def _detect_psychographic_triggers(text: str) -> list[str]:
    """
    Scan ad body text for common psychographic trigger patterns.

    Returns a deduplicated list of detected trigger labels:
        "urgency", "social_proof", "scarcity", "authority"
    """
    lower   = text.lower()
    triggers: list[str] = []
    if any(w in lower for w in _URGENCY_WORDS):
        triggers.append("urgency")
    if any(w in lower for w in _SOCIAL_WORDS):
        triggers.append("social_proof")
    if any(w in lower for w in _SCARCITY_WORDS):
        triggers.append("scarcity")
    if any(w in lower for w in _AUTHORITY_WORDS):
        triggers.append("authority")
    return triggers


def _funnel_stage(cta: str) -> str:
    """Map a CTA type string to a funnel stage label."""
    if cta in _CONVERSION_CTAS:
        return "conversion"
    if cta in _CONSIDERATION_CTAS:
        return "consideration"
    return "awareness"


def _creative_format(ad_type: str) -> str:
    """Normalise Apify adType strings to canonical creative format labels."""
    return _AD_TYPE_FORMAT.get(ad_type.upper(), "unknown")


def _spend_estimate(reach_lower: int | None, reach_upper: int | None) -> float | None:
    """
    Estimate spend in USD using midpoint reach and a $5 CPM assumption.

    Formula: (reach_lower + reach_upper) / 2 / 1000 * 5
    """
    if reach_lower is None and reach_upper is None:
        return None
    lower = reach_lower or 0
    upper = reach_upper or lower
    midpoint = (lower + upper) / 2
    return round(midpoint / 1000 * 5, 2)


class MetaAdsConnector(AbstractDataConnector):
    """
    Meta platform connector — Facebook Ad Library + Facebook Pages.

    Runs two Apify actors concurrently:
      1. ``facebook-ads-scraper``  — paid ads with targeting, reach, and CTA data.
      2. ``facebook-pages-scraper`` — organic brand-page posts for share-of-voice context.

    Results are merged, deduplicated by ``adArchiveId``, then enriched with
    computed marketing intelligence signals in ``transform()``.
    """

    meta = ConnectorMeta(
        connector_id="meta-ads",
        domain="social",
        rate_limit_rpm=500,
        fallback_ids=[],
    )

    APIFY_ACTOR_ADS    = "apify/facebook-ads-scraper"
    APIFY_ACTOR_PAGES  = "apify/facebook-pages-scraper"
    APIFY_RUN_URL      = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL  = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    # ── Public entry point ────────────────────────────────────────────────────

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Run ads scraper and pages scraper concurrently, then merge results.

        Args:
            queries: Search terms forwarded to both actors.

        Returns:
            Merged list of raw ad and page-post dicts.
        """
        ads_task   = self._fetch_ads(queries)
        pages_task = self._fetch_pages(queries)

        ads_items, pages_items = await asyncio.gather(
            ads_task,
            pages_task,
            return_exceptions=True,
        )

        combined: list[dict[str, Any]] = []

        if isinstance(ads_items, list):
            combined.extend(ads_items)
        else:
            logger.warning(
                "meta_ads_actor_failed",
                error=str(ads_items),
            )

        if isinstance(pages_items, list):
            # Tag page posts so transform() can distinguish them
            for post in pages_items:
                post["_source"] = "page_post"
            combined.extend(pages_items)
        else:
            logger.warning(
                "meta_pages_actor_failed",
                error=str(pages_items),
            )

        logger.info(
            "meta_fetch_done",
            queries=len(queries),
            total_items=len(combined),
        )
        return combined

    # ── Ads actor ─────────────────────────────────────────────────────────────

    @with_resilience(
        connector_id="meta-ads",
        max_attempts=10,
        base_wait_secs=1.0,
        max_wait_secs=120.0,
    )
    async def _fetch_ads(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Launch apify/facebook-ads-scraper and return raw items.

        Actor input targets the Meta Ad Library across all four platforms
        (Facebook, Instagram, Messenger, Audience Network) for the US market.
        """
        actor_input: dict[str, Any] = {
            "searchTerms": queries,
            "maxAds":      1000,
            "country":     "US",
            "adType":      "ALL",
            "platform":    ["facebook", "instagram", "messenger", "audience_network"],
            "proxyConfiguration": {
                "useApifyProxy":      True,
                "apifyProxyGroups":   ["RESIDENTIAL"],
            },
        }
        return await self._run_actor(self.APIFY_ACTOR_ADS, actor_input, label="ads")

    # ── Pages actor ───────────────────────────────────────────────────────────

    @with_resilience(
        connector_id="meta-ads",
        max_attempts=10,
        base_wait_secs=1.0,
        max_wait_secs=120.0,
    )
    async def _fetch_pages(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Launch apify/facebook-pages-scraper and return raw items.

        Targets brand page organic posts for the first query term.
        """
        actor_input: dict[str, Any] = {
            "startUrls":   [],
            "maxPosts":    10,
            "searchQuery": queries[0] if queries else "",
        }
        return await self._run_actor(self.APIFY_ACTOR_PAGES, actor_input, label="pages")

    # ── Shared Apify runner ───────────────────────────────────────────────────

    async def _run_actor(
        self,
        actor: str,
        actor_input: dict[str, Any],
        label: str,
    ) -> list[dict[str, Any]]:
        """
        POST to actor run endpoint, then GET the resulting dataset items.

        Args:
            actor:       Apify actor ID (e.g. "apify/facebook-ads-scraper").
            actor_input: Dict sent as the actor's ``input`` body.
            label:       Short string used in log messages for disambiguation.

        Returns:
            Parsed JSON list from the actor's output dataset.

        Raises:
            ConnectorRateLimitError: HTTP 429 from Apify.
            ConnectorError:          Any other non-success launch response.
            ConnectorTimeoutError:   Non-success dataset fetch response.
        """
        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=actor),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                json={"input": actor_input},
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message=f"Apify rate limit hit for Meta {label} actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Meta {label} actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message=f"Apify Meta {label} response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Meta {label} dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(f"meta_{label}_actor_done", items=len(items))
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Enrich raw Meta ad / page-post records with marketing intelligence signals.

        Per-record computed fields:
          - spend_estimate_usd      — midpoint reach × $5 CPM
          - funnel_stage            — conversion / consideration / awareness
          - creative_format         — single_image / video / carousel / collection
          - ab_test_group           — "likely_ab_test" if page has 3+ ads with same CTA
          - psychographic_triggers  — urgency, social_proof, scarcity, authority
          - demographic_targeting   — merged gender + age targeting string
        """
        # ── A/B test detection: group ads by (page_id, cta) ─────────────────
        # Any page that has 3+ active ads sharing the same CTA is flagged as
        # likely running an A/B creative test.
        page_cta_count: dict[tuple[str, str], int] = defaultdict(int)
        for item in raw:
            page      = item.get("page", {})
            page_id   = str(item.get("adArchiveId") or page.get("id", ""))
            cta       = item.get("callToActionType", "")
            page_cta_count[(page_id, cta)] += 1

        remapped: list[dict[str, Any]] = []

        for item in raw:
            page        = item.get("page", {}) if isinstance(item.get("page"), dict) else {}
            page_id     = str(item.get("adArchiveId") or page.get("id", ""))
            page_name   = page.get("name", "")
            page_url    = page.get("url") or f"https://facebook.com/{page.get('id', '')}"
            cta         = item.get("callToActionType", "")
            ad_type     = item.get("adType", "")
            body_text   = item.get("bodyText") or item.get("text") or ""

            # ── Reach / audience size ───────────────────────────────────────
            audience    = item.get("estimatedAudienceSize") or {}
            reach_lower = audience.get("lower") if isinstance(audience, dict) else None
            reach_upper = audience.get("upper") if isinstance(audience, dict) else None

            # ── Publisher platforms ─────────────────────────────────────────
            pub_platform = item.get("publisherPlatform")
            if isinstance(pub_platform, list):
                platforms_shown_on = pub_platform
            elif isinstance(pub_platform, str):
                platforms_shown_on = [pub_platform]
            else:
                platforms_shown_on = []

            # ── Demographic targeting ────────────────────────────────────────
            gender_targeting = item.get("genderTargeting") or item.get("gender", "")
            age_targeting    = item.get("ageTargeting") or item.get("ageRange", "")
            demographic_targeting = " | ".join(
                filter(None, [str(gender_targeting), str(age_targeting)])
            ) or None

            # ── A/B test detection ───────────────────────────────────────────
            ab_test_group = (
                "likely_ab_test"
                if page_cta_count.get((page_id, cta), 0) >= 3
                else "standalone"
            )

            remapped.append({
                # Identity
                "page_id":                page_id,
                "page_name":              page_name,
                "page_url":               page_url,
                "country":                item.get("country", "US"),
                # Creative content
                "ad_text":                body_text[:500],
                "headline":               item.get("headline") or item.get("title", ""),
                "description":            item.get("description") or item.get("linkDescription", ""),
                "call_to_action":         cta,
                "media_type":             ad_type,
                "media_url":              item.get("mediaUrl") or item.get("videoUrl") or item.get("imageUrl", ""),
                # Scheduling
                "started_at":             item.get("startDate") or item.get("startedAt"),
                "ended_at":               item.get("endDate") or item.get("endedAt"),
                "is_active":              item.get("isActive", True),
                # Distribution
                "platforms_shown_on":     platforms_shown_on,
                # Reach
                "estimated_reach_lower":  reach_lower,
                "estimated_reach_upper":  reach_upper,
                # Targeting
                "demographic_targeting":  demographic_targeting,
                # Computed signals
                "spend_estimate_usd":     _spend_estimate(reach_lower, reach_upper),
                "funnel_stage":           _funnel_stage(cta),
                "creative_format":        _creative_format(ad_type),
                "ab_test_group":          ab_test_group,
                "psychographic_triggers": _detect_psychographic_triggers(body_text),
                # Source tag (ads vs organic page post)
                "_source":                item.get("_source", "ad"),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
