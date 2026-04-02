"""
IntentClassifier — pure Python NL extraction.
Zero LLM involvement. Regex + keyword matching only.
"""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, field_validator


class BusinessContext(BaseModel):
    business_type: str
    intent_category: str
    audience: Optional[str] = None
    current_revenue: Optional[float] = None
    follower_count: Optional[int] = None
    client_count: Optional[int] = None
    price_point: Optional[float] = None
    time_horizon: str = "90_days"
    raw_question: str
    confidence_score: float = 0.50

    @field_validator("confidence_score")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.40, min(0.98, v))


class IntentClassifier:
    # ── Business type keyword groups ──────────────────────────────────
    _BIZ_KEYWORDS: dict[str, list[str]] = {
        "fitness_trainer": [
            "personal trainer", "fitness", "gym", "coach", "workout",
            "pt ", "personal training", "strength coach", "nutrition coach",
            "bootcamp", "hiit",
        ],
        "content_creator": [
            "tiktok", "instagram", "youtube", "content", "creator",
            "followers", "influencer", "reel", "shorts", "podcast",
            "newsletter", "substack",
        ],
        "ecommerce": [
            "store", "shopify", "ecommerce", "e-commerce", "product",
            "shop", "sell online", "dropship", "inventory", "amazon",
            "etsy", "woocommerce",
        ],
        "b2b_agency": [
            "agency", "b2b", "clients", "retainer", "consultant",
            "freelance", "service business", "proposal", "sow",
            "enterprise", "smb", "outreach",
        ],
        "saas": [
            "saas", "software", "app", "subscription", "mrr", "arr",
            "churn", "trial", "freemium", "product-led", "api",
            "dashboard", "platform",
        ],
    }

    # ── Intent category keyword groups ────────────────────────────────
    _INTENT_KEYWORDS: dict[str, list[str]] = {
        "growth": [
            "grow", "scale", "more customers", "more clients", "expand",
            "increase revenue", "get more", "acquire",
        ],
        "monetisation": [
            "monetise", "monetize", "make money", "revenue stream",
            "income", "earn", "profit", "cash",
        ],
        "retention": [
            "keep", "retain", "churn", "loyalty", "repeat", "return",
            "engagement", "lifetime",
        ],
        "pricing": [
            "price", "pricing", "charge", "raise price", "discount",
            "package", "tier", "value",
        ],
        "acquisition": [
            "leads", "pipeline", "outreach", "cold email", "ads",
            "marketing", "funnel", "conversion",
        ],
        "cost_reduction": [
            "cut cost", "reduce cost", "save money", "overhead",
            "expense", "burn rate", "margin",
        ],
    }

    # ── Time horizon keywords ─────────────────────────────────────────
    _TIME_KEYWORDS: dict[str, list[str]] = {
        "immediate": ["today", "this week", "asap", "right now", "immediately"],
        "90_days": ["90 days", "3 months", "quarter", "next quarter"],
        "1_year": ["year", "12 months", "annual", "long term"],
    }

    def classify(self, text: str) -> BusinessContext:
        tl = text.lower()

        business_type = self._detect_business_type(tl)
        intent_category = self._detect_intent(tl)
        time_horizon = self._detect_time_horizon(tl)
        audience = self._detect_audience(tl)

        current_revenue = self._extract_revenue(tl)
        follower_count = self._extract_followers(tl)
        client_count = self._extract_clients(tl)
        price_point = self._extract_price(tl)

        # ── Confidence scoring ────────────────────────────────────────
        base = 0.55
        if current_revenue is not None:
            base += 0.15
        if follower_count is not None:
            base += 0.10
        if client_count is not None:
            base += 0.10
        if price_point is not None:
            base += 0.05

        return BusinessContext(
            business_type=business_type,
            intent_category=intent_category,
            audience=audience,
            current_revenue=current_revenue,
            follower_count=follower_count,
            client_count=client_count,
            price_point=price_point,
            time_horizon=time_horizon,
            raw_question=text,
            confidence_score=base,
        )

    # ── Detection helpers ─────────────────────────────────────────────

    def _detect_business_type(self, tl: str) -> str:
        for btype, keywords in self._BIZ_KEYWORDS.items():
            if any(kw in tl for kw in keywords):
                return btype
        return "general_business"

    def _detect_intent(self, tl: str) -> str:
        scores: dict[str, int] = {}
        for category, keywords in self._INTENT_KEYWORDS.items():
            scores[category] = sum(1 for kw in keywords if kw in tl)
        best = max(scores, key=lambda k: scores[k])
        return best if scores[best] > 0 else "growth"

    def _detect_time_horizon(self, tl: str) -> str:
        for horizon, keywords in self._TIME_KEYWORDS.items():
            if any(kw in tl for kw in keywords):
                return horizon
        return "90_days"

    def _detect_audience(self, tl: str) -> Optional[str]:
        audiences = {
            "women": ["women", "female", "ladies", "moms", "mothers"],
            "men": ["men", "male", "guys", "dads", "fathers"],
            "entrepreneurs": ["entrepreneurs", "founders", "startups", "business owners"],
            "professionals": ["professionals", "executives", "managers", "corporate"],
            "students": ["students", "college", "university", "graduates"],
        }
        for audience, keywords in audiences.items():
            if any(kw in tl for kw in keywords):
                return audience
        return None

    def _extract_revenue(self, tl: str) -> Optional[float]:
        patterns = [
            r'\$\s*([\d,]+(?:\.\d+)?)\s*(?:k|K)?(?:\s*(?:per|a|/)\s*(?:month|mo|year|yr))?',
            r'([\d,]+(?:\.\d+)?)\s*(?:k|K)?\s*(?:dollar|revenue|mrr|arr|income)',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, tl)
            if matches:
                raw = matches[0].replace(",", "")
                val = float(raw)
                # Handle "k" multiplier in context
                if re.search(r'\$\s*[\d,]+\s*k', tl):
                    val *= 1000
                return val if val > 0 else None
        return None

    def _extract_followers(self, tl: str) -> Optional[int]:
        patterns = [
            r'([\d,]+(?:\.\d+)?)\s*(?:k|K)?\s*(?:followers?|subs?|subscribers?|fans?)',
            r'([\d,]+)\s*(?:people\s+follow|audience)',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, tl)
            if matches:
                raw = matches[0].replace(",", "")
                val = float(raw)
                # Check for k/K suffix nearby
                if re.search(r'[\d,]+\s*[kK]\s*(?:followers?|subs?)', tl):
                    val *= 1000
                return int(val) if val > 0 else None
        return None

    def _extract_clients(self, tl: str) -> Optional[int]:
        patterns = [
            r'([\d]+)\s*(?:paying\s+)?(?:clients?|customers?|students?|members?)',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, tl)
            if matches:
                val = int(matches[0])
                return val if val > 0 else None
        return None

    def _extract_price(self, tl: str) -> Optional[float]:
        patterns = [
            r'\$\s*([\d,]+(?:\.\d+)?)\s*(?:per\s+)?(?:session|month|mo\b|hour|hr\b|class|call)',
            r'([\d,]+(?:\.\d+)?)\s*(?:£|€)\s*(?:per\s+)?(?:session|month|hour)',
            r'(?:charge|price[ds]?|cost[s]?)\s*\$?\s*([\d,]+(?:\.\d+)?)',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, tl)
            if matches:
                raw = matches[0].replace(",", "")
                val = float(raw)
                return val if 1 < val < 100000 else None
        return None
