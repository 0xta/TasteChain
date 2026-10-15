import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSnowtraceTxUrl, getSnowtraceAddressUrl } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Top Pioneers (ranked by total pioneer slots held & royalty)
    const topPioneers = await query(`
      SELECT 
        pioneer_address,
        COUNT(*) as total_slots,
        COALESCE(SUM(total_royalty_earned_avax), 0) as total_royalty_avax,
        MAX(claimed_at) as last_claimed_at
      FROM pioneer_claims
      GROUP BY pioneer_address
      ORDER BY total_slots DESC, total_royalty_avax DESC
      LIMIT 10;
    `);

    // 2. Top Reviewers / Food Explorers (ranked by verified reviews count & earnings)
    const topReviewers = await query(`
      SELECT 
        reviewer_address,
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE is_pioneer = true) as pioneer_reviews,
        COALESCE(SUM(bounty_reward_avax), 0) as total_bounty_avax,
        MAX(created_at) as last_reviewed_at
      FROM verified_reviews
      GROUP BY reviewer_address
      ORDER BY total_reviews DESC, total_bounty_avax DESC
      LIMIT 10;
    `);

    // 3. Recent Activity Stream
    const recentActivity = await query(`
      SELECT 
        vr.id,
        vr.place_id,
        p.name as place_name,
        vr.reviewer_address,
        vr.rating,
        vr.review_text,
        vr.is_pioneer,
        vr.pioneer_slot,
        vr.bounty_reward_avax,
        vr.onchain_tx_hash,
        vr.created_at
      FROM verified_reviews vr
      JOIN places p ON vr.place_id = p.place_id
      ORDER BY vr.created_at DESC
      LIMIT 10;
    `);

    return NextResponse.json({
      success: true,
      topPioneers: topPioneers.map((p: any) => ({
        address: p.pioneer_address,
        totalSlots: parseInt(p.total_slots),
        totalRoyaltyAvax: parseFloat(p.total_royalty_avax),
        snowtraceUrl: getSnowtraceAddressUrl(p.pioneer_address),
        lastClaimedAt: p.last_claimed_at,
      })),
      topReviewers: topReviewers.map((r: any) => ({
        address: r.reviewer_address,
        totalReviews: parseInt(r.total_reviews),
        pioneerReviews: parseInt(r.pioneer_reviews),
        totalBountyAvax: parseFloat(r.total_bounty_avax),
        snowtraceUrl: getSnowtraceAddressUrl(r.reviewer_address),
        lastReviewedAt: r.last_reviewed_at,
      })),
      recentActivity: recentActivity.map((a: any) => ({
        id: a.id,
        placeName: a.place_name,
        reviewerAddress: a.reviewer_address,
        rating: a.rating,
        reviewText: a.review_text,
        isPioneer: a.is_pioneer,
        pioneerSlot: a.pioneer_slot,
        bountyRewardAvax: parseFloat(a.bounty_reward_avax || "0"),
        txHash: a.onchain_tx_hash,
        snowtraceUrl: a.onchain_tx_hash ? getSnowtraceTxUrl(a.onchain_tx_hash) : null,
        createdAt: a.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/leaderboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard", details: error.message },
      { status: 500 }
    );
  }
}
