#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/release-r2.local.sh         # patch
#   ./scripts/release-r2.local.sh minor   # minor
#   ./scripts/release-r2.local.sh major   # major

BUMP_TYPE="${1:-patch}"
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Invalid bump type: $BUMP_TYPE"
  echo "Use: patch | minor | major"
  exit 1
fi

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes first."
  exit 1
fi

if [[ ! -f .env.r2.local ]]; then
  echo "Missing .env.r2.local"
  exit 1
fi

set -a
source .env.r2.local
set +a

: "${R2_S3_ENDPOINT:?R2_S3_ENDPOINT is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_PUBLIC_BASE_URL:?R2_PUBLIC_BASE_URL is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

echo "Bumping version ($BUMP_TYPE)..."
npm version "$BUMP_TYPE"
VERSION="v$(node -p "require('./package.json').version")"
RELEASE_DIR="release/${VERSION#v}"

echo "Building macOS artifacts for $VERSION..."
npx vue-tsc
npx vite build
npx electron-builder --mac dmg zip --universal --publish never
npx electron-builder --mac dmg zip --x64 --publish never

MAC_UNIVERSAL_DMG="$RELEASE_DIR/YouPastor-Mac-universal-Installer.dmg"
MAC_INTEL_DMG="$RELEASE_DIR/YouPastor-Mac-x64-Installer.dmg"

for f in "$MAC_UNIVERSAL_DMG" "$MAC_INTEL_DMG"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing expected artifact: $f"
    exit 1
  fi
done

upload_file() {
  local src="$1"
  local dst="$2"
  aws s3 cp "$src" "s3://$R2_BUCKET/$dst" --endpoint-url "$R2_S3_ENDPOINT" >/dev/null
  echo "Uploaded: $dst"
}

write_redirect() {
  local url="$1"
  cat <<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=$url" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to latest build...</p>
  <p><a href="$url">If you are not redirected, click here.</a></p>
</body>
</html>
HTML
}

echo "Uploading versioned macOS artifacts..."
upload_file "$MAC_UNIVERSAL_DMG" "releases/$VERSION/YouPastor-Mac-universal-Installer.dmg"
upload_file "$MAC_INTEL_DMG" "releases/$VERSION/YouPastor-Mac-x64-Installer.dmg"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

MAC_UNIVERSAL_URL="$R2_PUBLIC_BASE_URL/releases/$VERSION/YouPastor-Mac-universal-Installer.dmg"
MAC_INTEL_URL="$R2_PUBLIC_BASE_URL/releases/$VERSION/YouPastor-Mac-x64-Installer.dmg"
WINDOWS_URL="https://github.com/Arwen-Digital/YouPastor/releases/latest/download/YouPastor-Windows-Setup.exe"

write_redirect "$MAC_UNIVERSAL_URL" > "$TMP_DIR/mac-universal-index.html"
write_redirect "$MAC_INTEL_URL" > "$TMP_DIR/mac-intel-index.html"
write_redirect "$WINDOWS_URL" > "$TMP_DIR/windows-index.html"

echo "Uploading static redirect pages..."
upload_file "$TMP_DIR/mac-universal-index.html" "releases/mac-universal/index.html"
upload_file "$TMP_DIR/mac-intel-index.html" "releases/mac-intel/index.html"
upload_file "$TMP_DIR/windows-index.html" "releases/windows/index.html"

echo "Pushing commit and tags (triggers Windows GitHub Actions build)..."
git push --follow-tags

echo "Done."
echo "Latest static links:"
echo "  $R2_PUBLIC_BASE_URL/releases/mac-universal/index.html"
echo "  $R2_PUBLIC_BASE_URL/releases/mac-intel/index.html"
echo "  $R2_PUBLIC_BASE_URL/releases/windows/index.html"
