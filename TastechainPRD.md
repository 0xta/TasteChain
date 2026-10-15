# Product Requirements Document (PRD): TasteChain BKK
**Project Name:** TasteChain BKK — The AI-Powered & Trustless Gastronomy Protocol  
**Document Version:** 2.1.0 (Finalized Hackathon PoC Edition)  
**Last Updated:** 2026-10-15  
**Status:** Active PoC / Web3 Hackathon Specification  
**Platform Form Factor:** Standalone Responsive Web Application (Node.js, Tailwind CSS, DaisyUI)  
**Blockchain Network:** Avalanche C-Chain — Fuji Testnet (Chain ID: 43113)  
**Primary Database:** PostgreSQL 17 (Docker `uhack-postgres`, port 5432)  
**Geographic Scope:** กรุงเทพมหานคร (Bangkok Only)  

---

## 1. Executive Summary & Vision

**TasteChain BKK** คือแพลตฟอร์ม Web3 Gastronomy Protocol บนเครือข่าย **Avalanche (AVAX)** ที่เชื่อมโยงฐานข้อมูลร้านอาหาร ร้านกาแฟ และบาร์จริงกว่า **36,000+ สถานที่ F&B ในกรุงเทพมหานคร** (จากทั้งหมด 41,581 สถานที่ OPERATIONAL) เข้ากับระบบตรวจสอบการไปกินจริงแบบไร้การโกง (**Proof-of-Visit Oracle**) และระบบกระจายรายได้แบบ **Real-Yield Curate-to-Earn**

### Core Design Decisions (v2.1):

| # | การตัดสินใจ | รายละเอียด |
| :--- | :--- | :--- |
| 1 | **Bangkok Only** | Scope เฉพาะ `city = 'กรุงเทพมหานคร'` (41,581 OPERATIONAL venues, 36,369 F&B) |
| 2 | **Real Slip OCR** | ใช้ **OpenAI Vision API** ตรวจสลิป PromptPay/ใบเสร็จจริง ไม่ใช่ Mock |
| 3 | **2 Smart Contracts Only** | `TasteChainRegistry` + `TasteChainBounty` (ตัด SBT ออกเพื่อโฟกัส) |
| 4 | **Judge Faucet Wallet** | เตรียม 5-10 Fuji AVAX ในกระเป๋า Faucet แจก 0.1 AVAX/คน (~50-100 testers) |
| 5 | **Standalone Web App** | ไม่พึ่งพา LINE, Social Login ใดๆ — Web3 Wallet Native only |
| 6 | **bytes32 Contract Keys** | ใช้ `keccak256(placeId)` เป็น key ใน mapping เพื่อประหยัด Gas |

---

## 2. Data Landscape (ข้อมูลจริงในฐานข้อมูล)

ฐานข้อมูล PostgreSQL (`tastechain.places`) มีข้อมูลจริงที่ผ่านการ index ไว้แล้ว:

| Metric | จำนวน |
| :--- | :--- |
| ร้านทั้งหมดในฐานข้อมูล (ทั่วประเทศ) | 91,530 |
| กรุงเทพฯ ทั้งหมด | 43,649 |
| กรุงเทพฯ OPERATIONAL (ไม่รวมปิดชั่วคราว) | **41,581** |
| กรุงเทพฯ F&B เท่านั้น (restaurant, cafe, bar, bakery, coffee_shop, thai_restaurant, noodle_shop, japanese_restaurant, fast_food_restaurant, chinese_restaurant) | **36,369** |
| มี GPS Coordinates (lat/lng) | 41,550 (99.9%) |
| มี Rating Score | ~27,732 (ทั่วประเทศ) |

### Service Type Breakdown (กรุงเทพฯ):
| ประเภท | จำนวนร้าน |
| :--- | :--- |
| restaurant | 21,529 |
| cafe | 8,414 |
| bakery | 2,566 |
| bar | 1,856 |
| coffee_shop | 1,399 |
| thai_restaurant | 937 |
| noodle_shop | 516 |
| japanese_restaurant | 438 |
| fast_food_restaurant | 330 |
| chinese_restaurant | 274 |

### ฟิลด์หลักในตาราง `places` ที่ใช้งานได้ทันที:
```
id (UUID), place_id (TEXT UNIQUE), name (TEXT), address (TEXT),
city (TEXT), latitude (NUMERIC), longitude (NUMERIC),
service_type (TEXT), service_types (JSONB),
business_status (TEXT), rating (NUMERIC), total_reviews (INT),
opening_hours (JSONB), google_map_url (TEXT), website (TEXT)
```

