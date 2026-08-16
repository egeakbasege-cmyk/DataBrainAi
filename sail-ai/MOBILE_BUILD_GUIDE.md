# Sail AI — Mobil Uygulama Rehberi

Bu doküman mobil uygulamanın **nasıl çalıştığını**, **nasıl derleneceğini** ve
**yedekten nasıl geri getirileceğini** anlatır.

---

## 1. Mimari — neden "remote URL shell"?

Uygulama, dağıtılmış Next.js sunucusunu bir native WebView içinde açan bir
**Capacitor remote-URL kabuğu**dur.

Eskiden `capacitor.config.ts` içinde `webDir: 'out'` vardı ve
`MOBILE_BUILD=true next build` ile static export deneniyordu. **Bu hiçbir zaman
çalışmadı** — build şu hatayla düşüyordu:

```
Error: Page "/api/auth/[...nextauth]" is missing "generateStaticParams()"
       so it cannot be used with "output: export" config.
```

Sebep yapısal: `output: 'export'` şunlarla bir arada olamaz:

| Özellik | Static export ile durumu |
|---|---|
| NextAuth `/api/auth/[...nextauth]` | ✖ Çalışmaz |
| Node runtime API route'ları (`/api/chat`, `/api/analyze`, webhook'lar) | ✖ Çalışmaz |
| Sunucu taraflı oturum / `auth()` | ✖ Çalışmaz |
| `headers()` güvenlik başlıkları | ✖ Yok sayılır |

Bunların hepsi bu üründe zorunlu olduğu için static export yolu **tamamen
kaldırıldı**. Bunun yerine native uygulama sunucuyu uzaktan yükler.

**Kazanımlar**

- Auth, API route'ları, SSR ve streaming hiç değişmeden çalışır.
- Vercel'e deploy = uygulama anında güncellenir (mağaza incelemesi beklemez).
- Tek kod tabanı; mobil için ayrı bir API yüzeyi yok.

**Bilinmesi gereken sınırlar**

- Uygulama **internet gerektirir**. Bağlantı yoksa `mobile-shell/index.html`
  içindeki çevrimdışı ekran gösterilir.
- Apple App Store 4.2 ("minimum functionality") riski: sadece web sitesini
  saran uygulamalar reddedilebilir. Bunu azaltmak için native splash, status
  bar entegrasyonu ve donanım geri tuşu desteği eklendi
  (`components/CapacitorBridge.tsx`). Push bildirimi / biyometrik giriş eklemek
  onay şansını belirgin şekilde artırır.

---

## 2. Yapılandırma

Hedef sunucu `capacitor.config.ts` içinde şu sırayla belirlenir:

1. `DEV_SERVER_URL` (yerel geliştirme)
2. `MOBILE_REMOTE_URL`
3. Varsayılan: `https://data-brain-ai-sqqu.vercel.app`

```bash
# Üretim sunucusuna bağla (varsayılan)
npm run mobile:sync

# Farklı bir dağıtıma bağla
MOBILE_REMOTE_URL=https://app.sailai.co npm run mobile:sync
```

`allowNavigation` listesi Google OAuth, Stripe ve Lemon Squeezy alan adlarını
içerir — aksi halde giriş/ödeme akışı WebView içinde boş sayfada takılır.

---

## 3. Gereksinimler

| Platform | Gerekli |
|---|---|
| iOS | macOS + **Xcode** (App Store'dan) + CocoaPods + Apple Developer hesabı ($99/yıl) |
| Android | **Android Studio** + JDK 17 |

> Bu makinede şu an Xcode ve Android SDK **kurulu değil**, bu yüzden native
> ikili (`.ipa` / `.aab`) üretilemedi. Aşağıdaki adımlar bunlar kurulduğunda
> doğrudan çalışır; native projeler (`ios/`, `android/`) hazır durumda.

---

## 4. Derleme adımları

### 4.1 Ortak hazırlık

```bash
cd sail-ai
npm install
npx prisma generate
npm run mobile:sync        # capacitor.config.ts → native projelere yazılır
```

### 4.2 iOS

```bash
npx cap open ios
```

Xcode içinde:

1. **Signing & Capabilities** → Team seç, Bundle ID `com.databrain.sailai`.
2. Cihaz/simülatör seç → **Run** (⌘R) ile test et.
3. Yayın için: **Product → Archive** → **Distribute App** → App Store Connect.
4. App Store Connect'te uygulama kaydı, ekran görüntüleri, gizlilik formu.

### 4.3 Android

```bash
npx cap open android
```

Android Studio içinde:

1. **Build → Generate Signed Bundle / APK** → *Android App Bundle*.
2. Keystore oluştur veya mevcut olanı seç — **keystore dosyasını ve şifresini
   kaybetme**, aksi halde uygulamayı bir daha güncelleyemezsin.
3. Çıkan `.aab` dosyasını Google Play Console'a yükle.

### 4.4 Yerel sunucuya karşı canlı test

```bash
npm run dev   # ayrı bir terminalde

DEV_SERVER_URL=http://$(ipconfig getifaddr en0):3000 npx cap sync
npx cap open ios   # veya android
```

Telefon ile bilgisayar aynı Wi-Fi ağında olmalı.

### 4.5 İkonlar ve splash

```bash
npm run assets:install
npm run assets:generate
```

---

## 5. Yedekleme ve geri yükleme

### Yedek al

```bash
npm run mobile:backup
```

Üretir:

```
backups/sail-ai-mobile-<UTC-zaman-damgası>.tar.gz
backups/sail-ai-mobile-latest.tar.gz      → en son yedeğe symlink
```

Arşiv **içerir**: tüm kaynak kod, `android/`, `ios/` native projeleri (imza
ayarları ve ikonlar dahil), `mobile-shell/`, ve durumu kaydeden
`MOBILE_BACKUP_INFO.json` (git SHA, Node sürümü, hedef URL).

Arşiv **içermez** (bilinçli olarak): `node_modules`, `.next`, `.git`, `Pods`,
Gradle/Xcode build çıktıları ve **sırlar** (`.env*.local`, `.vercel`).

### Geri yükle

```bash
npm run mobile:restore
# veya belirli bir arşivden / hedefe:
bash scripts/restore-mobile.sh backups/sail-ai-mobile-20260816-173157.tar.gz ~/sail-ai-geri
```

Script sırayla: arşivi açar → `npm install` → `prisma generate` → Vercel'den
ortam değişkenlerini çeker → `npx cap sync`. Sonunda proje doğrudan
`npx cap open ios/android` ile açılabilir durumdadır.

Sırlar arşivde olmadığı için gerekirse elle:

```bash
npx vercel link
npx vercel env pull .env.local
```

---

## 6. Ödeme akışı ve mobil

Mağaza kuralları dijital içerik için uygulama içi satın alma zorunlu tutabilir.
Web tabanlı checkout (Stripe / Lemon Squeezy) harici tarayıcıda açılmalıdır;
`allowNavigation` bunu WebView içinde de mümkün kılar ama App Store incelemesi
için abonelik satışını mobil uygulamada gizlemek ya da native IAP eklemek
gerekebilir. Detay: `PAYMENTS.md`.
