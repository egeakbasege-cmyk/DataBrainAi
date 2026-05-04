/**
 * scripts/test-search-apis.mjs
 *
 * Tavily ve Serper API bağlantılarını canlı olarak test eder.
 *
 * Kullanım:
 *   TAVILY_API_KEY=tvly-xxx SERPER_API_KEY=xxx node scripts/test-search-apis.mjs
 *
 * veya .env.local'a geçici olarak ekleyip:
 *   node --env-file=.env.local scripts/test-search-apis.mjs
 */

const TEST_QUERY = 'Alaçatı commercial rent price per square meter 2025'

// ── ANSI colours ──────────────────────────────────────────────────────────────
const G  = '\x1b[32m'   // green
const R  = '\x1b[31m'   // red
const Y  = '\x1b[33m'   // yellow
const B  = '\x1b[36m'   // cyan
const W  = '\x1b[1m'    // bold
const RE = '\x1b[0m'    // reset

function ok(msg)   { console.log(`${G}✅ ${msg}${RE}`) }
function fail(msg) { console.log(`${R}❌ ${msg}${RE}`) }
function warn(msg) { console.log(`${Y}⚠  ${msg}${RE}`) }
function info(msg) { console.log(`${B}ℹ  ${msg}${RE}`) }

// ── Tavily test ───────────────────────────────────────────────────────────────
async function testTavily(apiKey) {
  console.log(`\n${W}── Tavily ───────────────────────────────────${RE}`)
  if (!apiKey) { warn('TAVILY_API_KEY tanımlı değil — atlandı'); return null }

  info(`Query: "${TEST_QUERY}"`)

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:      apiKey,
        query:        TEST_QUERY,
        search_depth: 'basic',
        max_results:  3,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      fail(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const results = data.results ?? []

    if (results.length === 0) {
      warn('Bağlantı başarılı ama sonuç dönmedi')
      return null
    }

    ok(`${results.length} sonuç döndü`)
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.url}`)
      console.log(`      Tarih: ${r.published_date ?? 'belirtilmemiş'}`)
      console.log(`      Snippet: ${(r.content ?? '').slice(0, 100)}…`)
    })
    return results
  } catch (err) {
    fail(`Bağlantı hatası: ${err.message}`)
    return null
  }
}

// ── Serper test ───────────────────────────────────────────────────────────────
async function testSerper(apiKey) {
  console.log(`\n${W}── Serper (Google-backed) ───────────────────${RE}`)
  if (!apiKey) { warn('SERPER_API_KEY tanımlı değil — atlandı'); return null }

  info(`Query: "${TEST_QUERY}"`)

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY':    apiKey,
      },
      body: JSON.stringify({ q: TEST_QUERY, num: 3 }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      fail(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const results = data.organic ?? []

    if (results.length === 0) {
      warn('Bağlantı başarılı ama sonuç dönmedi')
      return null
    }

    ok(`${results.length} sonuç döndü`)
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.link}`)
      console.log(`      Tarih: ${r.date ?? 'belirtilmemiş'}`)
      console.log(`      Snippet: ${(r.snippet ?? '').slice(0, 100)}…`)
    })
    return results
  } catch (err) {
    fail(`Bağlantı hatası: ${err.message}`)
    return null
  }
}

// ── requiresResearch() simülasyonu ───────────────────────────────────────────
function testTriggers() {
  console.log(`\n${W}── requiresResearch() Trigger Testi ─────────${RE}`)

  const cases = [
    // Tetiklenmeli
    { q: 'Alaçatı çarşı bölgesinde kira fiyatları',   expect: true  },
    { q: 'dondurma makinesi fiyatı ne kadar 2025',    expect: true  },
    { q: 'maaş ortalaması Türkiye',                   expect: true  },
    { q: 'cost of commercial rent Istanbul per m2',   expect: true  },
    { q: 'how much does a gelato machine cost',       expect: true  },
    { q: 'Alaçatı 2026 tourism market analysis',      expect: true  },
    // Tetiklenmemeli
    { q: 'merhaba',                                   expect: false },
    { q: 'tamam',                                     expect: false },
    { q: 'hi',                                        expect: false },
    { q: 'teşekkürler',                               expect: false },
  ]

  // Minimal requiresResearch reimplementation for test only
  const PATTERNS = [
    /\b(latest|current|today|right now|live)\b/i,
    /\b20(2[4-9]|[3-9]\d)\b/,
    /\b(price|rate|salary|wage|cost(s|ing)?|rental|fee|earn|income|afford|budget)\b/i,
    /\b(rent|lease|expense|spend(ing)?|overhead|tuition|utility|subscription)\b/i,
    /\b(average\s+(price|cost|salary|rent)|cost\s+of\s+living|per\s+month|per\s+year|hourly)\b/i,
    /\b(how\s+much|minimum\s+wage|interest\s+rate|mortgage|property\s+price|square\s+meter)\b/i,
    /\b(strateg|competi|market\s+share|industry\s+report|forecast|trend|benchmark)\b/i,
    /\b(türkiye|bist|tcmb|tuik|enflasyon|dolar|faiz|ekonomi|borsa)\b/i,
    /\b(kira|fiyat|maliyet|ücret|maaş|tutar|bedel|masraf|gider|harcama|bütçe)\b/i,
    /\b(ne\s+kadar|kaç\s+(para|lira|tl)|ortalama|pahalı|ucuz|değer)\b/i,
    /\b(aylık|yıllık|haftalık|metrekare|m²|depozito)\b/i,
    /\b(market\s+analysis|sector|industry|competi|growth\s+rate|statistics)\b/i,
  ]
  const GREETING = /^(merhaba|selam|nasılsın|hey|hi|hello|ok|tamam|evet|yes|no|teşekkür|teşekkürler|sağol)$/i

  function req(msg) {
    const t = msg.trim()
    if (t.length < 15) return false
    if (GREETING.test(t)) return false
    return PATTERNS.some(p => p.test(msg))
  }

  let passed = 0
  for (const { q, expect } of cases) {
    const got = req(q)
    const pass = got === expect
    if (pass) { ok(`[${expect ? 'TETİKLER' : 'ATLAR  '}] "${q.slice(0, 50)}"`) ; passed++ }
    else       { fail(`[BEKLENİYOR: ${expect}] "${q.slice(0, 50)}"`) }
  }
  console.log(`\n   ${passed}/${cases.length} test geçti`)
}

