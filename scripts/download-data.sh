#!/usr/bin/env bash
# NOTE: Manual data download is no longer required.
# The import-hadiths.ts script now fetches data directly from:
#   https://api.hadith.gading.dev
#
# Just run:
#   npm run import:hadiths      (all 9 books — ~40 000 hadiths)
#   npm run import:hadiths -- bukhari   (single book)
echo "ℹ  No download needed."
echo "   Run 'npm run import:hadiths' to import hadith data directly from the API."
