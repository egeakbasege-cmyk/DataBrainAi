#!/usr/bin/env bash
#
# restore-mobile.sh — restore the mobile app from a backup archive and bring it
# to a runnable state in one command.
#
# Usage:
#   npm run mobile:restore                       # restore the latest snapshot
#   bash scripts/restore-mobile.sh <archive.tar.gz> [target-dir]
#
# Steps performed:
#   1. Extract the archive into a target directory
#   2. npm install
#   3. prisma generate
#   4. Pull secrets from Vercel (if the CLI is linked)
#   5. npx cap sync   → native projects ready to open
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ARCHIVE="${1:-$ROOT/backups/sail-ai-mobile-latest.tar.gz}"
TARGET="${2:-$ROOT/../sail-ai-restored}"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "✖ Archive not found: $ARCHIVE"
  echo "  Create one first with:  npm run mobile:backup"
  exit 1
fi

echo "→ Restoring $ARCHIVE"
echo "  into      $TARGET"

mkdir -p "$TARGET"
tar -xzf "$ARCHIVE" -C "$TARGET"

cd "$TARGET"

if [[ -f MOBILE_BACKUP_INFO.json ]]; then
  echo "→ Snapshot metadata:"
  cat MOBILE_BACKUP_INFO.json
fi

echo "→ Installing dependencies (this is the slow step)…"
npm install --no-audit --no-fund

echo "→ Generating Prisma client…"
npx prisma generate >/dev/null

# Secrets are never archived; pull them back from Vercel when possible.
if command -v vercel >/dev/null 2>&1 || [[ -d .vercel ]]; then
  echo "→ Pulling environment variables from Vercel…"
  npx --yes vercel@latest env pull .env.local 2>/dev/null \
    || echo "  ⚠ Could not pull env vars — run 'npx vercel link' then 'npx vercel env pull .env.local'"
else
  echo "  ⚠ Vercel CLI not linked — create .env.local manually (see MOBILE_BUILD_GUIDE.md)"
fi

echo "→ Syncing Capacitor native projects…"
npx cap sync

cat <<EOF

✅ Restore complete → $TARGET

   Open the native projects:
     cd "$TARGET"
     npx cap open ios        # requires Xcode
     npx cap open android    # requires Android Studio

   Or run the web app:
     npm run dev
EOF
