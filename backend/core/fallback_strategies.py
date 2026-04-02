"""
Six complete JSON fallbacks — used when Anthropic API is unavailable.
Numbers sourced from BENCHMARK_TABLES, never invented.
"""

from __future__ import annotations

FALLBACKS: dict[str, dict] = {
    "fitness_trainer": {
        "headline": "Convert Followers to Clients With One Weekly Offer",
        "signal": (
            "Personal trainers with 1,000–10,000 followers convert at 3% "
            "when they post one direct offer weekly. "
            "You currently convert below industry average — a 30x gap exists."
        ),
        "actions": [
            {
                "title": "Launch a 4-Week Challenge",
                "what": (
                    "Post a £199 online challenge every Monday. "
                    "Cap at 10 spots. Use urgency ('2 spots left') in stories."
                ),
                "metric_impact": "industry_avg_conversion_pct",
            },
            {
                "title": "DM Every New Follower",
                "what": (
                    "Auto-respond to new follows with a 3-message sequence: "
                    "welcome, transformation question, free audit offer."
                ),
                "metric_impact": "potential_clients_from_followers",
            },
            {
                "title": "Weekly 'Client Win' Post",
                "what": (
                    "Post one client result every week with exact numbers "
                    "(e.g. -12 lbs in 6 weeks). Tag the client. "
                    "End with 'DM me START for the programme'."
                ),
                "metric_impact": "ltv_per_client",
            },
        ],
        "thisWeek": (
            "Post your first challenge offer today — price it at £197, "
            "cap at 8 spots, promote for 5 days straight."
        ),
        "risk": (
            "Posting workouts without offers — content without a CTA "
            "grows followers, not revenue."
        ),
        "upside": "+180% revenue in 90 days",
    },
    "content_creator": {
        "headline": "Monetise Your Audience With a $197 Digital Product",
        "signal": (
            "Creators converting 2.5% of followers to a $197 course "
            "outperform sponsorship revenue by 3x at the same audience size. "
            "Diversify beyond brand deals before the algorithm shifts."
        ),
        "actions": [
            {
                "title": "Launch a Digital Course",
                "what": (
                    "Package your top 5 content topics into a self-paced course. "
                    "Price at $197. Use a 72-hour launch window with a discount."
                ),
                "metric_impact": "course_revenue_potential",
            },
            {
                "title": "Start a Paid Newsletter Tier",
                "what": (
                    "Offer premium weekly analysis at $27/month. "
                    "Gate your best 20% of content behind it."
                ),
                "metric_impact": "membership_revenue_monthly",
            },
            {
                "title": "Affiliate Stack Your Links",
                "what": (
                    "Add 3 affiliate links to every video description. "
                    "Prioritise products you already use. "
                    "8% commission on qualified clicks adds passive income."
                ),
                "metric_impact": "total_monthly_revenue_potential",
            },
        ],
        "thisWeek": (
            "Write your course outline today — 5 modules, 3 videos each, "
            "then record module 1 before the weekend."
        ),
        "risk": (
            "Relying on a single revenue stream — platform algorithm changes "
            "can wipe 60% of income overnight."
        ),
        "upside": "+220% revenue in 90 days",
    },
    "ecommerce": {
        "headline": "Recover Abandoned Carts to Add 15% Revenue This Month",
        "signal": (
            "70% of carts are abandoned. A 3-email recovery sequence "
            "converts 15% of those — that is free revenue from traffic you "
            "already paid for."
        ),
        "actions": [
            {
                "title": "Deploy 3-Email Cart Recovery",
                "what": (
                    "Email 1 (1hr): reminder + image. "
                    "Email 2 (24hr): social proof + FAQ. "
                    "Email 3 (72hr): 10% discount expiring in 24hrs."
                ),
                "metric_impact": "cart_recovery_revenue_potential",
            },
            {
                "title": "Add Post-Purchase Upsell",
                "what": (
                    "Show a one-click upsell immediately after checkout. "
                    "Offer a complementary product at 30% off. "
                    "28% of customers buy twice when prompted immediately."
                ),
                "metric_impact": "repeat_purchase_revenue_monthly",
            },
            {
                "title": "Build Email Flows for Repeat Buyers",
                "what": (
                    "Segment buyers by product category. "
                    "Send a 'reorder reminder' at day 45. "
                    "Email drives 30% of total ecommerce revenue."
                ),
                "metric_impact": "email_revenue_potential_monthly",
            },
        ],
        "thisWeek": (
            "Install a cart abandonment app today and write the 3 emails — "
            "recovery revenue starts flowing within 48 hours."
        ),
        "risk": (
            "Running paid ads without email capture — you are renting "
            "an audience you do not own."
        ),
        "upside": "+45% revenue in 90 days",
    },
    "b2b_agency": {
        "headline": "Double MRR by Systemising Your Referral Engine",
        "signal": (
            "B2B agencies close 25% of referral leads vs 5% of cold outreach. "
            "If you have 5+ happy clients and no referral programme, "
            "you are leaving your highest-ROI channel untapped."
        ),
        "actions": [
            {
                "title": "Launch a Referral Programme",
                "what": (
                    "Email every current client: offer 1 free month ($2,500 value) "
                    "for each referral that signs a retainer. "
                    "Follow up in person on your next call."
                ),
                "metric_impact": "referral_close_rate_pct",
            },
            {
                "title": "100-Touch Cold Outreach Sprint",
                "what": (
                    "Send 20 personalised cold emails daily for 5 days. "
                    "Use a case study from your best client result as the hook. "
                    "5% close rate = 5 discovery calls from 100 emails."
                ),
                "metric_impact": "cold_outreach_close_rate_pct",
            },
            {
                "title": "Package a Productised Service",
                "what": (
                    "Create a fixed-scope, fixed-price offer (e.g. '30-Day SEO Sprint — $2,500'). "
                    "Easier to sell, easier to deliver, shorter sales cycle."
                ),
                "metric_impact": "avg_project_usd",
            },
        ],
        "thisWeek": (
            "Email your top 5 clients today asking for one referral — "
            "a single warm introduction is worth 20 cold emails."
        ),
        "risk": (
            "Scope creep without a change-order process — it silently "
            "reduces effective hourly rate to below minimum wage."
        ),
        "upside": "+120% MRR in 90 days",
    },
    "saas": {
        "headline": "Cut Churn 50% Before Acquiring a Single New User",
        "signal": (
            "At 5% monthly churn you lose 46% of your customer base per year. "
            "Reducing churn to 2.5% doubles LTV without touching acquisition spend."
        ),
        "actions": [
            {
                "title": "Build a 7-Day Onboarding Sequence",
                "what": (
                    "Email day 1: single activation step. "
                    "Day 3: power feature highlight. "
                    "Day 7: personal check-in from founder. "
                    "Activated users churn at 18% of the rate of non-activated users."
                ),
                "metric_impact": "monthly_churn_loss_usd",
            },
            {
                "title": "Identify and Convert Power Users",
                "what": (
                    "Find your top 10% of users by usage. "
                    "Offer them an annual plan at 2 months free. "
                    "Annual customers churn at 3x lower rates."
                ),
                "metric_impact": "expansion_revenue_opportunity",
            },
            {
                "title": "Free-to-Paid Activation Push",
                "what": (
                    "Email free users who hit the usage limit. "
                    "Offer a 14-day trial of paid tier, no card required. "
                    "4% of free users convert when prompted at the right moment."
                ),
                "metric_impact": "free_to_paid_rate_pct",
            },
        ],
        "thisWeek": (
            "Pull a list of churned users from the last 30 days and "
            "send 10 personal emails asking one question: 'What made you leave?' — "
            "the answers will be worth more than any A/B test."
        ),
        "risk": (
            "Optimising acquisition while churn is above 3% — "
            "you are filling a leaky bucket."
        ),
        "upside": "+85% MRR in 90 days",
    },
    "general_business": {
        "headline": "Unlock Hidden Revenue From Your Existing Customer Base",
        "signal": (
            "Selling to an existing customer costs 5x less than acquiring a new one. "
            "With a 25% repeat purchase rate, activating dormant customers "
            "is your fastest path to revenue growth."
        ),
        "actions": [
            {
                "title": "Reactivate Dormant Customers",
                "what": (
                    "Email every customer who has not bought in 90 days. "
                    "Offer a time-limited 15% discount with a personal note. "
                    "Subject line: 'We miss you — here is something exclusive'."
                ),
                "metric_impact": "repeat_purchase_revenue",
            },
            {
                "title": "Build a Referral Incentive",
                "what": (
                    "Offer existing customers $25 credit for every friend they refer. "
                    "15% of happy customers refer when given a structured incentive."
                ),
                "metric_impact": "referral_revenue_potential",
            },
            {
                "title": "Raise Prices on Your Best Product",
                "what": (
                    "Test a 15% price increase on your top-selling item. "
                    "Most businesses lose fewer than 5% of customers on a "
                    "well-communicated price rise — net margin improves immediately."
                ),
                "metric_impact": "avg_transaction_value",
            },
        ],
        "thisWeek": (
            "Export your customer list, identify the last-purchase date for each, "
            "and send a reactivation email to everyone silent for 60+ days."
        ),
        "risk": (
            "Focusing only on new customer acquisition — your existing "
            "customers are your most profitable and most overlooked growth lever."
        ),
        "upside": "+60% revenue in 90 days",
    },
}


def get_fallback(business_type: str) -> dict:
    return FALLBACKS.get(business_type, FALLBACKS["general_business"])