> **หมายเหตุ:** ฟิลด์ `extra` (JSONB) และ `opening_hours` มีข้อมูลเพียงบางส่วน — PoC จะใช้ Filter จาก `service_type`, `rating`, `address` (ค้นย่าน) เป็นหลัก

---

## 3. Key Problems & Unique Value Proposition (UVP)

| ปัญหา | ทางออกของ TasteChain |
| :--- | :--- |
| **รีวิวปลอม / หน้าม้า / จ้างรีวิว** | **Proof-of-Visit Oracle:** GPS + ภาพอาหารสด (pHash) + สลิป PromptPay ตรวจจริงด้วย OpenAI Vision API |
| **ผู้รีวิวคุณภาพไม่ได้รับผลตอบแทน** | **Pioneer Staking:** 3 คนแรกที่รีวิวร้านได้ Royalty 5% ตลอดชีพจาก Bounty ของร้านนั้น |
| **ร้านค้าจ่ายแอดแพง ไม่เห็น ROI** | **Smart Bounty Escrow:** ฝาก AVAX → จ่ายตรงเข้ากระเป๋าคนรีวิว (70%) เมื่อ Oracle ยืนยัน |

---

## 4. System Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Client["Frontend (Next.js + Tailwind + DaisyUI)"]
        UI["UI Layer"]
        Wallet["Wagmi / Viem / RainbowKit"]
        JudgeBtn["⚡ 1-Click Judge Burner Wallet"]
    end

    subgraph Blockchain["Avalanche Fuji Testnet (43113)"]
        Registry["TasteChainRegistry.sol<br/>(Pioneer Slots & Proof Hashes)<br/>Key: bytes32 placeHash"]
        BountyContract["TasteChainBounty.sol<br/>(Escrow & 70/5/25 Split)<br/>Access: onlyOracle"]
    end

    subgraph Backend["Backend & Oracle (Node.js API Routes)"]
        SearchAPI["Search & Filter API<br/>(36K+ BKK F&B venues)"]
        ProofOracle["Proof-of-Visit Oracle<br/>(OpenAI Vision OCR + pHash)"]
        TxRelayer["AVAX Tx Relayer<br/>(Oracle Wallet signs claimReward)"]
        Faucet["Judge Faucet Service<br/>(5-10 Fuji AVAX reserve)"]
    end

    subgraph Database["PostgreSQL 17 (uhack-postgres:5432)"]
        Places["places<br/>41,581 BKK Rows"]
        Reviews["verified_reviews"]
        Pioneers["pioneer_claims"]
        Bounties["merchant_bounties"]
    end

    UI --> Wallet
    UI --> JudgeBtn
    JudgeBtn -->|Create Burner + Airdrop 0.1 AVAX| Faucet
    Wallet -->|recordReview| Registry
    Wallet -->|fundBounty| BountyContract
    UI -->|Search / Filter| SearchAPI
    UI -->|Upload Slip & Photo| ProofOracle
    SearchAPI --> Places
    ProofOracle -->|OpenAI Vision API| ProofOracle
    ProofOracle --> Reviews
    ProofOracle --> TxRelayer
    TxRelayer -->|onlyOracle: claimReward| BountyContract
    TxRelayer -->|Log tx_hash| Reviews
    TxRelayer -->|Log tx_hash| Pioneers
