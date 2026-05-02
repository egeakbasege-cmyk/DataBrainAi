#!/bin/bash

# Sail AI - Capacitor Asset Generation Script
#
# Generates all native app icons and splash screens from:
#   assets/icon.png    (1024×1024 — Liquid Gold logo on #0C0C0E background)
#   assets/splash.png  (2732×2732 — same logo centred, black bg, logo ~30% of canvas)
#
# ── LOGO INTEGRATION (1.jpg → production assets) ──────────────────────────────
#
# If you have the new gold logo as 1.jpg, run this BEFORE calling this script:
#
#   Step 1: Convert to icon (requires ImageMagick)
#     magick 1.jpg \
#       -background "#0C0C0E" \
#       -gravity center \
#       -resize 900x900 \
#       -extent 1024x1024 \
#       -quality 100 \
#       assets/icon.png
#
#   Step 2: Generate splash screen (logo centred on black canvas)
#     magick 1.jpg \
#       -background "#0C0C0E" \
#       -gravity center \
#       -resize 820x820 \
#       -extent 2732x2732 \
#       -quality 100 \
#       assets/splash.png
#
#   Step 3: Run this script
#     npm run assets:generate
#
# Without ImageMagick: use any design tool to export at the sizes above.
# Figma template: Black (#0C0C0E) background, logo centred at 88% of canvas width.
#
# ── Visual Identity spec ───────────────────────────────────────────────────────
# Background:  #0C0C0E  (matches capacitor.config.ts SplashScreen.backgroundColor)
# Logo tint:   Liquid Gold — #C9A96E gradient to #E8C87A
# Safe zone:   20px padding around icon edges (App Store requirement)
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "🎨 Sail AI - Asset Generation (Liquid Gold Edition)"
echo "====================================================="

# ── Preflight checks ──────────────────────────────────────────────────────────

if [ ! -f "assets/icon.png" ]; then
    echo ""
    echo "❌  assets/icon.png not found."
    echo ""
    echo "    To create it from 1.jpg (requires ImageMagick):"
    echo "    magick 1.jpg -background \"#0C0C0E\" -gravity center -resize 900x900 -extent 1024x1024 assets/icon.png"
    echo ""
    echo "    Or export manually: 1024×1024px, black background, logo centred."
    exit 1
fi

if [ ! -f "assets/splash.png" ]; then
    echo ""
    echo "❌  assets/splash.png not found."
    echo ""
    echo "    To create it from 1.jpg (requires ImageMagick):"
    echo "    magick 1.jpg -background \"#0C0C0E\" -gravity center -resize 820x820 -extent 2732x2732 assets/splash.png"
    echo ""
    echo "    Or export manually: 2732×2732px, black background, logo ~30% of canvas."
    exit 1
fi

# Verify dimensions (requires ImageMagick identify)
if command -v identify &> /dev/null; then
    ICON_SIZE=$(identify -format "%wx%h" "assets/icon.png" 2>/dev/null || echo "unknown")
    SPLASH_SIZE=$(identify -format "%wx%h" "assets/splash.png" 2>/dev/null || echo "unknown")
    echo "✅  icon.png:   ${ICON_SIZE}  (required: 1024×1024 minimum)"
    echo "✅  splash.png: ${SPLASH_SIZE} (required: 2732×2732 minimum)"
else
    echo "✅  Asset files found (install ImageMagick for dimension verification)"
fi

if ! command -v npx &> /dev/null; then
    echo "❌  npx not found. Ensure Node.js is installed."
    exit 1
fi

echo ""
echo "📱 Generating assets for Android and iOS..."
echo ""

# Generate all platform assets via @capacitor/assets
# This produces: adaptive icons, round icons, splash variations, etc.
npx @capacitor/assets generate \
    --iconBackgroundColor "#0C0C0E" \
    --iconBackgroundColorDark "#0C0C0E" \
    --splashBackgroundColor "#0C0C0E" \
    --splashBackgroundColorDark "#0C0C0E"

echo ""
echo "✅  Asset generation complete!"
echo ""
echo "Next steps:"
echo "  npx cap sync              — copy web assets + plugins to native projects"
echo "  npx cap open ios          — open in Xcode"
echo "  npx cap open android      — open in Android Studio"
echo ""
echo "Validate:"
echo "  iOS:     Xcode → Target → App Icons (check all sizes populated)"
echo "  Android: android/app/src/main/res/mipmap-* (check ic_launcher files)"
echo ""
