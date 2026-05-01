#!/bin/bash

# Sail AI - Capacitor Asset Generation Script
# 
# Bu script, assets/ klasöründeki icon ve splash görüntülerinden
# tüm native platformlar için gerekli boyutları otomatik üretir.
#
# Gereksinimler:
# - assets/icon.png (1024x1024px minimum)
# - assets/splash.png (2732x2732px minimum)
#
# Kullanım:
#   chmod +x scripts/generate-assets.sh
#   ./scripts/generate-assets.sh

set -e

echo "🎨 Sail AI - Asset Generation"
echo "=============================="

# Kontrol: Dosyalar var mı?
if [ ! -f "assets/icon.png" ]; then
    echo "❌ Hata: assets/icon.png bulunamadı!"
    echo "   Lütfen 1024x1024px boyutunda bir ikon ekleyin."
    exit 1
fi

if [ ! -f "assets/splash.png" ]; then
    echo "❌ Hata: assets/splash.png bulunamadı!"
    echo "   Lütfen 2732x2732px boyutunda bir splash screen ekleyin."
    exit 1
fi

echo "✅ Asset dosyaları bulundu"

# capacitor-assets paketini kontrol et
if ! command -v npx &> /dev/null; then
    echo "❌ Hata: npx bulunamadı. Node.js kurulu olduğundan emin olun."
    exit 1
fi

echo ""
echo "📱 Android ve iOS için asset'ler üretiliyor..."
echo ""

# Tüm asset'leri üret
npx capacitor-assets generate --android --ios

echo ""
echo "✅ Asset üretimi tamamlandı!"
echo ""
echo "Sonraki adımlar:"
echo "  1. npx cap sync"
echo "  2. npx cap open android  (Android Studio)"
echo "  3. npx cap open ios      (Xcode)"
echo ""