```

### Tech Stack:

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js v24+, TypeScript |
| **Framework** | Next.js (App Router) |
| **CSS & UI** | Tailwind CSS v3.4+, DaisyUI v4+ |
| **Maps** | Leaflet / MapLibre GL (venue pins with GPS coords) |
| **Web3** | Wagmi v2, Viem v2, RainbowKit |
| **Blockchain** | Avalanche Fuji Testnet (RPC: `https://api.avax-test.network/ext/bc/C/rpc`) |
| **Smart Contracts** | Solidity 0.8.24, Hardhat |
| **Database** | PostgreSQL 17 (Docker `uhack-postgres`, DB: `tastechain`) |
| **Slip OCR** | **OpenAI Vision API** (gpt-4o / gpt-4o-mini) — ส่งรูปสลิป → ดึง JSON: amount, date, ref_id |
| **Image Hashing** | Sharp (pHash calculation) สำหรับ duplicate photo detection |
| **Block Explorer** | [Snowtrace Fuji](https://testnet.snowtrace.io) |

---

## 5. Database Schema & Data Models

ระบบอ่านข้อมูลร้านจากตาราง `places` ที่มีอยู่เดิม (41,581 แถวใน กทม.) และสร้าง 3 ตาราง Companion:

```sql
-- ========================================================
-- EXISTING TABLE: places (Master Data — READ ONLY)
-- 41,581 OPERATIONAL venues in Bangkok
-- Key fields: place_id, name, address, latitude, longitude,
--             service_type, rating, total_reviews, opening_hours
-- ========================================================

-- ========================================================
-- NEW TABLE 1: verified_reviews
-- บันทึกรีวิวที่ผ่านการตรวจสอบ พร้อม On-chain Tx Hash
-- ========================================================
CREATE TABLE IF NOT EXISTS verified_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
    place_hash VARCHAR(66) NOT NULL,       -- keccak256(place_id) ที่ใช้เป็น key บน contract
    reviewer_address VARCHAR(42) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    -- Verification Data
    verification_tier SMALLINT NOT NULL DEFAULT 1, -- 1: GPS, 2: Photo, 3: Full Slip
    gps_latitude NUMERIC(10, 7),
    gps_longitude NUMERIC(10, 7),
    gps_distance_meters NUMERIC(8, 2),     -- ระยะห่างจากร้านจริง (เมตร)
    slip_amount_thb NUMERIC(10, 2),
    slip_ref_hash VARCHAR(66) UNIQUE,      -- SHA-256(Bank Tx Ref ID) ป้องกันสลิปซ้ำ
    slip_ocr_raw JSONB,                    -- Raw OCR output from OpenAI Vision (เก็บ server-side only)
    food_photo_phash VARCHAR(64),          -- Perceptual Hash ป้องกันรูปซ้ำ
    photo_url TEXT,
    -- On-chain Fields
    onchain_tx_hash VARCHAR(66),           -- Tx Hash on Avalanche Fuji (0x...)
    onchain_block_number BIGINT,
    is_pioneer BOOLEAN DEFAULT FALSE,
    pioneer_slot SMALLINT,                 -- 1, 2, or 3 (if is_pioneer = true)
    bounty_reward_avax NUMERIC(18, 8) DEFAULT 0,
    -- Status
    status VARCHAR(20) DEFAULT 'CONFIRMED', -- PENDING, CONFIRMED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vr_place_id ON verified_reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_vr_wallet ON verified_reviews(reviewer_address);
CREATE INDEX IF NOT EXISTS idx_vr_tx_hash ON verified_reviews(onchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_vr_created ON verified_reviews(created_at DESC);

-- ========================================================
-- NEW TABLE 2: pioneer_claims
-- สิทธิ์ผู้บุกเบิก 3 คนแรกของแต่ละร้าน
-- ========================================================
CREATE TABLE IF NOT EXISTS pioneer_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
    place_hash VARCHAR(66) NOT NULL,
    slot_index SMALLINT NOT NULL CHECK (slot_index BETWEEN 1 AND 3),
    pioneer_address VARCHAR(42) NOT NULL,
    review_id UUID REFERENCES verified_reviews(id),
    onchain_tx_hash VARCHAR(66) NOT NULL,
    total_royalty_earned_avax NUMERIC(18, 8) DEFAULT 0,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_place_slot UNIQUE (place_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_pc_place_id ON pioneer_claims(place_id);
CREATE INDEX IF NOT EXISTS idx_pc_wallet ON pioneer_claims(pioneer_address);

-- ========================================================
-- NEW TABLE 3: merchant_bounties
-- แคมเปญเงินรางวัลจากร้านค้า
-- ========================================================
CREATE TABLE IF NOT EXISTS merchant_bounties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
    place_hash VARCHAR(66) NOT NULL,
    merchant_address VARCHAR(42) NOT NULL,
    total_budget_avax NUMERIC(18, 8) NOT NULL,
    remaining_budget_avax NUMERIC(18, 8) NOT NULL,
    reward_per_visit_avax NUMERIC(18, 8) NOT NULL,
    min_spend_thb NUMERIC(10, 2) DEFAULT 100.00,
    total_claims INT DEFAULT 0,
    onchain_tx_hash VARCHAR(66) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, DEPLETED, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mb_place_id ON merchant_bounties(place_id);
CREATE INDEX IF NOT EXISTS idx_mb_status ON merchant_bounties(status);
```

---

## 6. Smart Contract Architecture (Solidity on Avalanche Fuji)

> **Design Decision:** ใช้ `bytes32 placeHash = keccak256(abi.encodePacked(placeId))` เป็น key ทุก mapping เพื่อประหยัด Gas อย่างมาก เทียบกับ `string` key แบบเดิม

### Contract 1: `TasteChainRegistry.sol`
บันทึก Proof-of-Visit hash, จัดการ Pioneer Slots (3 คนแรกต่อร้าน)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TasteChainRegistry {
    address public owner;

    struct PlaceInfo {
        address[3] pioneers;
        uint8 pioneerCount;
        uint256 totalReviews;
    }

    struct ReviewProof {
        address reviewer;
        bytes32 slipRefHash;
        uint8 rating;
        uint256 timestamp;
    }

    // Key: keccak256(placeId) — computed off-chain for gas efficiency
    mapping(bytes32 => PlaceInfo) public places;
    mapping(bytes32 => bool) public usedSlipHashes;

    event PioneerRegistered(bytes32 indexed placeHash, address indexed pioneer, uint8 slotIndex);
    event ReviewRecorded(bytes32 indexed placeHash, address indexed reviewer, bytes32 indexed slipHash, uint8 rating);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Record a verified review and auto-assign Pioneer slot if available
    /// @param placeHash keccak256(abi.encodePacked(placeId)) — computed by frontend
    /// @param slipHash SHA-256 hash of the bank transaction reference ID
    /// @param rating 1-5 star rating
    function recordReview(
        bytes32 placeHash,
        bytes32 slipHash,
        uint8 rating
    ) external returns (bool isPioneer, uint8 pioneerSlot) {
        require(rating >= 1 && rating <= 5, "Invalid rating");
        require(!usedSlipHashes[slipHash], "Slip already used");

        usedSlipHashes[slipHash] = true;
        places[placeHash].totalReviews++;

        emit ReviewRecorded(placeHash, msg.sender, slipHash, rating);

        // Auto-assign Pioneer slot if < 3 pioneers exist
        if (places[placeHash].pioneerCount < 3) {
            uint8 slot = places[placeHash].pioneerCount;
            places[placeHash].pioneers[slot] = msg.sender;
            places[placeHash].pioneerCount++;
            emit PioneerRegistered(placeHash, msg.sender, slot + 1);
            return (true, slot + 1);
        }

        return (false, 0);
    }

    function getPioneers(bytes32 placeHash) external view returns (address[3] memory, uint8) {
        return (places[placeHash].pioneers, places[placeHash].pioneerCount);
    }

    function getPlaceInfo(bytes32 placeHash) external view returns (uint8 pioneerCount, uint256 totalReviews) {
        PlaceInfo storage p = places[placeHash];
        return (p.pioneerCount, p.totalReviews);
    }
}
```

### Contract 2: `TasteChainBounty.sol`
Escrow รับเงินฝาก AVAX จากร้านค้า, กระจายรางวัล Real-Yield 70/5/25 — **เฉพาะ Oracle Wallet เท่านั้นที่เรียก `claimReward` ได้**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITasteChainRegistry {
    function getPioneers(bytes32 placeHash) external view returns (address[3] memory, uint8);
}

contract TasteChainBounty {
    address public protocolTreasury;
    address public oracleAddress;          // Backend Oracle wallet — only caller of claimReward
    ITasteChainRegistry public registry;

    struct BountyPool {
        address merchant;
        uint256 remainingAvax;
        uint256 rewardPerVisit;
        uint256 totalClaims;
        bool active;
    }

    mapping(bytes32 => BountyPool) public placeBounties;

    event BountyFunded(bytes32 indexed placeHash, address indexed merchant, uint256 amount, uint256 rewardPerVisit);
    event RewardPaid(bytes32 indexed placeHash, address indexed reviewer, uint256 reviewerAmount, uint256 pioneerAmount, uint256 treasuryAmount);

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only oracle can call");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == protocolTreasury, "Only owner");
        _;
    }

    constructor(address _registryAddress, address _treasury, address _oracle) {
        registry = ITasteChainRegistry(_registryAddress);
        protocolTreasury = _treasury;
        oracleAddress = _oracle;
    }

    /// @notice Merchant deposits AVAX to fund a bounty campaign for their venue
    function fundBounty(bytes32 placeHash, uint256 rewardPerVisit) external payable {
        require(msg.value >= rewardPerVisit, "Deposit < reward per visit");
        require(rewardPerVisit > 0, "Reward must be > 0");

        BountyPool storage pool = placeBounties[placeHash];
        pool.merchant = msg.sender;
        pool.remainingAvax += msg.value;
        pool.rewardPerVisit = rewardPerVisit;
        pool.active = true;

        emit BountyFunded(placeHash, msg.sender, msg.value, rewardPerVisit);
    }

    /// @notice Oracle calls this after verifying Proof-of-Visit (slip OCR + GPS + photo)
    /// @dev Access restricted to oracleAddress only — prevents unauthorized fund drain
    function claimReward(bytes32 placeHash, address reviewer) external onlyOracle {
        BountyPool storage pool = placeBounties[placeHash];
        require(pool.active && pool.remainingAvax >= pool.rewardPerVisit, "Bounty pool insufficient");

        uint256 payout = pool.rewardPerVisit;
        pool.remainingAvax -= payout;
        pool.totalClaims++;

        if (pool.remainingAvax < pool.rewardPerVisit) {
            pool.active = false; // Auto-deactivate when depleted
        }

        // Revenue Split: 70% Reviewer, 5% Pioneers, 25% Treasury
        uint256 reviewerShare  = (payout * 70) / 100;
        uint256 treasuryShare  = (payout * 25) / 100;
        uint256 pioneerTotal   = payout - reviewerShare - treasuryShare; // 5%

        // Pay reviewer
        (bool s1,) = payable(reviewer).call{value: reviewerShare}("");
        require(s1, "Reviewer transfer failed");

        // Pay treasury
        (bool s2,) = payable(protocolTreasury).call{value: treasuryShare}("");
        require(s2, "Treasury transfer failed");

        // Split pioneer share among 1-3 pioneers equally
        (address[3] memory pioneers, uint8 count) = registry.getPioneers(placeHash);
        if (count > 0) {
            uint256 perPioneer = pioneerTotal / count;
            for (uint8 i = 0; i < count; i++) {
                if (pioneers[i] != address(0)) {
                    (bool s3,) = payable(pioneers[i]).call{value: perPioneer}("");
                    require(s3, "Pioneer transfer failed");
                }
            }
        } else {
            // No pioneers yet — pioneer share goes to treasury
            (bool s4,) = payable(protocolTreasury).call{value: pioneerTotal}("");
            require(s4, "Fallback transfer failed");
        }

        emit RewardPaid(placeHash, reviewer, reviewerShare, pioneerTotal, treasuryShare);
    }

    /// @notice Check remaining bounty for a venue
    function getBountyInfo(bytes32 placeHash) external view returns (
        address merchant, uint256 remaining, uint256 rewardPerVisit, uint256 totalClaims, bool active
    ) {
        BountyPool storage p = placeBounties[placeHash];
        return (p.merchant, p.remainingAvax, p.rewardPerVisit, p.totalClaims, p.active);
    }

    /// @notice Owner can update oracle address if needed
    function setOracle(address _newOracle) external onlyOwner {
        oracleAddress = _newOracle;
    }
}
```

---

## 7. Functional Requirements (User Stories & Workflows)

### 7.1 Venue Discovery & Filter Engine

*   **FR-1.1 Bangkok Venue Search:** ผู้ใช้ค้นหาร้านจากชื่อ, ย่าน (`address` ILIKE), หรือประเภทร้าน (`service_type`) ได้ผลลัพธ์ภายใน `< 500ms`
    *   Default filter: `city = 'กรุงเทพมหานคร' AND business_status = 'OPERATIONAL'`
    *   ประเภทอาหารที่แสดง: restaurant, cafe, bakery, bar, coffee_shop, thai_restaurant, noodle_shop, japanese_restaurant, fast_food_restaurant, chinese_restaurant
*   **FR-1.2 Quick Filter Badges:**
    *   `⚡ Active Bounty` — ร้านที่มี bounty pool ยังเหลือ
    *   `🏆 Pioneer Open` — ร้านที่ pioneer_count < 3
    *   `⭐ Top Rated` — rating >= 4.5
    *   `🍜 Noodle` / `☕ Cafe` / `🍺 Bar` — filter by service_type
*   **FR-1.3 Map View:** แสดง venue pins บนแผนที่ด้วย Leaflet จากพิกัด `latitude`, `longitude` (มีข้อมูล 99.9% ของร้าน)
*   **FR-1.4 Place Detail Page:** แสดงชื่อ, ที่อยู่, rating, จำนวนรีวิว, opening_hours (ถ้ามี), Google Maps link, สถานะ Pioneer Slots (1/3, 2/3, 3/3 + wallet addresses ย่อ), Bounty status, และประวัติ Verified Reviews ทั้งหมดพร้อม Snowtrace badges

### 7.2 Proof-of-Visit & Slip Verification Flow

*   **FR-2.1 3-Tier Verification Pipeline:**

    | Tier | หลักฐาน | สิทธิ์ที่ได้ |
    | :--- | :--- | :--- |
    | **Tier 1: GPS Check-in** | GPS coords ภายในรัศมี < 100m จากร้าน | บันทึก check-in (ไม่ได้ Bounty) |
    | **Tier 2: Food Photo** | Tier 1 + ถ่ายรูปอาหารสด → คำนวณ pHash | บันทึกรีวิว + XP |
    | **Tier 3: Full Slip Proof** | Tier 2 + อัปโหลดสลิป PromptPay/ใบเสร็จ | **ได้ทุกสิทธิ์: Bounty reward + Pioneer slot** |

*   **FR-2.2 OpenAI Vision Slip OCR:** ระบบส่งรูปสลิปไปยัง **OpenAI Vision API** (gpt-4o-mini) พร้อม Structured Prompt ให้คืน JSON:
    ```json
    {
      "bank_name": "กสิกรไทย",
      "transaction_date": "2026-10-15",
      "transaction_time": "12:30:45",
      "amount_thb": 180.00,
      "recipient_name": "นายประสิทธิ์ ...",
      "transaction_ref_id": "202610158892182912",
      "confidence": 0.95
    }
    ```
    > **Privacy:** รูปสลิปจะถูกลบออกจาก Server Memory ทันทีหลัง OCR สำเร็จ — ไม่มี PII ใดๆ ถูกบันทึกถาวร มีเพียง `SHA-256(transaction_ref_id)` ที่ถูกเก็บ

*   **FR-2.3 Anti-Replay Engine:**
    *   `slip_ref_hash = SHA-256(transaction_ref_id)` → ตรวจซ้ำทั้งใน Postgres (`UNIQUE constraint`) และใน Smart Contract (`usedSlipHashes`)
    *   `food_photo_phash` → ตรวจความเหมือนของรูปอาหาร ป้องกันส่งรูปเดิมซ้ำ
    *   Rate limit: 1 review ต่อ wallet ต่อร้าน ต่อ 24 ชั่วโมง

*   **FR-2.4 On-chain Recording:** เมื่อ OCR ผ่าน → ผู้ใช้กดเซ็น `recordReview(placeHash, slipHash, rating)` ผ่าน Wagmi → Tx ถูกบันทึกบน Avalanche Fuji → `tx_hash` ถูก save กลับลง Postgres

### 7.3 Merchant Bounty Creation

*   **FR-3.1 3-Click Bounty Funding:**
    1. เลือกร้านจากรายการ (หรือค้นหาจาก 36K+ ร้าน)
    2. กำหนดจำนวน AVAX ที่จะฝาก (เช่น 0.5 AVAX) + รางวัลต่อรีวิว (เช่น 0.05 AVAX)
    3. กดเซ็น `fundBounty(placeHash, rewardPerVisit)` → AVAX เข้า Escrow Contract
*   **FR-3.2 Real-Time Bounty Dashboard:** แสดงยอดคงเหลือ, จำนวน claims, สถานะ active/depleted แบบ real-time

### 7.4 User Profile / My Dashboard ⭐ (NEW)

*   **FR-4.1 Wallet Overview:** แสดง Connected Wallet Address, AVAX Balance
*   **FR-4.2 My Reviews History:** รายการรีวิวทั้งหมดที่เคยส่ง พร้อม:
    *   ชื่อร้าน, rating, วันที่
    *   Verification Tier badge (🟢 GPS / 📸 Photo / 💳 Slip)
    *   Clickable Snowtrace TX link สำหรับทุกรายการ
*   **FR-4.3 My Pioneer Positions:** รายการร้านที่ได้เป็น Pioneer (slot 1, 2, หรือ 3) พร้อม:
    *   Cumulative Royalty earned (AVAX)
    *   จำนวนครั้งที่ได้รับส่วนแบ่ง
*   **FR-4.4 Total Earnings Summary:** `stats` card แสดง Total AVAX Earned, Total Reviews, Pioneer Slots Held

### 7.5 1-Click Judge Experience (Hackathon Demo)

*   **FR-5.1 Judge Demo Button:** ปุ่ม `⚡ Judge Demo Mode` ที่ Navbar (ขวาบน)
*   **FR-5.2 Auto-Provisioning Flow:**
    1. สร้าง Burner Wallet (Private Key in-memory / sessionStorage) ทันที
    2. Backend Faucet Service ส่ง **0.1 Fuji AVAX** จากกระเป๋า Faucet ที่เตรียมไว้ (สำรอง 5-10 AVAX)
    3. Redirect ไปหน้ารีวิวร้านตัวอย่าง (ร้านดังย่านบรรทัดทอง/อารีย์) พร้อมข้อมูลสลิปตัวอย่าง (Pre-filled)
    4. กรรมการกดรีวิว → เห็น TX ยืนยันบน Snowtrace ภายใน 2 วินาที
*   **FR-5.3 Faucet Rate Limiting:** จำกัด 1 faucet drip ต่อ IP ต่อ 10 นาที

---

## 8. UI/UX Specifications (Tailwind CSS + DaisyUI)

### 8.1 Visual Identity

| Element | Value |
| :--- | :--- |
| **Default Theme** | `dark` (DaisyUI) |
| **Alt Themes** | `coffee` (warm food tones), `cyberpunk` (stage presentation) |
| **Primary Color** | `#E84142` (Avalanche Red) |
| **Secondary Color** | `#F59E0B` (Gastronomy Gold) |
| **Accent Color** | `#10B981` (Verified Green) |
| **Font** | Inter / Noto Sans Thai |

### 8.2 Page Structure & Components

| Page | URL | DaisyUI Components |
| :--- | :--- | :--- |
| **Home / Explore** | `/` | `navbar`, `input` search, `badge` filters, `card` grid (venue list), `stats` (total venues / reviews / AVAX distributed) |
| **Venue Detail** | `/place/[placeId]` | `card`, `badge` (Pioneer 1/3), `timeline` (review history), `modal` (submit review), `steps` (verification tiers) |
| **Submit Review** | `/place/[placeId]/review` | `steps` (GPS → Photo → Slip → Sign), `file-input`, `textarea`, `rating` stars, `btn btn-primary` (Sign & Submit) |
| **My Profile** | `/profile` | `stats` (Total Earned / Reviews / Pioneers), `table` (review history with TX links), `badge` (Pioneer positions) |
| **Fund Bounty** | `/place/[placeId]/bounty` | `input` (AVAX amount), `range` (reward per visit), `btn` (Fund Bounty), `progress` (pool remaining) |
| **Leaderboard** | `/leaderboard` | `table` (Top Pioneers by royalty earned, Top Reviewers by count) |

### 8.3 Wireframe (Home Page)

```
┌──────────────────────────────────────────────────────────────────┐
│  🍜 TasteChain BKK                [🔍 Search...]  [⚡Judge] [🔗Wallet] │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐┌──────────┐┌──────────┐┌──────────┐               │
│  │ 36,369   ││  128     ││  0.85    ││   42     │               │
│  │ Venues   ││ Reviews  ││ AVAX Paid││ Pioneers │  ← stats bar  │
│  └──────────┘└──────────┘└──────────┘└──────────┘               │
├──────────────────────────────────────────────────────────────────┤
│  Filters: [⚡Bounty] [🏆Pioneer] [⭐4.5+] [🍜Noodle] [☕Cafe]  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ อากุ้ย ผัดไทหอยทอด │  │ Stand Alone Coffee│  │ Melody Bangkok  │  │
│  │ ⭐ 4.8 · 539 rev │  │ ⭐ 4.6 · 457 rev │  │ ⭐ 4.9 · cafe   │  │
│  │ 🏆 0/3 OPEN     │  │ 🏆 1/3           │  │ 🏆 0/3 OPEN     │  │
│  │ 💰 No Bounty    │  │ 💰 0.3 AVAX      │  │ 💰 No Bounty    │  │
│  │ [🚀 Be Pioneer] │  │ [🔥 Review+Earn] │  │ [🚀 Be Pioneer] │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    🗺️ Map View (Leaflet)                   │  │
│  │         Pins for all venues with lat/lng coords            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. PDPA & Security Specifications

1. **Zero PII on Blockchain:**
   * On-chain: เก็บเฉพาะ `bytes32 slipRefHash` (one-way hash) + `wallet address` + `rating`
   * Off-chain (Postgres): เก็บ `slip_ocr_raw` (JSON) สำหรับ audit trail ภายในเท่านั้น
   * รูปสลิปตัวจริง: **ลบทันทีหลัง OCR** ไม่เก็บไฟล์ภาพสลิปถาวร

2. **Anti-Sybil & Anti-Griefing:**
   * 1 wallet + 1 ร้าน + 24 ชั่วโมง = max 1 review
   * Duplicate slip hash → reject ทั้ง Postgres (UNIQUE) + Smart Contract (`usedSlipHashes`)
   * Duplicate food photo pHash → flag for manual review

3. **Smart Contract Security:**
   * `claimReward` → `onlyOracle` modifier (เฉพาะ Backend Oracle Wallet เท่านั้น)
   * `fundBounty` → ใครก็ deposit ได้ (open, permissionless)
   * ใช้ `.call{value:}` แทน `.transfer()` เพื่อ forward gas ที่เพียงพอ

---

## 10. Hackathon PoC Scope

| Feature | Status | Detail |
| :--- | :---: | :--- |
| ค้นหาร้าน 36K+ F&B ใน กทม. | 🟢 **Core** | Real-time search + filter จาก `places` table |
| Map View (Leaflet pins) | 🟢 **Core** | แสดง venue pins จาก GPS coords จริง |
| Web3 Wallet (MetaMask/Core) | 🟢 **Core** | Wagmi + RainbowKit บน AVAX Fuji |
| ⚡ 1-Click Judge Wallet | 🟢 **Core** | Burner wallet + Faucet 0.1 AVAX auto-drip |
| Slip OCR (OpenAI Vision) | 🟢 **Core** | Real OCR — ดึง amount, ref_id, date จากสลิปจริง |
| Pioneer Staking (3 slots) | 🟢 **Core** | On-chain registry บน Avalanche Fuji |
| Bounty Escrow + 70/5/25 Split | 🟢 **Core** | On-chain escrow + auto-distribution |
| User Profile Dashboard | 🟢 **Core** | My reviews, my pioneers, total earnings |
| Snowtrace Live TX Links | 🟢 **Core** | ทุก action มี clickable explorer link |
| Leaderboard | 🟡 **Nice-to-Have** | Top pioneers & reviewers ranking |
| SBT / Soulbound Reputation | ⚪ **Future** | ตัดออกจาก PoC เพื่อโฟกัส |
| Decentralized Storage (IPFS) | ⚪ **Future** | ใช้ local storage ก่อน |
| Off-Peak Dynamic Deals | ⚪ **Future** | ต้องมี Background Worker + Geofencing |

---

## 11. Environment & Configuration

```env
# .env.local
# ── Database ──
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tastechain

# ── Blockchain (Avalanche Fuji Testnet) ──
NEXT_PUBLIC_CHAIN_ID=43113
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_EXPLORER_URL=https://testnet.snowtrace.io

# ── Deployed Contract Addresses (after deployment) ──
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_BOUNTY_ADDRESS=0x...

# ── Oracle Wallet (Backend — NEVER expose to frontend) ──
ORACLE_PRIVATE_KEY=0x...

# ── Faucet Wallet (for Judge Demo Mode) ──
FAUCET_PRIVATE_KEY=0x...
FAUCET_DRIP_AMOUNT=0.1

# ── OpenAI API (Slip OCR) ──
OPENAI_API_KEY=sk-...

# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 12. Execution Plan (Build Order)

| Phase | Tasks | Priority |
| :--- | :--- | :---: |
| **Phase 1: DB Migration** | รัน SQL สร้าง 3 ตารางใหม่ใน `tastechain` DB | 🔴 First |
| **Phase 2: Smart Contracts** | เขียน + Test + Deploy `Registry` & `Bounty` บน Fuji | 🔴 First |
| **Phase 3: Backend API** | Search API (places query), Slip OCR endpoint (OpenAI), Faucet endpoint, TX relayer | 🟠 Second |
| **Phase 4: Frontend** | Next.js scaffold, DaisyUI theming, Venue list/detail, Review flow, Wallet connect, Judge mode | 🟠 Second |
| **Phase 5: Integration** | End-to-end flow: Search → Review → OCR → Sign TX → On-chain → Postgres → Snowtrace link | 🟡 Third |
| **Phase 6: Polish** | Leaderboard, Map view, Loading states, Error handling, Mobile responsive | 🟢 Last |