// ── StreamUrlStripper simülasyonu ─────────────────────────────────────────────
function testUrlStripper() {
  console.log(`\n${W}── StreamUrlStripper Testi ──────────────────${RE}`)

  function strip(text) {
    return text
      .replace(/\[\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)\]/g, '$1')
      .replace(/\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)/g, '$1')
  }

  const cases = [
    {
      input:    'kira ortalamaları [[moyduz.com](http://moyduz.com)]',
      expected: 'kira ortalamaları moyduz.com',
    },
    {
      input:    'kaynak: [sciencedirect.com](https://sciencedirect.com)',
      expected: 'kaynak: sciencedirect.com',
    },
    {
      input:    '[[insaathesabi.com](http://insaathesabi.com), [gidalab.tarimorman.gov.tr](http://gidalab.tarimorman.gov.tr)]',
      expected: '[insaathesabi.com, gidalab.tarimorman.gov.tr]',
    },
    {
      input:    'normal metin [est.] değer',
      expected: 'normal metin [est.] değer',  // should NOT be stripped
    },
  ]

  let passed = 0
  for (const { input, expected } of cases) {
    const got  = strip(input)
    const pass = got === expected
    if (pass) { ok(`Doğru: "${got.slice(0, 70)}"`) ; passed++ }
    else       { fail(`\n  Girdi:    "${input}"\n  Beklenen: "${expected}"\n  Alınan:   "${got}"`) }
  }
  console.log(`\n   ${passed}/${cases.length} test geçti`)
}

// ── Ana akış ──────────────────────────────────────────────────────────────────
;(async () => {
  console.log(`\n${W}╔══════════════════════════════════════════════╗`)
  console.log(`║   Sail AI — API & Logic Test Suite           ║`)
  console.log(`╚══════════════════════════════════════════════╝${RE}`)

  const tavilyKey = process.env.TAVILY_API_KEY
  const serperKey = process.env.SERPER_API_KEY

  if (!tavilyKey && !serperKey) {
    warn('Her iki arama API anahtarı da tanımlı değil.')
    warn('Çalıştır: TAVILY_API_KEY=xxx SERPER_API_KEY=xxx node scripts/test-search-apis.mjs')
    warn('veya:     node --env-file=.env.local scripts/test-search-apis.mjs')
  }

  // Canlı API testleri
  const tavilyResults = await testTavily(tavilyKey)
  const serperResults = await testSerper(serperKey)

  // Mantık testleri (API key gerektirmez)
  testTriggers()
  testUrlStripper()

  // Özet
  console.log(`\n${W}── ÖZET ────────────────────────────────────${RE}`)
  console.log(`Tavily:          ${tavilyResults ? `${G}✅ Çalışıyor (${tavilyResults.length} sonuç)${RE}` : tavilyKey ? `${R}❌ Hata${RE}` : `${Y}⚠  Key yok${RE}`}`)
  console.log(`Serper:          ${serperResults ? `${G}✅ Çalışıyor (${serperResults.length} sonuç)${RE}` : serperKey ? `${R}❌ Hata${RE}` : `${Y}⚠  Key yok${RE}`}`)
  console.log(`Search aktif mi: ${(tavilyResults || serperResults) ? `${G}✅ EVET${RE}` : `${R}❌ HAYIR — tüm sorgular training verisiyle yanıtlanır${RE}`}`)
  console.log()
})()
