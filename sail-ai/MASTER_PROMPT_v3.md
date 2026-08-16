# SAIL AI — MASTER BUILD PROMPT v3.0 (Rocket'e yapıştır)

> Bu dosya, v2.0 promptunun gerçek kod tabanına karşı doğrulanmış ve düzeltilmiş halidir.
> Doğrulama notları için `PROMPT_REVIEW.md` dosyasına bak.

---

## ROLE

Senior Full-Stack Engineer + Lead UI/UX Designer.
Sen mevcut, **canlıda çalışan** bir ürünü geliştiriyorsun — sıfırdan yazmıyorsun.

**Repo:** https://github.com/egeakbasege-cmyk/DataBrainAi/tree/main/sail-ai
**Canlı:** https://data-brain-ai-sqqu.vercel.app

---

## ⛔ RULE 0 — YIKICI OLMAYAN ÇALIŞMA (EN ÖNEMLİ KURAL)

Bu repo canlıda, ödeme alan, veritabanı bağlı bir üründür. Aşağıdakiler
**KESİNLİKLE** korunacak. Bir dosyayı "temizlemek" veya "yeniden yazmak" için
silme; sadece belirtilen yerlere ekleme yap.

### Stack — DEĞİŞTİRME

| Katman | Gerçek | Yanlış varsayım (kullanma) |
|---|---|---|
| Veritabanı | **Prisma + Neon Postgres** | ~~Supabase~~ |
| Auth | **NextAuth v5** (`auth.ts`, `lib/auth/`) | ~~Supabase Auth~~ |
| LLM | **`ai` v3 + `@ai-sdk/xai` + Groq REST** | ~~`@ai-sdk/groq`~~ (kurulu değil) |
| Ödeme | **`lib/payments/` (Stripe + LemonSqueezy)** | ~~Sıfırdan Stripe~~ |

> Supabase'e geçiş = auth ve veritabanı tamamen kırılır. **Yapma.**

### DOKUNMA listesi (bu dosyalar yakın zamanda düzeltildi, üzerine yazma)

```
lib/payments/index.ts              lib/payments/stripe-provider.ts
app/api/checkout/route.ts          app/api/webhook/route.ts
app/api/webhook/stripe/route.ts    app/api/subscription/portal/route.ts
app/api/payments/status/route.ts   lib/quota.ts
prisma/schema.prisma               capacitor.config.ts
components/CapacitorBridge.tsx     mobile-shell/
scripts/backup-mobile.sh           scripts/restore-mobile.sh
next.config.mjs                    lib/proStore.ts
```

### `app/api/chat/route.ts` — SİLME, SADECE GENİŞLET

Bu dosya 460+ satır ve ürünün asıl farklılaştırıcısı: intent routing, tool
calling, token compression, KAIROS pipeline, sunucu taraflı kota kontrolü.
Onu basit bir `streamText()` örneğiyle **değiştirme**. Streaming eklemek
istiyorsan mevcut orkestrasyondan *sonra* response'u sarmalayarak ekle ve
şu blokları aynen koru:

```ts
const quota = await consumeQuota(req)
if (!quota.allowed) return Response.json(quotaExceededBody(quota), { status: 402 })
```

### Çalışma yöntemi

1. `main`'e **doğrudan push yapma**. `feat/ui-overhaul` dalında çalış.
2. Her adımda `npx tsc --noEmit` ve `npx next build` yeşil kalmalı.
3. Vercel'de **Preview deployment** kullan; production'ı otomatik ezme.
4. Silmeden önce `grep -r "<SymbolAdı>" app components lib` çalıştır ve
   referans sayısını raporla. Referans varsa silme, önce taşı.

---

## PART 1 — ÜRÜN

**Tek cümle:** Sail AI, KOBİ kurucuları ve bağımsız danışmanlar için doğal dil
arayüzüyle çalışan, veri yükleyip analiz eden, strateji çerçeveleri uygulayan ve
export-ready rapor üreten yapay zeka iş zekası asistanı.

**5 mod:** Strategy · Operations · Research · Data Lab · Frameworks

**Happy path:**
```
Landing → Signup → Onboarding (3 soru) → Dashboard (empty state)
→ Chat (mod seç → sor → streaming yanıt)
→ Data Lab (CSV yükle → sor → grafik + insight)
→ Frameworks (BCG → AI doldur → PDF export)
→ Settings → Upgrade
```

