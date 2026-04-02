"""
MetricsEngine — all arithmetic here, zero LLM involvement.
Claude receives these numbers verbatim.
"""

from __future__ import annotations

from typing import Any

from .intent_classifier import BusinessContext

BENCHMARK_TABLES: dict[str, dict[str, Any]] = {
    "fitness_trainer": {
        "avg_session_price": 75,
        "monthly_session_freq": 8,
        "online_conversion_rate": 0.03,
        "ltv_multiplier": 4.5,
        "upsell_multiplier": 1.4,
        "industry_churn_monthly_pct": 12,
        "avg_group_class_price": 25,
        "online_programme_price": 197,
    },
    "content_creator": {
        "sponsorship_cpm": 30,
        "merch_conversion": 0.012,
        "course_conversion": 0.025,
        "avg_course_price": 197,
        "avg_coaching_price": 500,
        "membership_price": 27,
        "email_open_rate": 0.28,
        "affiliate_commission_pct": 0.08,
    },
    "ecommerce": {
        "avg_conversion_rate": 0.027,
        "cart_abandonment": 0.70,
        "email_recovery_rate": 0.15,
        "repeat_purchase_rate": 0.28,
        "avg_order_value": 65,
        "gross_margin_pct": 0.45,
        "customer_acquisition_cost": 38,
        "email_revenue_pct_of_total": 0.30,
    },
    "b2b_agency": {
        "avg_retainer_usd": 2500,
        "close_rate_cold": 0.05,
        "close_rate_referral": 0.25,
        "payback_period_months": 2,
        "avg_project_usd": 8500,
        "churn_annual_pct": 0.20,
        "ltv_months": 18,
        "sales_cycle_days": 45,
    },
    "saas": {
        "free_to_paid_rate": 0.04,
        "monthly_churn_rate": 0.05,
        "expansion_revenue_pct": 0.20,
        "avg_arpu_usd": 89,
        "cac_payback_months": 12,
        "nrr_benchmark": 1.10,
        "trial_conversion_rate": 0.18,
        "support_ticket_per_user": 0.3,
    },
    "general_business": {
        "avg_conversion_rate": 0.025,
        "customer_ltv_multiplier": 3.0,
        "referral_rate": 0.15,
        "repeat_purchase_rate": 0.25,
        "avg_transaction_value": 150,
        "marketing_roi_benchmark": 3.0,
    },
}


