import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const venueStats = await query(`
      SELECT 
        COUNT(*) as total_venues,
        COUNT(*) FILTER (WHERE service_type IN ('restaurant','cafe','bakery','bar','coffee_shop','thai_restaurant','noodle_shop','japanese_restaurant','fast_food_restaurant','chinese_restaurant')) as fb_venues,
        COUNT(*) FILTER (WHERE rating >= 4.5) as top_rated_venues
      FROM v_bangkok_venues;
    `);

    const protocolStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM verified_reviews) as total_verified_reviews,
        (SELECT COALESCE(SUM(bounty_reward_avax), 0) FROM verified_reviews) as total_avax_distributed,
        (SELECT COUNT(*) FROM pioneer_claims) as total_pioneers_claimed,
        (SELECT COUNT(*) FROM merchant_bounties WHERE status = 'ACTIVE') as active_bounties;
    `);

    return NextResponse.json({
      success: true,
      stats: {
        totalBangkokVenues: parseInt(venueStats[0]?.total_venues || "0"),
        foodAndBeverageVenues: parseInt(venueStats[0]?.fb_venues || "0"),
        topRatedVenues: parseInt(venueStats[0]?.top_rated_venues || "0"),
        totalVerifiedReviews: parseInt(protocolStats[0]?.total_verified_reviews || "0"),
        totalAvaxDistributed: parseFloat(protocolStats[0]?.total_avax_distributed || "0"),
        totalPioneersClaimed: parseInt(protocolStats[0]?.total_pioneers_claimed || "0"),
        activeBounties: parseInt(protocolStats[0]?.active_bounties || "0"),
      },
    });
  } catch (error: any) {
    console.error("Error in /api/stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats", details: error.message },
      { status: 500 }
    );
  }
}
