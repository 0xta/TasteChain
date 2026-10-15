import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getPlaceHash, getSnowtraceTxUrl } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Fetch place
    const placeRows = await query(
      `
      SELECT *
      FROM places
      WHERE place_id = $1 OR id::text = $1
      LIMIT 1;
    `,
      [id]
    );

    if (!placeRows || placeRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 }
      );
    }

    const place = placeRows[0];
    const placeHash = getPlaceHash(place.place_id);

    // 2. Fetch Pioneers (slots 1, 2, 3)
    const pioneerRows = await query(
      `
      SELECT slot_index, pioneer_address, onchain_tx_hash, total_royalty_earned_avax, claimed_at
      FROM pioneer_claims
      WHERE place_id = $1
      ORDER BY slot_index ASC;
    `,
      [place.place_id]
    );

    const pioneers = [1, 2, 3].map((slot) => {
      const found = pioneerRows.find((p: any) => p.slot_index === slot);
      return {
        slot,
        claimed: !!found,
        address: found ? found.pioneer_address : null,
        txHash: found ? found.onchain_tx_hash : null,
        snowtraceUrl: found ? getSnowtraceTxUrl(found.onchain_tx_hash) : null,
        royaltyEarnedAvax: found ? parseFloat(found.total_royalty_earned_avax) : 0,
        claimedAt: found ? found.claimed_at : null,
      };
    });

    // 3. Fetch Verified Reviews
    const reviews = await query(
      `
      SELECT 
        id, reviewer_address, rating, review_text, verification_tier,
        slip_amount_thb, onchain_tx_hash, onchain_block_number, is_pioneer,
        pioneer_slot, bounty_reward_avax, photo_url, created_at
      FROM verified_reviews
      WHERE place_id = $1
      ORDER BY created_at DESC
      LIMIT 50;
    `,
      [place.place_id]
    );

    // 4. Fetch Active Bounty
    const bountyRows = await query(
      `
      SELECT id, merchant_address, total_budget_avax, remaining_budget_avax,
             reward_per_visit_avax, min_spend_thb, total_claims, onchain_tx_hash,
             status, created_at
      FROM merchant_bounties
      WHERE place_id = $1 AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1;
    `,
      [place.place_id]
    );

    const activeBounty = bountyRows.length > 0 ? {
      merchant: bountyRows[0].merchant_address,
      remainingAvax: parseFloat(bountyRows[0].remaining_budget_avax),
      rewardPerVisitAvax: parseFloat(bountyRows[0].reward_per_visit_avax),
      minSpendThb: parseFloat(bountyRows[0].min_spend_thb),
      totalClaims: parseInt(bountyRows[0].total_claims || "0"),
      txHash: bountyRows[0].onchain_tx_hash,
      snowtraceUrl: getSnowtraceTxUrl(bountyRows[0].onchain_tx_hash),
    } : null;

    return NextResponse.json({
      success: true,
      place: {
        id: place.id,
        place_id: place.place_id,
        place_hash: placeHash,
        name: place.name,
        address: place.address,
        city: place.city,
        latitude: place.latitude ? parseFloat(place.latitude) : null,
        longitude: place.longitude ? parseFloat(place.longitude) : null,
        service_type: place.service_type,
        rating: place.rating ? parseFloat(place.rating) : null,
        total_reviews: place.total_reviews || 0,
        opening_hours: place.opening_hours || {},
        google_map_url: place.google_map_url,
        website: place.website,
        business_status: place.business_status,
      },
      pioneers,
      pioneerSlotsOpen: pioneers.filter((p) => !p.claimed).length,
      bounty: activeBounty,
      reviews: reviews.map((r: any) => ({
        id: r.id,
        reviewerAddress: r.reviewer_address,
        rating: r.rating,
        reviewText: r.review_text,
        tier: r.verification_tier,
        slipAmountThb: r.slip_amount_thb ? parseFloat(r.slip_amount_thb) : null,
        onchainTxHash: r.onchain_tx_hash,
        snowtraceUrl: r.onchain_tx_hash ? getSnowtraceTxUrl(r.onchain_tx_hash) : null,
        isPioneer: r.is_pioneer,
        pioneerSlot: r.pioneer_slot,
        bountyRewardAvax: r.bounty_reward_avax ? parseFloat(r.bounty_reward_avax) : 0,
        photoUrl: r.photo_url,
        createdAt: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/places/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch venue detail", details: error.message },
      { status: 500 }
    );
  }
}
