#!/usr/bin/env bash
# Generate PWA icons from single 1024x1024 source
# Requires: npx sharp-cli
set -euo pipefail

npx sharp-cli -i assets/images/icon.png -o public/icon-192.png resize 192
npx sharp-cli -i assets/images/icon.png -o public/icon-512.png resize 512
