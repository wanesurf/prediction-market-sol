# Solcast Prediction Market

A decentralized prediction market platform built on Solana blockchain.

## Features

- Create and participate in prediction markets
- Buy shares in market outcomes
- View market statistics and trends
- Withdraw winnings when markets are resolved

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Solana CLI tools
- A Solana wallet (like Phantom)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/prediction-market-pbs-sol.git
cd prediction-market-pbs-sol
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Smart Contract

The smart contract is located in the `contracts/market` directory. It's built using the Anchor framework.

### Deploying the Contract

1. Navigate to the contract directory:

```bash
cd contracts/market
```

2. Build the contract:

```bash
anchor build
```

3. Deploy the contract:

```bash
anchor deploy
```

## Project Structure

- `src/` - Frontend application code
  - `app/` - Next.js app router pages
  - `components/` - React components
  - `idl/` - Solana program IDL
- `contracts/` - Solana smart contract code
  - `market/` - Prediction market program

## License

This project is licensed under the MIT License - see the LICENSE file for details.

npm run create-market <marketId> <optionA> <optionB> <endTime> <title> <description>

Parameters:

marketId: Unique identifier for the market (no spaces, use hyphens)
optionA: Text for the "Yes" option
optionB: Text for the "No" option
endTime: When the market will end (can be UNIX timestamp or date string like "2025-12-31")
title: Title of the market
description: Detailed description of the market conditions

example:

npm run create-market btc-100k-2025 "Yes" "No" "2025-12-31" "Will BTC exceed $100K in 2025?" "This market resolves to YES if the price of Bitcoin exceeds $100,000 USD at any point during 2025 according to Coinbase."

Token Creation via SPL
Yes, the contract does create the option tokens directly using the SPL token program. Here's how it works:

Token Creation: In the create_market instruction, the contract creates two SPL tokens:

One for the "YES" option (token_a_mint)
One for the "NO" option (token_b_mint)

Token Mint Authority: The mint authority for both tokens is a Program Derived Address (PDA) controlled by the Solcast program. This ensures that only the program can mint new tokens.
Token Minting: When a user buys shares, the contract:

Transfers the user's SOL (or other token) to the market's escrow account
Mints the corresponding option tokens (YES or NO) to the user's token account

Token Management: The contract keeps track of all shares and maintains the relationship between option tokens and market outcomes.

deploy contract:

anchor deploy --provider.cluster devnet

Deployed Contract:
Program Id: 7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS

Signature: 2HoCUmwMc9HtMMYD95tNMofXxe4wytK2VSuATbNJjZsaTFA28HXiAUEfKsPYvgGcAcE4n6H4XFrfYi2wVfSTztQ3

Make script executable:

chmod +x create-market.sh

anchor call create_market \
 --args '{"id":"market1", "options":["Yes", "No"], "end_time":"1714983467", "buy_token":"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "banner_url":"https://example.com/banner.jpg", "description":"Will BTC hit 100k in 2025?", "title":"BTC 100k", "end_time_string":"Dec 31, 2025", "start_time_string":"Jan 1, 2025", "resolution_source":"CoinGecko"}' \
 --program-id 7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS

ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn deploy

Market creation: https://explorer.solana.com/tx/XPHjaLxnKRbX1JCJABV8FaqirgWZqhCAMwVhWszaYicFbhdCjPTtVmjF7vGzWe5Maik6uCQKni7SJiQAxmeR25e?cluster=devnet

Market account: 76czyTVwN2FaydgGbVWghKPGHgHvWxPyKiUW6ktC9XY8
Token A mint: DB29TjxUTHD8pGTk3kDycUYZHhc5kAk1FTNBPN9QXdTD
Token B mint: EVLo3ebhbfN4GN8TvgSQLxLnZxXPztzHKZsLAk8Z1L9q
Market authority: 8XnqwsHUeajDbJio9Au7u8yEoxfvvsNW5j7pQGy5cmWh
