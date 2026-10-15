import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSnowtraceTxUrl, getSnowtraceAddressUrl } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // 1. Fetch user reviews joined with places
    const reviews = await query(
      `
      SELECT 
        vr.id,
        vr.place_id,
        p.name as place_name,
        p.address as place_address,
        p.service_type,
        vr.rating,
        vr.review_text,
        vr.verification_tier,
        vr.slip_amount_thb,
        vr.onchain_tx_hash,
        vr.onchain_block_number,
        vr.is_pioneer,
        vr.pioneer_slot,
        vr.bounty_reward_avax,
        vr.created_at
      FROM verified_reviews vr
      JOIN places p ON vr.place_id = p.place_id
      WHERE LOWER(vr.reviewer_address) = $1
      ORDER BY vr.created_at DESC;
    `,
      [normalizedAddress]
    );

    // 2. Fetch pioneer positions joined with places
    const pioneers = await query(
      `
      SELECT 
        pc.id,
        pc.place_id,
        p.name as place_name,
        p.address as place_address,
        pc.slot_index,
        pc.total_royalty_earned_avax,
        pc.onchain_tx_hash,
        pc.claimed_at
      FROM pioneer_claims pc
      JOIN places p ON pc.place_id = p.place_id
      WHERE LOWER(pc.pioneer_address) = $1
      ORDER BY pc.claimed_at DESC;
    `,
      [normalizedAddress]
    );

    // 3. Compute Stats
    let totalBountyEarned = 0;
    for (const r of reviews) {
      totalBountyEarned += parseFloat(r.bounty_reward_avax || "0");
    }

    let totalRoyaltyEarned = 0;
    for (const p of pioneers) {
      totalRoyaltyEarned += parseFloat(p.total_royalty_earned_avax || "0");
    }

    return NextResponse.json({
      success: true,
      address,
      snowtraceAddressUrl: getSnowtraceAddressUrl(address),
      stats: {
        totalReviews: reviews.length,
        totalPioneers: pioneers.length,
        totalBountyEarnedAvax: totalBountyEarned,
        totalRoyaltyEarnedAvax: totalRoyaltyEarned,
        totalEarnedAvax: totalBountyEarned + totalRoyaltyEarned,
      },
      reviews: reviews.map((r: any) => ({
        id: r.id,
        placeId: r.place_id,
        placeName: r.place_name,
        placeAddress: r.place_address,
        serviceType: r.service_type,
        rating: r.rating,
        reviewText: r.review_text,
        tier: r.verification_tier,
        slipAmountThb: r.slip_amount_thb ? parseFloat(r.slip_amount_thb) : null,
        onchainTxHash: r.onchain_tx_hash,
        snowtraceUrl: r.onchain_tx_hash ? getSnowtraceTxUrl(r.onchain_tx_hash) : null,
        isPioneer: r.is_pioneer,
        pioneerSlot: r.pioneer_slot,
        bountyRewardAvax: parseFloat(r.bounty_reward_avax || "0"),
        createdAt: r.created_at,
      })),
      pioneers: pioneers.map((p: any) => ({
        id: p.id,
        placeId: p.place_id,
        placeName: p.place_name,
        placeAddress: p.place_address,
        slotIndex: p.slot_index,
        royaltyEarnedAvax: parseFloat(p.total_royalty_earned_avax || "0"),
        onchainTxHash: p.onchain_tx_hash,
        snowtraceUrl: p.onchain_tx_hash ? getSnowtraceTxUrl(p.onchain_tx_hash) : null,
        claimedAt: p.claimed_at,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/profile/[address]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile", details: error.message },
      { status: 500 }
    );
  }
}
