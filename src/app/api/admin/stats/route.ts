import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Overall counts
    const countsResult = await query(`
      SELECT 
        COUNT(*) as total_venues,
        COUNT(*) FILTER (WHERE service_type IN ('restaurant','cafe','bakery','bar','coffee_shop','thai_restaurant','noodle_shop','japanese_restaurant','fast_food_restaurant','chinese_restaurant')) as fb_venues,
        COUNT(*) FILTER (WHERE rating >= 4.5) as top_rated_venues,
        COUNT(*) FILTER (WHERE total_reviews > 0) as reviewed_venues,
        AVG(rating) FILTER (WHERE rating > 0) as avg_rating
      FROM v_bangkok_venues;
    `);

    // 2. Service type breakdown
    const serviceTypes = await query(`
      SELECT service_type, COUNT(*) as count
      FROM v_bangkok_venues
      WHERE service_type IS NOT NULL AND service_type != ''
      GROUP BY service_type
      ORDER BY count DESC
      LIMIT 10;
    `);

    // 3. Web3 Companion tables counts
    const web3Stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM verified_reviews) as total_verified_reviews,
        (SELECT COUNT(*) FROM pioneer_claims) as total_pioneers_claimed,
        (SELECT COUNT(*) FROM merchant_bounties WHERE status = 'ACTIVE') as active_bounties;
    `);

    // 4. Rating distribution (5 stars, 4-4.9, 3-3.9, etc.)
    const ratingDist = await query(`
      SELECT 
        CASE 
          WHEN rating >= 4.8 THEN '4.8 - 5.0'
          WHEN rating >= 4.5 THEN '4.5 - 4.7'
          WHEN rating >= 4.0 THEN '4.0 - 4.4'
          WHEN rating >= 3.0 THEN '3.0 - 3.9'
          ELSE 'Under 3.0'
        END as rating_bucket,
        COUNT(*) as count
      FROM v_bangkok_venues
      WHERE rating > 0
      GROUP BY rating_bucket
      ORDER BY count DESC;
    `);

    const stats = {
      overall: {
        totalVenues: parseInt(countsResult[0]?.total_venues || "0"),
        fbVenues: parseInt(countsResult[0]?.fb_venues || "0"),
        topRatedVenues: parseInt(countsResult[0]?.top_rated_venues || "0"),
        reviewedVenues: parseInt(countsResult[0]?.reviewed_venues || "0"),
        avgRating: parseFloat(countsResult[0]?.avg_rating || "0").toFixed(2),
      },
      web3: {
        totalVerifiedReviews: parseInt(web3Stats[0]?.total_verified_reviews || "0"),
        totalPioneersClaimed: parseInt(web3Stats[0]?.total_pioneers_claimed || "0"),
        activeBounties: parseInt(web3Stats[0]?.active_bounties || "0"),
      },
      serviceTypes: serviceTypes.map((r: any) => ({
        type: r.service_type,
        count: parseInt(r.count),
      })),
      ratingDistribution: ratingDist.map((r: any) => ({
        bucket: r.rating_bucket,
        count: parseInt(r.count),
      })),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error.message },
      { status: 500 }
    );
  }
}
