import axios from 'axios'
import * as cheerio from 'cheerio'
import type { AmazonRawData, AmazonReview } from '../types'

const REQUEST_TIMEOUT = 25_000

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
]

function buildHeaders() {
  return {
    'User-Agent':      USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection':      'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  }
}

export function extractAsin(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /[?&]asin=([A-Z0-9]{10})/i,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1].toUpperCase()
  }
  return null
}

async function fetchHtml(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get<string>(url, {
        timeout:      REQUEST_TIMEOUT,
        headers:      buildHeaders(),
        responseType: 'text',
        maxRedirects: 5,
      })
      const html = res.data as string
      if (html.includes('api-services-support@amazon.com') || html.includes('captcha')) {
        throw new Error('Amazon returned a CAPTCHA page. The request was blocked.')
      }
      return html
    } catch (err: any) {
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  throw new Error('Failed to fetch Amazon page after retries.')
}

function parseProductPage(html: string, asin: string): Omit<AmazonRawData, 'reviews' | 'scrapedAt'> {
  const $ = cheerio.load(html)

  const title = $('#productTitle').text().trim() || $('h1.a-size-large').first().text().trim() || 'Unknown Product'
  const brand = $('#bylineInfo').text().replace('Visit the', '').replace('Store', '').replace('Brand:', '').trim() || ''

  let price: number | null = null
  const priceText = $('.a-price .a-offscreen').first().text() || $('#priceblock_ourprice').text() || ''
  const priceMatch = priceText.replace(/[^0-9.]/g, '')
  if (priceMatch) price = parseFloat(priceMatch)

  const currency = priceText.includes('£') ? 'GBP' : priceText.includes('€') ? 'EUR' : 'USD'

  let rating: number | null = null
  const ratingText = $('[data-hook="average-star-rating"] .a-offscreen').first().text() || ''
  const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
  if (ratingMatch) rating = parseFloat(ratingMatch[1])

  let reviewCount: number | null = null
  const reviewText = $('[data-hook="total-review-count"]').text() || ''
  const reviewNum = reviewText.replace(/[^0-9]/g, '')
  if (reviewNum) reviewCount = parseInt(reviewNum, 10)

  const bulletPoints: string[] = []
  $('#feature-bullets li span.a-list-item').each((_, el) => {
    const text = $(el).text().trim()
    if (text && !text.toLowerCase().includes('make sure') && text.length > 10) bulletPoints.push(text)
  })

  const description = $('#productDescription p').text().trim() || ''

  const imageUrls: string[] = []
  $('img[data-old-hires]').each((_, el) => {
    const src = $(el).attr('data-old-hires')
    if (src?.startsWith('http')) imageUrls.push(src)
  })
  if (imageUrls.length === 0) {
    const mainImg = $('#landingImage').attr('src')
    if (mainImg?.startsWith('http')) imageUrls.push(mainImg)
  }

  const categories: string[] = []
  $('#wayfinding-breadcrumbs_feature_div li a').each((_, el) => {
    const text = $(el).text().trim()
    if (text) categories.push(text)
  })

  return { asin, title, brand, price, currency, rating, reviewCount, bulletPoints, description, imageUrls, categories }
}

function parseReviews(html: string): AmazonReview[] {
  const $ = cheerio.load(html)
  const reviews: AmazonReview[] = []
  $('[data-hook="review"]').each((_, el) => {
    const ratingText = $(el).find('[data-hook="review-star-rating"] .a-offscreen').text()
    const rating     = parseFloat(ratingText.match(/(\d+\.?\d*)/)?.[1] ?? '0') || 0
    const title      = $(el).find('[data-hook="review-title"] span').last().text().trim()
    const body       = $(el).find('[data-hook="review-body"] span').text().trim()
    const date       = $(el).find('[data-hook="review-date"]').text().trim()
    const verified   = $(el).find('[data-hook="avp-badge"]').length > 0
    if (title || body) reviews.push({ title, body: body.slice(0, 1000), rating, date, verified })
  })
  return reviews
}

export async function runAmazonWorker(url: string): Promise<AmazonRawData> {
  const asin = extractAsin(url)
  if (!asin) throw new Error(`Could not extract ASIN from Amazon URL: "${url}"`)

  const parsed     = new URL(url)
  const base       = `${parsed.protocol}//${parsed.hostname}`
  const productUrl = `${base}/dp/${asin}`
  const reviewsUrl = `${base}/product-reviews/${asin}?sortBy=recent&reviewerType=all_reviews&pageNumber=1`

  let productHtml: string
  let reviewsHtml: string
  try {
    ;[productHtml, reviewsHtml] = await Promise.all([fetchHtml(productUrl), fetchHtml(reviewsUrl)])
  } catch (err: any) {
    throw new Error(`Amazon scrape failed: ${err.message}`)
  }

  return {
    ...parseProductPage(productHtml, asin),
    reviews:   parseReviews(reviewsHtml).slice(0, 30),
    scrapedAt: new Date().toISOString(),
  }
}
