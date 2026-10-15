-- ========================================================
-- Migration: 001_create_tastechain_tables.sql
-- Description: Creates verified_reviews, pioneer_claims,
--              merchant_bounties and v_bangkok_venues
-- ========================================================

-- Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. verified_reviews
CREATE TABLE IF NOT EXISTS verified_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
    place_hash VARCHAR(66) NOT NULL,       -- keccak256(place_id) used as on-chain key
    reviewer_address VARCHAR(42) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    -- Verification Data
    verification_tier SMALLINT NOT NULL DEFAULT 1, -- 1: GPS, 2: Photo, 3: Full Slip
    gps_latitude NUMERIC(10, 7),
    gps_longitude NUMERIC(10, 7),
    gps_distance_meters NUMERIC(8, 2),
    slip_amount_thb NUMERIC(10, 2),
    slip_ref_hash VARCHAR(66) UNIQUE,      -- SHA-256 of Bank Tx Ref ID
    slip_ocr_raw JSONB,
    food_photo_phash VARCHAR(64),
    photo_url TEXT,
    -- On-chain Web3 Fields
    onchain_tx_hash VARCHAR(66),
    onchain_block_number BIGINT,
    is_pioneer BOOLEAN DEFAULT FALSE,
    pioneer_slot SMALLINT,                 -- 1, 2, or 3
    bounty_reward_avax NUMERIC(18, 8) DEFAULT 0,
    -- Status
    status VARCHAR(20) DEFAULT 'CONFIRMED', -- PENDING, CONFIRMED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vr_place_id ON verified_reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_vr_wallet ON verified_reviews(reviewer_address);
CREATE INDEX IF NOT EXISTS idx_vr_tx_hash ON verified_reviews(onchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_vr_created ON verified_reviews(created_at DESC);

-- 2. pioneer_claims
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

-- 3. merchant_bounties
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

-- 4. View for Bangkok Operational Venues
CREATE OR REPLACE VIEW v_bangkok_venues AS
SELECT 
    id,
    place_id,
    name,
    address,
    city,
    latitude,
    longitude,
    service_type,
    service_types,
    business_status,
    rating,
    total_reviews,
    opening_hours,
    google_map_url,
    website
FROM places
WHERE city = 'กรุงเทพมหานคร' 
  AND business_status = 'OPERATIONAL';
