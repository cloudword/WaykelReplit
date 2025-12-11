#!/usr/bin/env bash
set -euo pipefail

# if DIGITALOCEAN_CA_B64 is set, decode it to /app/certs/digitalocean-ca.crt
mkdir -p /app/certs

if [ -n "${DIGITALOCEAN_CA_B64:-}" ]; then
  echo "Writing DO CA from env to /app/certs/digitalocean-ca.crt"
  printf "%s" "$DIGITALOCEAN_CA_B64" | base64 -d > /app/certs/digitalocean-ca.crt
  chmod 644 /app/certs/digitalocean-ca.crt
else
  echo "DIGITALOCEAN_CA_B64 not set; not writing CA file."
fi

# set NODE_EXTRA_CA_CERTS so Node uses this CA
export NODE_EXTRA_CA_CERTS=/app/certs/digitalocean-ca.crt
export NODE_ENV=production

# start the app
exec node dist/index.cjs
