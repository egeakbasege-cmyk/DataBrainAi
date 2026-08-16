#!/usr/bin/env bash
#
# backup-mobile.sh — snapshot the mobile app into a single restorable archive.
#
# Produces:  backups/sail-ai-mobile-<UTC timestamp>.tar.gz
#            backups/sail-ai-mobile-latest.tar.gz   (symlink)
#
# What goes in: every source file needed to rebuild the native apps, plus the
# native project folders (android/, ios/) so signing configs, icons and any
# manual Xcode/Gradle tweaks survive. Regenerable/huge folders are excluded:
#   node_modules, .next, Pods, build outputs, .git
#
# The archive also contains RESTORE.md and the exact env-var names required, so
# it is self-describing months from now.
#
# Usage:  npm run mobile:backup
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/backups"
NAME="sail-ai-mobile-$STAMP"
ARCHIVE="$OUT_DIR/$NAME.tar.gz"

mkdir -p "$OUT_DIR"

# Record the exact state so a restore is reproducible.
GIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo 'not-a-git-repo')"
GIT_DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
NODE_V="$(node -v 2>/dev/null || echo unknown)"
REMOTE_URL="${MOBILE_REMOTE_URL:-https://data-brain-ai-sqqu.vercel.app}"

cat > "$ROOT/MOBILE_BACKUP_INFO.json" <<EOF
{
  "name":          "$NAME",
  "createdAt":     "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitSha":        "$GIT_SHA",
  "uncommittedFiles": $GIT_DIRTY,
  "nodeVersion":   "$NODE_V",
  "remoteUrl":     "$REMOTE_URL",
  "appId":         "com.databrain.sailai",
  "appName":       "Sail AI",
  "architecture":  "capacitor-remote-url-shell"
}
EOF

echo "→ Archiving mobile app  ($NAME)"

tar -czf "$ARCHIVE" \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./backups' \
  --exclude='./ios/App/Pods' \
  --exclude='./ios/App/build' \
  --exclude='./ios/App/DerivedData' \
  --exclude='./android/build' \
  --exclude='./android/app/build' \
  --exclude='./android/.gradle' \
  --exclude='./android/local.properties' \
  --exclude='*.log' \
  --exclude='./.env*.local' \
  --exclude='./.vercel' \
  .

rm -f "$ROOT/MOBILE_BACKUP_INFO.json"

# Stable pointer to the most recent snapshot.
ln -sf "$NAME.tar.gz" "$OUT_DIR/sail-ai-mobile-latest.tar.gz"

SIZE="$(du -h "$ARCHIVE" | cut -f1)"

cat <<EOF

✅ Backup complete
   Archive : $ARCHIVE
   Size    : $SIZE
   Latest  : $OUT_DIR/sail-ai-mobile-latest.tar.gz
   Git SHA : $GIT_SHA

   NOTE: secrets (.env*.local) are intentionally NOT included.
         Recover them with:  vercel env pull .env.local

   Restore with:  npm run mobile:restore
EOF
