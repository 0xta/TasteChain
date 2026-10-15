# 🍜 TasteChain BKK — The AI-Powered & Trustless Gastronomy Protocol
> **The Real-Yield Curate-to-Earn Protocol on Avalanche C-Chain for 41,000+ Bangkok Restaurants**

[![Avalanche Fuji](https://img.shields.io/badge/Network-Avalanche%20Fuji-E84142?style=for-the-badge&logo=avalanche&logoColor=white)](https://testnet.snowtrace.io)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20JSONB-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![OpenAI Vision](https://img.shields.io/badge/AI%20Vision-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![DaisyUI](https://img.shields.io/badge/DaisyUI-4.12-5AD8E6?style=for-the-badge&logo=daisyui&logoColor=black)](https://daisyui.com)

---

## 🌟 Executive Summary
Food reviews today are broken by astroturfing, fake paid ratings, and platform monopolies that extract high fees while offering zero real yield to contributors. 

**TasteChain BKK** transforms Bangkok's gastronomy scene by introducing **Proof-of-Visit**:
1. **Physical Presence Verification (GPS):** Proves proximity to the venue.
2. **AI Multimodal Verification (OpenAI Vision):** Parses Thai banking PromptPay transaction slips in real time.
3. **Anti-Replay Cryptographic Protection:** Uses SHA-256 hashes of `bank_code + ref_id` stored on-chain & in DB to prevent duplicate slip usage.
4. **Pioneer Rights (Curate-to-Earn):** The first 3 verified reviewers of any restaurant become permanent **Pioneers**, receiving lifelong royalty shares (5%) on all merchant bounty campaigns.
5. **Direct Merchant Bounties:** Restaurants fund AVAX prize pools that unlock rewards (70% reviewer, 25% protocol treasury, 5% pioneers) directly to actual diners.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Client Layer (Next.js 14 + DaisyUI)"]
        UI["Foodie DApp (http://localhost:3000)"]
        Admin["Admin Big Data Hub (/admin)"]
        Judge["⚡ 1-Click Judge Mode (Burner Wallet)"]
        Map["Leaflet Interactive Bangkok Map"]
    end

    subgraph Backend["Next.js Serverless API"]
        VerifyAPI["/api/verify-slip (OpenAI Vision OCR)"]
        ReviewAPI["/api/reviews (Anti-Fraud & Slot Assignment)"]
        BountyAPI["/api/bounties (Campaign Engine)"]
        FaucetAPI["/api/faucet (0.1 AVAX Drip)"]
        LeaderAPI["/api/leaderboard (Live Hall of Fame)"]
    end

    subgraph Database["PostgreSQL 17 (Docker)"]
        Places["places (41,581 Bangkok Venues)"]
        VReviews["verified_reviews (Tier 1-3 Proof-of-Visit)"]
        PClaims["pioneer_claims (Slot 1-3 Constraints)"]
        MBounties["merchant_bounties (Active Pools)"]
    end

    subgraph Web3["Avalanche Fuji Testnet (Chain ID: 43113)"]
        Registry["TasteChainRegistry.sol"]
        BountyContract["TasteChainBounty.sol"]
        Snowtrace["Snowtrace Explorer"]
    end

    UI --> VerifyAPI
    UI --> ReviewAPI
    UI --> BountyAPI
    UI --> Map
    Admin --> Places
    Judge --> FaucetAPI
    VerifyAPI --> ReviewAPI
    ReviewAPI --> Database
    ReviewAPI --> Registry
    BountyAPI --> BountyContract
    Registry --> Snowtrace
    BountyContract --> Snowtrace
```

---

## 💎 Key Innovations

### 1. ⚡ 1-Click Judge Mode
Judges evaluating the project don't need MetaMask installed or testnet AVAX. Simply click **"⚡ 1-Click Judge Mode"**:
- Generates a local Burner Wallet in 1 millisecond.
- Auto-requests 0.1 AVAX from the built-in faucet.
- Fully authorized to sign reviews, claim pioneer slots, and fund bounties immediately.

### 2. Proof-of-Visit Tri-Factor Verification
- **Tier 1:** GPS check (< 200m radius of restaurant coordinates).
- **Tier 2:** Food photo perceptual verification.
- **Tier 3:** PromptPay/K PLUS banking slip OCR via OpenAI Vision + SHA-256 anti-replay check.

### 3. Pioneer Rights & Real-Yield Curate-to-Earn
- Every restaurant has exactly **3 Pioneer Slots**.
- Pioneer Slot #1, #2, and #3 earn perpetual royalties (5% split) whenever merchants fund bounties to attract customers.
- Verified reviewers earn 70% of the visit reward.

### 4. Big Data Reality (Bangkok F&B Core)
- Verified dataset of **41,581 Operational Bangkok Venues** (36,369 F&B venues).
- Sub-5ms indexed spatial queries covering food hubs: *บรรทัดทอง, เยาวราช, อารีย์, ทรงวาด, สุขุมวิท, สีลม, สยาม*.

---

## 📜 Smart Contracts

Deployed and tested using **Hardhat 2** on Avalanche Fuji:

| Contract | Purpose | Modifiers / Features |
| :--- | :--- | :--- |
| `TasteChainRegistry.sol` | Records immutable Proof-of-Visit reviews and assigns Pioneer slots 1–3 | Enforces rating (1–5), slip anti-replay hash checks |
| `TasteChainBounty.sol` | Manages merchant AVAX prize pools and automated fee splitting | `onlyOracle`, Reentrancy protected, 70% Reviewer / 25% Treasury / 5% Pioneers split |

### Unit Test Results (`npm run test:contracts`)
- **20 / 20 Test Cases Passed (100%)**
- Run test command: `npm run test:contracts`

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js 18+ (tested on Node v20.19.5)
- Docker Desktop (for PostgreSQL container)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-repo/tastechain-bkk.git
cd tastechain-bkk
npm install
```

### 2. Environment Configuration
Create `.env.local`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tastechain
OPENAI_API_KEY=your_openai_api_key_here # Optional: deterministic mock OCR used if not provided
NEXT_PUBLIC_AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CHAIN_ID=43113
NEXT_PUBLIC_REGISTRY_ADDRESS=0x9A676e781A523b5d0C0e43731313A708CB607508
NEXT_PUBLIC_BOUNTY_ADDRESS=0x0B306BF915C4d645ff596e518fAf3F9669b97016
DEPLOYER_PRIVATE_KEY=0x38c00afb8e8d96f726d1bb842080f2fd9fb15440...
FAUCET_PRIVATE_KEY=0xcf7a58858f55f6449a7a11926b4eef3872d988df...
```

### 3. Database Migration
```bash
docker exec -i uhack-postgres psql -U postgres -d tastechain < migrations/001_create_tastechain_tables.sql
```

### 4. Run Automated Test Suites
```bash
# Run Smart Contract unit tests
npm run test:contracts

# Run Automated End-to-End Integration test suite
npm run test:e2e

# Run all tests simultaneously
npm test
```

### 5. Launch Application
```bash
npm run build
npm run start
```
- **Foodie DApp:** [http://localhost:3000](http://localhost:3000)
- **Admin Big Data Hub:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🗺️ Visual Features
- **Map View:** Toggle between grid and interactive Bangkok map powered by Leaflet & OpenStreetMap.
- **DaisyUI Multi-Theme:** Instant switching between `Dark`, `Coffee`, `Cyberpunk`, `Emerald`, and `Light`.
- **Snowtrace Deep Linking:** Direct clickable links to transactions and addresses on Avalanche Fuji testnet explorer.

---

## 👥 Hackathon Team
- **Project:** TasteChain BKK
- **Track:** Web3 Real-World Assets (RWA) / Consumer Crypto / AI Integration
- **License:** MIT
