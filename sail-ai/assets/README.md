# Capacitor Asset Generation

## Gerekli Dosyalar

Aşağıdaki dosyaları `assets/` klasörüne yerleştirin:

1. `assets/icon.png` - Uygulama ikonu (1024x1024px, PNG)
2. `assets/splash.png` - Splash screen (2732x2732px, PNG)

## Asset Üretim Komutu

Dosyalar hazır olduktan sonra:

```bash
# Capacitor assets paketini kur
npm install -g @capacitor/assets

# Tüm platformlar için ikon ve splash screen üret
npx capacitor-assets generate --android --ios
```

Bu komut:
- Android için: `android/app/src/main/res/` altına tüm boyutları oluşturur
- iOS için: `ios/App/App/Assets.xcassets/` altına tüm boyutları oluşturur

## Manuel Asset Yerleştirme (Alternatif)

Eğer @capacitor/assets kullanmak istemezseniz:

### Android
- `android/app/src/main/res/mipmap-*` klasörlerine ikonları kopyala
- `android/app/src/main/res/drawable-*` klasörlerine splash screen kopyala

### iOS
- Xcode'u aç: `npx cap open ios`
- Assets.xcassets/AppIcon.appiconset içine ikonları sürükle
- LaunchScreen.storyboard'dan splash screen ayarla

## Not
- Icon: Arka planı şeffaf olmayan, merkezi logo içeren kare görsel
- Splash: Koyu arka plan (#0C0C0E), ortada logo, altında "Sail AI" yazısı
