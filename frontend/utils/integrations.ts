/**
 * Integration validators — test harness for Stripe + AI flows.
 * These simulate real API behavior (delays, occasional failures)
 * so UI loading states and error boundaries can be validated without
 * hitting live endpoints.
 */

/**
 * Stripe Checkout Flow Validator
 * Simulates a Stripe checkout session creation and validates
 * UI transitions during loading / error states.
 */
export async function validateStripeFlow(
  priceId: string
): Promise<{ url?: string; error?: string }> {
  try {
    console.log(`[Stripe] Initiating checkout for ${priceId}`)
    await new Promise((res) => setTimeout(res, 1200))
    return { url: 'https://checkout.stripe.com/pay/cs_test_mock123' }
  } catch {
    return { error: 'Failed to initialize Stripe checkout. Please try again.' }
  }
}

/**
 * AI Processing Validator
 * Validates how the frontend handles delayed AI responses and error boundaries.
 * Throws ~10% of the time to exercise retry flows.
 */
export async function mockAIProcessing(
  prompt: string
): Promise<{ result?: string; error?: string }> {
  try {
    console.log(`[AI] Processing prompt: ${prompt}`)
    await new Promise((res) => setTimeout(res, 2500))

    if (Math.random() < 0.1) throw new Error('Model timeout')

    return { result: 'Strategy generated successfully via the Starcoins analysis engine.' }
  } catch {
    return {
      error:
        'The AI model took too long to respond. Use the undo feature and try again.',
    }
  }
}

/**
 * Health probe — quick check that the backend Railway instance is reachable.
 */
export async function probeBackendHealth(
  backendUrl: string
): Promise<{ ok: boolean; db?: string; redis?: string; error?: string }> {
  try {
    const res = await fetch(`${backendUrl}/api/health`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    return { ok: true, db: data.db_ping, redis: data.redis_ping }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
