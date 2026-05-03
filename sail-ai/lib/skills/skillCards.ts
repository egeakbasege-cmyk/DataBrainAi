/**
 * lib/skills/skillCards.ts
 *
 * Static expert-methodology library injected into prompts at runtime.
 *
 * Design rules:
 *   - SKILL_LIBRARY is a const — no dynamic imports (cold-start safety)
 *   - triggerKeywords are all lowercase (matched case-insensitively)
 *   - steps are injected verbatim into the [EXPERT_SKILLS] block
 *   - confidenceBoost adds to the DataHealthReport score (max 0.20 per card)
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type SkillDomain =
  | 'business_strategy'
  | 'financial_analysis'
  | 'market_research'
  | 'operations'
  | 'risk_assessment'
  | 'product_strategy'
  | 'competitive_intelligence'
  | 'data_governance'

export interface SkillCard {
  id:               string          // e.g. "SKC-001"
  name:             string          // e.g. "Porter's Five Forces"
  domain:           SkillDomain[]
  triggerKeywords:  string[]        // lowercase; matched against user message
  steps:            string[]        // ordered protocol injected verbatim into prompt
  outputFormat:     string          // exact structure the LLM must follow
  confidenceBoost:  number          // 0.0–0.20; added to DataHealthReport score
  requiresFields?:  string[]        // body fields needed for full confidence
}

// ── Static library — minimum 6 cards ─────────────────────────────────────────

export const SKILL_LIBRARY: SkillCard[] = [
  {
    id:   'SKC-001',
    name: "Porter's Five Forces",
    domain: ['competitive_intelligence', 'business_strategy'],
    triggerKeywords: [
      'competition', 'competitive', 'competitors', 'rivalry',
      'supplier', 'suppliers', 'bargaining', 'buyers', 'substitutes',
      'new entrant', 'barriers to entry', 'five forces', 'porter',
      'industry dynamics', 'market power',
    ],
    steps: [
      '1. Identify the industry and define competitive boundaries.',
      '2. Threat of New Entrants — assess capital requirements, switching costs, regulatory barriers, economies of scale.',
      '3. Bargaining Power of Suppliers — number of suppliers, uniqueness of inputs, forward integration risk.',
      '4. Bargaining Power of Buyers — buyer concentration, price sensitivity, backward integration risk.',
      '5. Threat of Substitutes — availability of alternatives, price-performance trade-off.',
      '6. Competitive Rivalry — number of competitors, industry growth rate, differentiation, exit barriers.',
      '7. Synthesise: rate each force (Low / Medium / High) and derive the overall industry attractiveness score.',
    ],
    outputFormat: 'Five-row table: Force | Rating (Low/Med/High) | Key Evidence | Strategic Implication. Conclude with overall attractiveness verdict.',
    confidenceBoost: 0.12,
    requiresFields: ['context', 'message'],
  },

  {
    id:   'SKC-002',
    name: 'SWOT Analysis',
    domain: ['business_strategy', 'market_research'],
    triggerKeywords: [
      'swot', 'strengths', 'weaknesses', 'opportunities', 'threats',
      'internal analysis', 'external analysis', 'strategic position',
      'competitive advantage', 'strategic assessment', 'situation analysis',
    ],
    steps: [
      '1. Strengths — list internal capabilities, resources, and advantages that create value.',
      '2. Weaknesses — list internal limitations, gaps, or resource constraints.',
      '3. Opportunities — identify external trends, market gaps, and unmet needs the business can exploit.',
      '4. Threats — identify external risks: competitive, regulatory, technological, economic.',
      '5. Cross-analysis: SO (leverage strengths to capture opportunities), ST (use strengths to mitigate threats), WO (overcome weaknesses via opportunities), WT (defensive moves).',
      '6. Prioritise: rank the top 2 items in each quadrant by potential impact.',
    ],
    outputFormat: '2×2 SWOT grid with bullet points per quadrant. Follow with a 3-row SO/ST/WO cross-analysis table. End with top 3 strategic priorities.',
    confidenceBoost: 0.10,
    requiresFields: ['context'],
  },

  {
    id:   'SKC-003',
    name: 'Financial Ratio Analysis',
    domain: ['financial_analysis'],
    triggerKeywords: [
      'revenue', 'profit', 'margin', 'ebitda', 'net income', 'gross profit',
      'cash flow', 'liquidity', 'current ratio', 'debt', 'leverage', 'roi',
      'return on', 'financial ratio', 'balance sheet', 'p&l', 'income statement',
      'cac', 'ltv', 'arpu', 'burn rate', 'runway', 'unit economics',
    ],
    steps: [
      '1. Liquidity Ratios — Current Ratio (Current Assets / Current Liabilities, benchmark ≥ 1.5), Quick Ratio.',
      '2. Profitability Ratios — Gross Margin %, Net Margin %, ROE, ROA. Compare to sector median.',
      '3. Leverage Ratios — Debt-to-Equity (benchmark < 2.0 for most sectors), Interest Coverage.',
      '4. Efficiency Ratios — Asset Turnover, Inventory Days, Receivables Days.',
      '5. SaaS/Digital Metrics (if applicable) — LTV:CAC ratio (benchmark ≥ 3:1), Payback Period, NRR.',
      '6. Trend analysis: compare current period vs previous, flag deteriorating ratios.',
      '7. Conclude with a financial health verdict: Strong / Stable / At Risk / Critical.',
    ],
    outputFormat: 'Three sections (Liquidity, Profitability, Leverage), each with a metric table: Metric | Value | Sector Benchmark | Status. End with overall financial health verdict and top 2 action items.',
    confidenceBoost: 0.18,
    requiresFields: ['context', 'message'],
  },

  {
    id:   'SKC-004',
    name: 'TAM-SAM-SOM Market Sizing',
    domain: ['market_research', 'product_strategy'],
    triggerKeywords: [
      'market size', 'tam', 'sam', 'som', 'addressable market', 'total market',
      'market opportunity', 'target market', 'serviceable market',
      'market potential', 'market share', 'go-to-market', 'gtm',
    ],
    steps: [
      '1. TAM (Total Addressable Market) — top-down: use industry reports or population × avg spend. Bottom-up: total potential buyers × price.',
      '2. SAM (Serviceable Addressable Market) — narrow TAM by geography, segment, and delivery capability.',
      '3. SOM (Serviceable Obtainable Market) — realistic 3-year capture based on competitive landscape and GTM capacity.',
      '4. Validate via comparable company benchmarks (reference publicly available data).',
      '5. State assumptions explicitly and flag the single biggest uncertainty.',
    ],
    outputFormat: 'Three-row table: Tier | Definition | Estimated Size | Key Assumption. Include methodology note (top-down or bottom-up). Flag confidence level per tier.',
    confidenceBoost: 0.14,
    requiresFields: ['context', 'message'],
  },

  {
    id:   'SKC-005',
    name: 'RICE Prioritization Framework',
    domain: ['product_strategy', 'operations'],
    triggerKeywords: [
      'prioritize', 'prioritisation', 'prioritization', 'roadmap', 'feature',
      'backlog', 'sprint', 'product', 'initiative', 'rice', 'effort',
      'impact', 'confidence', 'reach', 'what to do first', 'where to focus',
    ],
    steps: [
      '1. Reach — how many users/customers will this affect per period? Use specific numbers.',
      '2. Impact — estimate magnitude (3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal).',
      '3. Confidence — how certain are you in the estimates? (100% = high, 80% = medium, 50% = low).',
      '4. Effort — person-months of work required.',
      '5. RICE Score = (Reach × Impact × Confidence) / Effort.',
      '6. Rank all initiatives by RICE score descending.',
      '7. Flag any quick-wins (high score, low effort) and resource sinks (low score, high effort).',
    ],
    outputFormat: 'Table with columns: Initiative | Reach | Impact | Confidence | Effort | RICE Score. Sort by RICE Score descending. Append: top 3 recommendations and 1 initiative to drop.',
    confidenceBoost: 0.13,
    requiresFields: ['message'],
  },

  {
    id:   'SKC-006',
    name: 'Risk Assessment Matrix',
    domain: ['risk_assessment', 'operations', 'data_governance'],
    triggerKeywords: [
      'risk', 'risks', 'threat', 'mitigation', 'contingency', 'downside',
      'failure', 'worst case', 'scenario', 'vulnerability', 'exposure',
      'compliance', 'regulatory', 'audit', 'governance', 'control',
    ],
    steps: [
      '1. Risk Identification — enumerate all material risks (operational, financial, regulatory, reputational, strategic).',
      '2. Likelihood Rating — score 1–5 (1 = rare, 5 = almost certain) based on historical data or analogues.',
      '3. Impact Rating — score 1–5 (1 = negligible, 5 = catastrophic) on business continuity and financials.',
      '4. Risk Score = Likelihood × Impact (range 1–25).',
      '5. Categorise: Critical (≥15), High (9–14), Medium (4–8), Low (≤3).',
      '6. Mitigation Actions — for each Critical/High risk, define: owner, action, deadline, residual risk score.',
      '7. Summarise risk posture and top priority for board/leadership review.',
    ],
    outputFormat: 'Risk register table: Risk | Likelihood (1–5) | Impact (1–5) | Score | Category | Mitigation Action | Owner. Sort by Score descending. Conclude with executive risk summary (3 sentences max).',
    confidenceBoost: 0.15,
    requiresFields: ['message'],
  },
]

// ── Selector ──────────────────────────────────────────────────────────────────

/**
 * selectSkillCards
 *
 * Scores every card in SKILL_LIBRARY by keyword hit count against the
 * user's message. Returns the top `max` cards sorted by score descending.
 * Returns [] if no keywords match — never inject irrelevant methodology.
 *
 * @param userMessage  The raw user query (case-insensitive matching applied)
 * @param max          Maximum number of cards to return (default: 2)
 */
export function selectSkillCards(userMessage: string, max = 2): SkillCard[] {
  const lower = userMessage.toLowerCase()

  const scored = SKILL_LIBRARY.map((card) => {
    const hits = card.triggerKeywords.filter((kw) => lower.includes(kw)).length
    return { card, hits }
  }).filter(({ hits }) => hits > 0)

  scored.sort((a, b) => b.hits - a.hits)

  return scored.slice(0, max).map(({ card }) => card)
}

/**
 * buildSkillBlock
 *
 * Serialises selected SkillCards into the [EXPERT_SKILLS] injection block
 * that is appended verbatim to the user prompt.
 */
export function buildSkillBlock(cards: SkillCard[]): string {
  if (cards.length === 0) return ''

  const body = cards
    .map(
      (c) =>
        `### ${c.name}\n${c.steps.join('\n')}\nOutput format: ${c.outputFormat}`,
    )
    .join('\n\n')

  return `[EXPERT_SKILLS]\nFollow these methodologies in order. Do not deviate from the steps.\n${body}\n[/EXPERT_SKILLS]`
}
