# Sail AI - Mobil Uygulama Build Rehberi

## ÖNEMLİ: Mimari Kısıtlama

Mevcut Sail AI projesi **NextAuth.js** kullanıyor ve bu sunucu taraflı çalışıyor.
Capacitor ile static export yapıldığında API route'ları (auth, webhook, vb.) çalışmaz.

## Çözüm: Hybrid Yaklaşım

### 1. Web Versiyonu (Mevcut)
- Normal Next.js build
- Sunucu taraflı auth, API route'ları
- Vercel deployment
- **Komut**: `npm run build`

### 2. Mobil Versiyonu (Yeni)
- Sadece static sayfalar
- Auth: Token-based veya native (Apple/Google Sign-In)
- API: Direkt backend'e bağlan (Railway)
- Capacitor ile native uygulama
- **Komut**: `npm run build:mobile`

## Mobil Build Adımları

### Hazırlık
```bash
# 1. Asset'leri hazırla
# assets/icon.png (1024x1024)
# assets/splash.png (2732x2732)

# 2. Capacitor platformlarını ekle
npx cap add android
npx cap add ios
```

### Build
```bash
# 3. Static export yap (API route'ları olmadan)
MOBILE_BUILD=true npm run build:mobile

# 4. Capacitor'a kopyala
npx cap sync

# 5. IDE'de aç
npx cap open android
npx cap open ios
```

## Auth Stratejisi (Mobil)

### Seçenek A: Token-Based Auth
1. Kullanıcı login sayfasında email/şifre girer
2. Direkt Railway backend'e istek atılır
3. JWT token alınır
4. Token AsyncStorage'da saklanır
5. Her istekte Authorization header'ına eklenir

### Seçenek B: Native Social Auth
- Android: Google Sign-In
- iOS: Apple Sign-In
- Sonuç: Backend'e token gönder, session oluştur

## Dosya Yapısı

```
sail-ai/
├── app/                    # Web + Mobil ortak sayfalar
│   ├── (marketing)/        # Landing, pricing, login
│   └── chat/               # Chat arayüzü
├── mobile/                 # Mobil-specific dosyalar
│   ├── auth/               # Token-based auth hook'ları
│   └── native/             # Capacitor plugin wrapper'ları
├── android/                # Capacitor Android projesi
├── ios/                    # Capacitor iOS projesi
├── assets/                 # Icon + Splash
└── out/                    # Static export çıktısı
```

## Önemli Notlar

1. **API Route'ları**: `/api/auth/*`, `/api/webhook` gibi route'lar static export'ta çalışmaz.
   Çözüm: Bu route'ları mobilde kullanma, direkt backend'e bağlan.

2. **NextAuth**: Sunucu taraflı session yönetimi. Mobilde AsyncStorage + JWT kullan.

3. **Image Optimization**: Static export'ta `next/image` optimizasyonu çalışmaz.
   Çözüm: `unoptimized: true` ayarlandı.

4. **Environment Variables**: Mobil build'de `.env.local` çalışmaz.
   Çözüm: Build sırasında inject et veya runtime'da config'den oku.

## Sonraki Adımlar

1. [ ] Auth hook'unu token-based olarak yeniden yaz
2. [ ] API client'ı oluştur (Railway backend'e direkt bağlanan)
3. [ ] Native plugin'leri entegre et (Camera, Push Notification)
4. [ ] App Store / Play Store için sertifikaları hazırla
