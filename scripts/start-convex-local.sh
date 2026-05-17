#!/bin/sh
set -eu

cd /workspace

npm install

if [ -z "${JWT_PRIVATE_KEY:-}" ] || [ -z "${JWKS:-}" ]; then
  KEYS_JSON=$(node -e "const { generateKeyPair, exportPKCS8, exportJWK } = require('jose'); (async () => { const keys = await generateKeyPair('RS256'); const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\\n/g, ' '); const publicKey = await exportJWK(keys.publicKey); const jwks = JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] }); process.stdout.write(JSON.stringify({ privateKey, jwks })); })().catch((e) => { console.error(e); process.exit(1); });")
  JWT_PRIVATE_KEY=$(printf '%s' "$KEYS_JSON" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(d.privateKey)")
  JWKS=$(printf '%s' "$KEYS_JSON" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(d.jwks)")
fi
export JWT_PRIVATE_KEY
export JWKS

CONVEX_DEPLOYMENT= npx convex dev --local &
CONVEX_PID=$!

cleanup() {
  kill "$CONVEX_PID" 2>/dev/null || true
}
trap cleanup INT TERM

for _ in $(seq 1 60); do
  if [ -f ".convex/local/default/config.json" ]; then
    break
  fi
  sleep 1
done

if [ ! -f ".convex/local/default/config.json" ]; then
  echo "Convex local config not found."
  wait "$CONVEX_PID"
  exit 1
fi

ADMIN_KEY=$(node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('.convex/local/default/config.json','utf8')); process.stdout.write(c.adminKey)")
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
export CONVEX_SELF_HOSTED_ADMIN_KEY="$ADMIN_KEY"

printf 'JWT_PRIVATE_KEY=%s\n' "$JWT_PRIVATE_KEY" > /tmp/convex.local.env
printf 'JWKS=%s\n' "$JWKS" >> /tmp/convex.local.env

for _ in $(seq 1 30); do
  if npx convex env set --from-file /tmp/convex.local.env --force >/tmp/convex-env-set.log 2>&1; then
    cat /tmp/convex-env-set.log
    break
  fi
  sleep 1
done

wait "$CONVEX_PID"