**Farklılaşma:** ChatGPT'den farkı sektör bağlamını hatırlaması + framework
overlay üretmesi. Julius AI'dan farkı teknik bilgi gerektirmemesi.

---

## PART 2 — TEMA: ÖNCE DOĞRULA, SONRA SİL

v2.0 promptu "tüm dark token'ları ve `.aetheris`'i kaldır" diyordu. Kısmen doğru
ama **körlemesine uygulanırsa chat ekranı kırılır.**

**Gerçek durum (doğrulandı):**
- Taban tema **light**: `--canvas: #FAFAF8`, `--surface: #FFFFFF`
- `.aetheris` **global bir tema değil**, chat için *scoped* bir dark bağlam
- 6 dosya referans veriyor: `app/chat/page.tsx`, `components/AetherisShell.tsx`,
  `components/ActionMatrixCard.tsx`, `lib/aetherisStore.ts`,
  `types/architecture.ts`, `app/globals.css`

**Yapılacak:**
1. `.aetheris` bloğunu **silme**. Bunun yerine `.surface-dark` olarak yeniden
   adlandır ve "chat için bilinçli koyu yüzey" olarak dokümante et.
2. `[data-theme="aetheris"]` seçicisi kullanılmıyorsa kaldır — önce grep ile doğrula.
3. Kullanılmayan dark token'ları sil; **kullanılanları tabloyla raporla.**
4. Tek kaynak: `app/globals.css`. Component içinde hardcoded hex **yasak**.

**Kritik:** Tema değişirse `capacitor.config.ts` içindeki
`SplashScreen.backgroundColor` ve `components/CapacitorBridge.tsx` içindeki
`StatusBar` rengi de güncellenmeli — yoksa mobilde açılışta renk sıçraması olur.

---

## PART 3 — v2.0'DA EKSİK OLAN 15 BOŞLUK (ASIL İŞ BURASI)

Her madde bir kabul kriteridir. "Tasarla" değil, "çalışır halde teslim et".

### 3.1 Onboarding (yeni)
`app/(app)/onboarding/page.tsx` — 3 adımlı sihirbaz: Sektör, Şirket büyüklüğü,
Öncelik. Sonuç `BusinessContext`'e yazılır (`setSector` zaten mevcut).
İlk girişte otomatik yönlendir; `onboardingCompletedAt` kullanıcıda saklanır.
Atlanabilir olmalı.

### 3.2 Empty states (her ana ekran için zorunlu)
Dashboard, Chat, Data Lab, Frameworks, Research. Her biri: ikon + tek cümle
açıklama + **tek bir birincil CTA**. Dashboard boşken "İlk analizinizi başlatın"
→ `/chat`. Pasif "veri yok" metni yasak.

