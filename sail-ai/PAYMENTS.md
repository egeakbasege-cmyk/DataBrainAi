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
lib/payments/dodo-provider.ts    → Dodo checkout / müşteri portalı
lib/payments/stripe-provider.ts  → Stripe checkout / billing portal
app/api/checkout/route.ts        → sağlayıcıdan bağımsız checkout
app/api/webhook/route.ts         → Lemon Squeezy webhook
app/api/webhook/stripe/route.ts  → Stripe webhook
app/api/webhook/dodo/route.ts    → Dodo webhook (Standard Webhooks imzası)
app/api/subscription/portal/     → üç sağlayıcı için abonelik yönetimi
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

## 4. Seçenek B — Dodo Payments (ÖNERİLEN, kurulu)

Türkiye'den satış yapmak için tek gerçekçi "hem global hem TR" seçeneği.
Neden diğerleri değil:

- **Stripe Türkiye'yi desteklemiyor.** Türkiye'de yerleşik bir şirketle
  doğrudan Stripe hesabı açılamıyor; ABD/İngiltere tüzel kişiliği gerekiyor.
  `stripe-provider.ts` yalnızca o senaryo için duruyor.
- **Lemon Squeezy'nin mağaza para birimi tek ve global.** Alıcının ülkesine
  göre değişmiyor — TRY seçilirse yurt dışı müşteri de TRY görüyor.

Dodo'da doğrulananlar:

| | Durum |
|---|---|
| Türk satıcı kabulü | ✅ resmi ülke listesinde ("Türkiye"), TC kimlik ile doğrulama |
| Şirket zorunluluğu | ❌ kayıtlı işletmesi olmayan bireyler onboard olabiliyor |
| Türk banka hesabına payout | ✅ |
| Checkout para birimi | ✅ 80+ para birimi, alıcı bölgesine göre (TR müşteri ₺ görür) |
| Global KDV / sales tax | ✅ merchant of record — yükümlülük platformda |
| Abonelik | ✅ native (trial, plan değişimi, usage-based) |
| Komisyon | %4 + $0.40 · +%1.5 uluslararası · +%0.5 abonelik |

### Kurulum

1. [app.dodopayments.com](https://app.dodopayments.com) → kaydol, kimlik
   doğrulamasını tamamla (şirket beklemek gerekmiyor).
2. **Products** → "Sail AI Pro" → tekrarlayan fiyat → `product_id` kopyala.
3. **Developer → API Keys** → **canlı** anahtar üret.
4. **Developer → Webhooks** → endpoint ekle:
   - URL: `https://<alan-adın>/api/webhook/dodo`
   - Olaylar: `subscription.active`, `subscription.renewed`,
     `subscription.plan_changed`, `subscription.unpaused`,
     `subscription.cancelled`, `subscription.expired`, `subscription.failed`,
     `subscription.paused`, `subscription.on_hold`, `refund.succeeded`,
     `dispute.lost`
   - Signing secret (`whsec_...`) kopyala.
5. Vercel ortam değişkenleri:

```bash
vercel env add DODO_PAYMENTS_API_KEY  production
vercel env add DODO_PRODUCT_ID        production
vercel env add DODO_WEBHOOK_SECRET    production   # whsec_...
vercel env add DODO_ENVIRONMENT       production   # live
vercel env add PAYMENT_PROVIDER       production   # dodo
```

6. Deploy et ve `/api/payments/status` ile doğrula:
   `{ "active": "dodo", "dodo": { "liveMode": true }, "healthy": true }`

### Bilinmesi gerekenler

- **Payout eşiği $1.000.** Altındaki çekimlerde $5 kesinti var; düşük hacimde
  bakiyeyi biriktirip çekmek mantıklı.
- **Taksit belirsiz.** Dodo'nun Türkiye sayfası taksitten söz ediyor ama hangi
  bankalar / kaç taksit dokümante edilmemiş. Taksit kritikse yurt içi satış için
  iyzico/PayTR gerekir.
- **Genç şirket.** MoR modelinde para bir süre sağlayıcının bakiyesinde durur;
  bu bir karşı taraf riskidir.

### Webhook güvenliği

Dodo, Standard Webhooks spesifikasyonunu kullanıyor: `webhook-id`,
`webhook-timestamp`, `webhook-signature` başlıkları ve
`{id}.{timestamp}.{body}` üzerinde HMAC-SHA256. Doğrulama `node:crypto` ile
elle yapıldı (ek bağımlılık yok), 5 dakikalık replay toleransı var ve imza
**ham gövde** üzerinden kontrol ediliyor — gövdeyi parse edip yeniden
serileştirmek bayt sırasını değiştirip doğrulamayı kırardı.

Pro yetkisi **yalnızca Dodo'nun kontrol ettiği alanlardan** veriliyor;
`metadata` checkout çağrısından geri yansıtıldığı için güvenilmez girdi kabul
edilir ve yetkilendirmede kullanılmaz.

---

## 4b. Seçenek C — Stripe (yalnızca ABD/İngiltere tüzel kişiliği varsa)

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

## 5. Değerlendirilen diğer alternatifler

| Sağlayıcı | Model | Neden seçilmedi |
|---|---|---|
| **Polar.sh** | MoR | Türkiye destekli, iyi alternatif. Dodo daha basit onboarding (şirket gerektirmiyor) ve alıcı bazlı para birimi sunuyor. |
| **Paddle** | MoR | Onay süreci ağır, minimum hacim beklentisi var. |
| **Creem** | MoR | Ülke desteği net dokümante edilmemiş. |
| **iyzico** | Yerel PSP | TL + taksit + e-fatura ✅ ama global KDV yükümlülüğü sende. Komisyon ~%4.29. |
| **PayTR** | Yerel PSP | En ucuz (~%2.19) ve ertesi gün ödeme, ama şirket + vergi levhası + mesafeli satış sayfaları gerekiyor. |

**Hibrit yol (gelecek):** TR ziyaretçiyi iyzico'ya, diğerlerini Dodo'ya
yönlendirmek — taksit ve e-fatura gerçekten gerekli olduğunda. Vercel'in
`x-vercel-ip-country` başlığı ülke tespiti için yeterli; `activeProvider()`
fonksiyonunu istek bazlı hale getirmek dışında çağrı noktaları değişmez.

Yeni sağlayıcı eklemek için `lib/payments/dodo-provider.ts` dosyasını şablon
alıp `lib/payments/index.ts` içindeki `activeProvider()` ve `createCheckout()`
fonksiyonlarına bir dal eklemek yeterli — route'lar değişmez.

---

## 6. Kalan iş: yıllık plan

Yıllık fiyatlandırmayı gerçekten satmak için:

1. Sağlayıcıda yıllık bir fiyat/varyant oluştur.
2. `STRIPE_PRICE_ID_YEARLY` (veya `LEMONSQUEEZY_VARIANT_ID_YEARLY`) ekle.
3. `POST /api/checkout` gövdesine `{ interval: 'year' }` geçir ve
   `createCheckout` içinde ilgili fiyatı seç.

Bu yapılana kadar pricing sayfasındaki yıllık seçeneği gizlemek, yanlış
faturalandırma beklentisini önler.
