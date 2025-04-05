#!/bin/bash
# create-market.sh

if [ "$#" -lt 6 ]; then
  echo "Usage: ./create-market.sh <marketId> <optionA> <optionB> <endTime> <title> <description>"
  echo "Example: ./create-market.sh btc-100k-2025 'Yes' 'No' '2025-12-31' 'Will BTC Exceed $100K in 2025?' 'This market resolves to YES if...'"
  exit 1
fi

ts-node scripts/test-create-market.ts "$@"