### 3.3 Error states
- `app/error.tsx` (global) + her route için `error.tsx`
- `app/not-found.tsx`
- AI çağrısı başarısız: inline retry butonu, chat geçmişi korunur
- **`alert()` kullanımı yasak** — inline `role="alert"` veya toast
- Sunucu hata detayı istemciye sızmayacak (log'a yaz, kullanıcıya genel mesaj)

### 3.4 Loading states
Her route için `loading.tsx` + skeleton. Spinner yerine içerik şekilli skeleton.
`prefers-reduced-motion` desteklenecek.

### 3.5 Upload progress (Data Lab)
Aşamalar görünür: `Yükleniyor → Ayrıştırılıyor → Doğrulanıyor → Hazır`.
Yüzde göstergesi, iptal butonu, sürükle-bırak hover state.

### 3.6 CSV/Excel doğrulama UX
Hata **satır ve sütun numarasıyla** gösterilir: "Satır 42, 'gelir' sütunu:
sayı bekleniyordu, 'N/A' bulundu". İlk 10 hata listelenir, "hatalı satırları
atla ve devam et" seçeneği sunulur. Boş dosya, yanlış encoding, 200MB+ dosya
ayrı ayrı ele alınır.

### 3.7 Session management
`stores/useChatStore.ts`:
```ts
interface ChatSession {
  id: string; title: string; mode: Mode
  messages: Message[]; createdAt: number; updatedAt: number
}
interface ChatStore {
  sessions: ChatSession[]
  activeSessionId: string | null
  createSession(mode: Mode): string
  deleteSession(id: string): void
  renameSession(id: string, title: string): void
  appendMessage(sessionId: string, m: Message): void
}
```
`persist` middleware ile localStorage. Başlık ilk kullanıcı mesajından
otomatik üretilir. Sidebar'da listelenir, silme onay ister.

### 3.8 Mode → chat state akışı
Mod seçimi `useAppStore`'da tutulur, `/api/chat` gövdesinde `mode` olarak
gönderilir, sistem prompt'unu belirler. Aktif mod QueryBar'da rozet olarak
görünür. Oturum ortasında mod değişimi yeni oturum açar (veri karışmasın).

### 3.9 Streaming
Mevcut `ai` v3 paketiyle. **Mevcut orkestrasyonu koruyarak** streaming ekle.
İstemcide token token render, "durdur" butonu, `AbortController` ile iptal,
hata anında kısmi yanıt korunur.

### 3.10 Font FOUT
`next/font/google` ile `Inter`, `Cormorant_Garamond`, `JetBrains_Mono`.
`display: 'swap'`, CSS değişkeni olarak bağla.
`app/globals.css` içindeki tüm `@import url(fonts.googleapis...)` satırları silinecek.

### 3.11 Login / Signup sayfası
`app/(auth)/login/page.tsx` — Google OAuth + email magic link.
Hata durumları: geçersiz email, OAuth iptal, rate limit.
Giriş sonrası `callbackUrl`'e dönüş. Marka ile tutarlı, tek kolon, mobil öncelikli.

### 3.12 Tablet layout (768–1024px)
Kırılma noktaları netleştirilecek: `< 768` mobil (BottomDock),
`768–1023` tablet (daraltılmış sidebar + içerik), `≥ 1024` masaüstü (TopNav).
Tablet'te dashboard 2 kolon, Data Lab tablosu yatay kaydırmalı.

### 3.13 Export (PDF / Excel)
`ExportModal` bir yere bağlı değil. Bağla: Dashboard, Framework ve Data Lab
sonuç ekranlarına "Export" butonu. PDF için `@react-pdf/renderer` veya sunucu
tarafı render; Excel için `xlsx`. Marka başlığı + tarih + kaynak referansları
içerecek. Uzun işlemde progress göster.

### 3.14 Paywall tetikleyicisi
`PaywallModal` şu anda manuel. Tetikleyiciler:
- `/api/chat` veya `/api/analyze` **402 QUOTA_EXCEEDED** dönerse (sunucu kotası)
- Pro-only özellik: Frameworks AI-fill, PDF export, 10MB+ dosya
Modal kalan kullanımı gösterir. **İstemci sayacına güvenme** — 402 tek gerçek kaynaktır.

### 3.15 i18n tipleri
```ts
type TranslationKey = keyof typeof translations['tr']
function useLanguage(): {
  lang: 'tr' | 'en'
  setLang(l: 'tr' | 'en'): void
  t(key: TranslationKey, vars?: Record<string, string|number>): string
}
```
`t()` tip güvenli olacak — eksik anahtar derleme hatası versin.
Yeni eklenen tüm UI metinleri sözlüğe girecek; component içinde hardcoded
Türkçe/İngilizce metin kalmayacak.

---

## PART 4 — MİMARİ TEMİZLİK (referans doğrulaması ŞART)

Aşağıdaki dosyalar repoda **mevcut** (doğrulandı). Ama silmeden önce her biri
için `grep -r` sonucunu raporla:

```
components/SovereignDashboard.tsx      → dashboard'a birleştir
components/CatamaranResponseCard.tsx   → ExecutiveResponseCard'a birleştir
components/SynergyResponseCard.tsx     → ExecutiveResponseCard'a birleştir
components/AetherisShell.tsx           → AppShell'e taşı (ActionMatrixCard kullanıyor)
components/Dock.tsx                    → BottomDock'a taşı
```

**Taşımalar:**
```
components/AnsoffMatrix.tsx     → components/frameworks/
components/BcgMatrix.tsx        → components/frameworks/
components/DataLabChatPanel.tsx → components/data-lab/
components/kairos/              → features/data-lab/
```

**`kairos-data-lab/` (repo kökü):** `sail-ai/` dışında, ayrı bir proje.
Silmeden önce `app/data-lab/` ile içerik karşılaştırması yap ve raporla.
Onay almadan silme.

**Not:** `auth.config.ts` kökte yok, zaten `lib/auth/` altında. Taşıma gereksiz.

---

## PART 5 — EKLENECEK BAĞIMLILIKLAR

v2.0 promptundaki kod örnekleri bunları varsayıyor ama kurulu değiller:

```bash
npm i class-variance-authority   # Button cva variant'ları için
npm i @tanstack/react-table      # Data Lab tablosu için
npm i xlsx                       # Excel export
```

Zaten kurulu (tekrar kurma): `zustand`, `recharts`, `framer-motion`,
`@sentry/nextjs`, `ai`, `@ai-sdk/xai`, `@capacitor/*`.

---

## PART 6 — TASARIM SİSTEMİ

**Tek kaynak:** `app/globals.css` (CSS değişkenleri) + `tailwind.config.ts`.

**Type scale** (Inter tabanlı, `next/font` ile):
```
display-xl  Cormorant Garamond 600 italic  clamp(3rem,7vw,6rem)  → sadece landing hero
display-lg  Inter 700  2.25rem  -0.03em
h1          Inter 600  1.875rem -0.025em
h2          Inter 600  1.5rem   -0.02em
h3          Inter 600  1.125rem -0.01em
body        Inter 400  0.9375rem/1.65
body-sm     Inter 400  0.875rem/1.6
caption     Inter 500  0.75rem/1.4  0.02em
label       Inter 600  0.6875rem  0.12em UPPERCASE
code        JetBrains Mono 400  0.875rem
```

**Button variants:** `primary | secondary | ghost | danger | teal`
**Boyutlar:** `sm(36px) | md(44px) | lg(52px)` — dokunma hedefi **min 44px**.

**Arkaplan:** `LiquidSilverBg` saf CSS keyframe ile (requestAnimationFrame yok,
compositor thread'de kalsın). `TopoBackground` light mode'da görünür renk
kullanacak. Her ikisi de `prefers-reduced-motion: reduce` altında duracak.

---

## PART 7 — ERİŞİLEBİLİRLİK (pazarlığa kapalı)

- Tüm interaktif öğeler klavye ile erişilebilir, görünür `:focus-visible` halkası
- Modal'lar: `role="dialog"` + `aria-modal` + Escape ile kapanır + focus trap
- İkon-only butonlarda `aria-label`
- Metin kontrastı ≥ 4.5:1 (light tema üzerinde altın tonlarını **kontrol et**,
  `#C9A96E` beyaz üzerinde yetersiz — koyu varyant kullan)
- Canlı bölgeler: streaming yanıt `aria-live="polite"`
- Tüm görsellerde `alt`

---

## PART 8 — KABUL KRİTERLERİ (bunlar geçmeden "bitti" deme)

```
[ ] npx tsc --noEmit                → 0 hata
[ ] npx next build                  → başarılı
[ ] MOBILE_BUILD=true npx next build → başarılı
[ ] npx cap sync                    → başarılı
[ ] Kodda hiç alert() yok
[ ] Her ana route'ta empty + loading + error state var
[ ] Onboarding akışı uçtan uca çalışıyor
[ ] CSV hatası satır/sütun numarasıyla gösteriliyor
[ ] Chat oturumları yeniden yüklemede korunuyor
[ ] 402 QUOTA_EXCEEDED PaywallModal'ı tetikliyor
[ ] Export PDF ve Excel gerçekten dosya indiriyor
[ ] 375px / 768px / 1440px'de layout bozulmuyor
[ ] Klavye ile tüm uygulama gezilebiliyor
[ ] /api/payments/status hâlâ çalışıyor (ödeme bozulmadı)
[ ] Prisma şeması değişmediyse migration yok
```

---

## PART 9 — TESLİM FORMATI

Her adımda şunu raporla:
1. **Değişen dosyalar** (yol + neden)
2. **Silinen dosyalar** + silmeden önceki grep referans sayısı
3. **Bilinen riskler / geriye dönük uyumsuzluklar**
4. Build ve typecheck çıktısı

Emin olmadığın bir mimari kararda **dur ve sor** — varsayımla ilerleme.