class MetricsEngine:
    def compute(self, ctx: BusinessContext) -> dict[str, Any]:
        bm = BENCHMARK_TABLES.get(ctx.business_type, BENCHMARK_TABLES["general_business"])
        m: dict[str, Any] = {}

        if ctx.business_type == "fitness_trainer":
            m = self._fitness(ctx, bm)
        elif ctx.business_type == "content_creator":
            m = self._content_creator(ctx, bm)
        elif ctx.business_type == "ecommerce":
            m = self._ecommerce(ctx, bm)
        elif ctx.business_type == "b2b_agency":
            m = self._b2b_agency(ctx, bm)
        elif ctx.business_type == "saas":
            m = self._saas(ctx, bm)
        else:
            m = self._general(ctx, bm)

        m["confidence_source"] = "industry_benchmarks_2024"
        m["benchmark_category"] = ctx.business_type
        return m

    # ── Vertical calculators ──────────────────────────────────────────

    def _fitness(self, ctx: BusinessContext, bm: dict) -> dict:
        followers = ctx.follower_count or 0
        clients_now = ctx.client_count or 0
        price = ctx.price_point or bm["avg_session_price"]

        potential = round(followers * bm["online_conversion_rate"])
        sessions_per_month = bm["monthly_session_freq"] / 4
        monthly_rev_potential = round(potential * price * sessions_per_month)
        current_monthly_rev = round(clients_now * price * sessions_per_month)
        revenue_gap = monthly_rev_potential - current_monthly_rev
        ltv = round(price * sessions_per_month * bm["ltv_multiplier"])

        current_conv_pct = (
            round(clients_now / followers * 100, 2) if followers > 0 else 0.0
        )
        industry_conv_pct = round(bm["online_conversion_rate"] * 100, 1)

        upside_multiple = (
            round((monthly_rev_potential / max(current_monthly_rev, 1) - 1) * 100)
            if current_monthly_rev > 0
            else 180
        )

        return {
            "potential_clients_from_followers": potential,
            "monthly_revenue_at_conversion": monthly_rev_potential,
            "current_monthly_revenue": current_monthly_rev,
            "current_conversion_rate_pct": current_conv_pct,
            "industry_avg_conversion_pct": industry_conv_pct,
            "revenue_gap_monthly": revenue_gap,
            "ltv_per_client": ltv,
            "price_per_session": price,
            "online_programme_price": bm["online_programme_price"],
            "upside_label": f"+{upside_multiple}% revenue in 90 days",
            "sessions_per_week": bm["monthly_session_freq"] // 4,
        }

    def _content_creator(self, ctx: BusinessContext, bm: dict) -> dict:
        followers = ctx.follower_count or 0
        course_buyers = round(followers * bm["course_conversion"])
        course_revenue = round(course_buyers * bm["avg_course_price"])
        merch_buyers = round(followers * bm["merch_conversion"])
        merch_revenue = round(merch_buyers * 35)  # avg merch item
        sponsorship_per_post = round(followers / 1000 * bm["sponsorship_cpm"])
        membership_revenue = round(followers * 0.005 * bm["membership_price"])
        total_potential = course_revenue + merch_revenue + sponsorship_per_post * 4

        current_rev = ctx.current_revenue or 0
        revenue_gap = total_potential - current_rev

        return {
            "potential_course_buyers": course_buyers,
            "course_revenue_potential": course_revenue,
            "merch_revenue_potential": merch_revenue,
            "sponsorship_per_post_usd": sponsorship_per_post,
            "membership_revenue_monthly": membership_revenue,
            "total_monthly_revenue_potential": total_potential,
            "revenue_gap_monthly": max(0, revenue_gap),
            "avg_course_price": bm["avg_course_price"],
            "course_conversion_rate_pct": round(bm["course_conversion"] * 100, 1),
            "upside_label": f"+{round((total_potential / max(current_rev, 100) - 1) * 100)}% revenue in 90 days",
        }

    def _ecommerce(self, ctx: BusinessContext, bm: dict) -> dict:
        current_rev = ctx.current_revenue or 0
        # Estimate monthly visitors from revenue
        aov = bm["avg_order_value"]
        est_monthly_orders = round(current_rev / max(aov, 1)) if current_rev else 0
        est_visitors = round(est_monthly_orders / bm["avg_conversion_rate"]) if est_monthly_orders else 1000

        abandoned_carts = round(est_visitors * bm["cart_abandonment"] * bm["avg_conversion_rate"])
        recovery_potential = round(abandoned_carts * bm["email_recovery_rate"] * aov)
        email_revenue = round(current_rev * bm["email_revenue_pct_of_total"])
        repeat_revenue = round(est_monthly_orders * bm["repeat_purchase_rate"] * aov)

        return {
            "estimated_monthly_visitors": est_visitors,
            "abandoned_carts_monthly": abandoned_carts,
            "cart_recovery_revenue_potential": recovery_potential,
            "email_revenue_potential_monthly": email_revenue,
            "repeat_purchase_revenue_monthly": repeat_revenue,
            "avg_conversion_rate_pct": round(bm["avg_conversion_rate"] * 100, 1),
            "cart_abandonment_rate_pct": round(bm["cart_abandonment"] * 100, 0),
            "avg_order_value": aov,
            "gross_margin_pct": round(bm["gross_margin_pct"] * 100, 0),
            "upside_label": f"+{round((recovery_potential + email_revenue * 0.5) / max(current_rev, 1) * 100)}% revenue in 90 days",
        }

    def _b2b_agency(self, ctx: BusinessContext, bm: dict) -> dict:
        clients_now = ctx.client_count or 0
        retainer = ctx.price_point or bm["avg_retainer_usd"]
        current_mrr = clients_now * retainer

        cold_outreach_close = round(100 * bm["close_rate_cold"])
        referral_close = round(clients_now * 2 * bm["close_rate_referral"])
        potential_new_clients = cold_outreach_close + referral_close
        potential_new_mrr = potential_new_clients * retainer
        ltv_per_client = round(retainer * bm["ltv_months"])

        return {
            "current_mrr": current_mrr,
            "retainer_usd": retainer,
            "cold_outreach_close_rate_pct": round(bm["close_rate_cold"] * 100, 0),
            "referral_close_rate_pct": round(bm["close_rate_referral"] * 100, 0),
            "potential_new_clients_90d": potential_new_clients,
            "potential_new_mrr": potential_new_mrr,
            "ltv_per_client": ltv_per_client,
            "payback_period_months": bm["payback_period_months"],
            "avg_project_usd": bm["avg_project_usd"],
            "upside_label": f"+{round(potential_new_mrr / max(current_mrr, 1) * 100)}% MRR in 90 days",
        }

    def _saas(self, ctx: BusinessContext, bm: dict) -> dict:
        current_mrr = ctx.current_revenue or 0
        client_count = ctx.client_count or 0
        arpu = (current_mrr / client_count) if client_count > 0 else bm["avg_arpu_usd"]

        churn_loss_monthly = round(current_mrr * bm["monthly_churn_rate"])
        expansion_opportunity = round(current_mrr * bm["expansion_revenue_pct"])
        trial_conv_users = round(client_count * bm["trial_conversion_rate"]) if client_count else 50
        trial_conv_revenue = round(trial_conv_users * arpu)

        net_new_mrr = expansion_opportunity + trial_conv_revenue - churn_loss_monthly
        ltv = round(arpu / max(bm["monthly_churn_rate"], 0.001))

        return {
            "current_mrr": current_mrr,
            "monthly_churn_loss_usd": churn_loss_monthly,
            "expansion_revenue_opportunity": expansion_opportunity,
            "trial_conversion_revenue": trial_conv_revenue,
            "net_new_mrr_potential": max(0, net_new_mrr),
            "ltv_per_customer": ltv,
            "arpu_monthly": round(arpu),
            "free_to_paid_rate_pct": round(bm["free_to_paid_rate"] * 100, 1),
            "monthly_churn_rate_pct": round(bm["monthly_churn_rate"] * 100, 1),
            "upside_label": f"+{round(max(0, net_new_mrr) / max(current_mrr, 1) * 100)}% MRR in 90 days",
        }

    def _general(self, ctx: BusinessContext, bm: dict) -> dict:
        current_rev = ctx.current_revenue or 0
        clients = ctx.client_count or 0
        avg_txn = ctx.price_point or bm["avg_transaction_value"]

        referral_revenue = round(current_rev * bm["referral_rate"])
        repeat_revenue = round(clients * bm["repeat_purchase_rate"] * avg_txn)
        ltv = round(avg_txn * bm["customer_ltv_multiplier"])
        total_upside = referral_revenue + repeat_revenue

        return {
            "current_revenue": current_rev,
            "referral_revenue_potential": referral_revenue,
            "repeat_purchase_revenue": repeat_revenue,
            "ltv_per_customer": ltv,
            "avg_transaction_value": avg_txn,
            "total_upside_monthly": total_upside,
            "marketing_roi_benchmark": bm["marketing_roi_benchmark"],
            "upside_label": f"+{round(total_upside / max(current_rev, 1) * 100)}% revenue in 90 days",
        }
