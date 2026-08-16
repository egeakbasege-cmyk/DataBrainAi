# Ödeme Sistemi — Teşhis ve Kurulum

## 1. "Ödeme çalışmıyor" — kök neden

Lemon Squeezy API'si canlı olarak test edildi. Kod **doğru çalışıyor** —
checkout isteği `201 Created` dönüyor ve geçerli bir URL üretiyor. Sorun
koddan değil, **hesap yapılandırmasından** kaynaklanıyor:

### Bulgu 1 — API anahtarı TEST MODUNDA

`GET /v1/users/me` yanıtı:

```json
{ "meta": { "test_mode": true } }
```

Bu, üretilen her checkout'un bir **test checkout'u** olduğu anlamına gelir.
Sayfa normal görünür, ödeme "başarılı" olur, ama **gerçek kart çekilmez ve
gerçek para tahsil edilmez**. Kullanıcı açısından "ödeme alamıyorum" tam olarak
budur.

### Bulgu 2 — Mağaza aktive edilmemiş

`GET /v1/stores` yanıtı:

```
plan:        "free"
total_sales: 0
```

Lemon Squeezy'de `free` planındaki bir mağaza **canlı ödeme alamaz**. Canlı
moda geçmek için mağazanın Lemon Squeezy tarafından incelenip onaylanması
(store activation) ve ödeme/payout bilgilerinin tamamlanması gerekir.

### Bulgu 3 — Webhook yalnızca test modunda kayıtlı

Kayıtlı webhook test modunda olduğu için, canlı bir satış gerçekleşse bile
`markPro()` tetiklenmez ve kullanıcı **ödediği halde Pro olmaz**.

### Bulgu 4 — Yıllık plan bağlı değil

`app/pricing/page.tsx` içinde aylık/yıllık geçişi var, ancak checkout tek bir
`LEMONSQUEEZY_VARIANT_ID` kullanıyor. Mağazada da tek varyant tanımlı
($9.99/ay). Yıllık seçilse bile aylık ürün satın alınır.

---

## 2. Çözüm — çok sağlayıcılı mimari

Ödeme sağlayıcısı tek arıza noktası olmaktan çıkarıldı. Artık bir env
değişkeniyle sağlayıcı değiştirilebiliyor.

```
lib/payments/index.ts            → sağlayıcı seçimi + createCheckout()
lib/payments/stripe-provider.ts  → Stripe checkout / billing portal
app/api/checkout/route.ts        → sağlayıcıdan bağımsız checkout
app/api/webhook/route.ts         → Lemon Squeezy webhook (mevcut)
app/api/webhook/stripe/route.ts  → Stripe webhook (yeni)
app/api/subscription/portal/     → her iki sağlayıcı için abonelik yönetimi
app/api/payments/status/         → teşhis endpoint'i
```

Seçim mantığı (`PAYMENT_PROVIDER`):

| Değer | Davranış |
|---|---|
| `stripe` | Stripe kullanılır |
| `lemonsqueezy` | Lemon Squeezy kullanılır |
| *(boş)* | Otomatik: yapılandırılmış olan seçilir, **Stripe önceliklidir** |

### Teşhis endpoint'i

Giriş yaptıktan sonra:

```
GET /api/payments/status
```

Sırları göstermeden şunu döner: hangi sağlayıcı aktif, canlı modda mı, webhook
sırrı tanımlı mı, ve tespit edilen sorunların listesi. Lemon Squeezy için
`test_mode` bayrağını doğrudan API'den okur.

---

## 3. Seçenek A — Lemon Squeezy'yi düzelt

1. Lemon Squeezy panelinde **Settings → Stores** → mağazayı **aktive et**
   (kimlik/işletme bilgileri + payout hesabı).
2. Onay sonrası **Settings → API** → **yeni bir canlı API anahtarı** üret.
3. Vercel'de güncelle:
   ```bash
   vercel env rm LEMONSQUEEZY_API_KEY production
   vercel env add LEMONSQUEEZY_API_KEY production
   ```
4. **Settings → Webhooks** → canlı modda yeni webhook:
   - URL: `https://<alan-adın>/api/webhook`
   - Olaylar: `subscription_created`, `subscription_updated`,
     `subscription_cancelled`, `subscription_expired`, `order_created`
   - Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`
5. Doğrula: `/api/payments/status` → `lemonsqueezy.liveMode: true`.

> Not: Lemon Squeezy Merchant of Record'dur; Türkiye merkezli mağazalarda
> aktivasyon süreci uzayabiliyor. Bu yüzden Stripe alternatifi eklendi.

---

## 4. Seçenek B — Stripe'a geç (önerilen)

Stripe SDK zaten bağımlılıklarda mevcuttu; `lib/proStore.ts` de Stripe
aboneliklerini okuyabiliyordu. Eksik olan checkout, webhook ve portal
tarafıydı — bunlar eklendi.

### Kurulum

1. [dashboard.stripe.com](https://dashboard.stripe.com) → hesabı aktive et.
2. **Products** → "Sail AI Pro" → tekrarlayan fiyat ($9.99/ay) → `price_...`
   kimliğini kopyala.
3. **Developers → API keys** → **canlı** secret key (`sk_live_...`).
4. **Developers → Webhooks** → endpoint ekle:
   - URL: `https://<alan-adın>/api/webhook/stripe`
   - Olaylar: `checkout.session.completed`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Signing secret (`whsec_...`) kopyala.
5. Vercel ortam değişkenleri:

```bash
vercel env add STRIPE_SECRET_KEY      production   # sk_live_...
vercel env add STRIPE_PRICE_ID        production   # price_...
vercel env add STRIPE_WEBHOOK_SECRET  production   # whsec_...
vercel env add PAYMENT_PROVIDER       production   # stripe
```

6. Deploy et ve `/api/payments/status` ile doğrula:
   `{ "active": "stripe", "stripe": { "liveMode": true }, "healthy": true }`

### Yerel test

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

---

## 5. Türkiye için diğer alternatifler

Stripe doğrudan Türkiye'de hesap açılışını desteklemiyorsa:

| Sağlayıcı | Model | Not |
|---|---|---|
| **Paddle** | Merchant of Record | KDV/vergiyi üstlenir, TR satıcıları kabul eder. Lemon Squeezy'ye en yakın alternatif. |
| **Polar.sh** | Merchant of Record | Geliştirici odaklı, hızlı onboarding. |
| **Creem** | Merchant of Record | SaaS için, TR dahil geniş destek. |
| **iyzico / PayTR** | Yerel PSP | TL tahsilat, yurt içi satış için ideal; abonelik desteği var. |

Yeni bir sağlayıcı eklemek için `lib/payments/stripe-provider.ts` dosyasını
şablon alıp `lib/payments/index.ts` içindeki `activeProvider()` ve
`createCheckout()` fonksiyonlarına bir dal eklemek yeterli — route'lar
değişmez.

---

## 6. Kalan iş: yıllık plan

Yıllık fiyatlandırmayı gerçekten satmak için:

1. Sağlayıcıda yıllık bir fiyat/varyant oluştur.
2. `STRIPE_PRICE_ID_YEARLY` (veya `LEMONSQUEEZY_VARIANT_ID_YEARLY`) ekle.
3. `POST /api/checkout` gövdesine `{ interval: 'year' }` geçir ve
   `createCheckout` içinde ilgili fiyatı seç.

Bu yapılana kadar pricing sayfasındaki yıllık seçeneği gizlemek, yanlış
faturalandırma beklentisini önler.
