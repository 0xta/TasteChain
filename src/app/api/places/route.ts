import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getPlaceHash } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || searchParams.get("search") || "";
    const serviceType = searchParams.get("type") || "";
    const minRating = parseFloat(searchParams.get("rating") || "0");
    const hasBountyOnly = searchParams.get("bounty") === "true";
    const pioneerOpenOnly = searchParams.get("pioneer") === "true";
    const sortBy = searchParams.get("sort") || "reviews_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (serviceType && serviceType !== "all") {
      conditions.push(`service_type = $${paramIndex}`);
      params.push(serviceType);
      paramIndex++;
    }

    if (minRating > 0) {
      conditions.push(`rating >= $${paramIndex}`);
      params.push(minRating);
      paramIndex++;
    }

    if (hasBountyOnly) {
      conditions.push(
        `EXISTS (SELECT 1 FROM merchant_bounties mb WHERE mb.place_id = v.place_id AND mb.status = 'ACTIVE')`
      );
    }

    if (pioneerOpenOnly) {
      conditions.push(
        `(SELECT COUNT(*) FROM pioneer_claims pc WHERE pc.place_id = v.place_id) < 3`
      );
    }

    const whereClause = conditions.join(" AND ");

    let orderBy = "v.total_reviews DESC NULLS LAST";
    if (sortBy === "rating_desc") {
      orderBy = "v.rating DESC NULLS LAST, v.total_reviews DESC NULLS LAST";
    } else if (sortBy === "name_asc") {
      orderBy = "v.name ASC";
    }

    // 1. Total Count
    const countSql = `
      SELECT COUNT(*) as total 
      FROM v_bangkok_venues v
      WHERE ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes[0]?.total || "0");
    const totalPages = Math.ceil(total / limit);

    // 2. Fetch list
    const listSql = `
      SELECT 
        v.id,
        v.place_id,
        v.name,
        v.address,
        v.city,
        v.latitude,
        v.longitude,
        v.service_type,
        v.rating,
        v.total_reviews,
        v.opening_hours,
        v.google_map_url,
        (SELECT COUNT(*) FROM pioneer_claims pc WHERE pc.place_id = v.place_id) as pioneer_count,
        (SELECT COUNT(*) FROM verified_reviews vr WHERE vr.place_id = v.place_id) as verified_review_count,
        (SELECT mb.remaining_budget_avax FROM merchant_bounties mb WHERE mb.place_id = v.place_id AND mb.status = 'ACTIVE' LIMIT 1) as active_bounty_avax,
        (SELECT mb.reward_per_visit_avax FROM merchant_bounties mb WHERE mb.place_id = v.place_id AND mb.status = 'ACTIVE' LIMIT 1) as reward_per_visit_avax
      FROM v_bangkok_venues v
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const places = await query(listSql, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      places: places.map((p: any) => ({
        id: p.id,
        place_id: p.place_id,
        place_hash: getPlaceHash(p.place_id),
        name: p.name,
        address: p.address,
        city: p.city,
        latitude: p.latitude ? parseFloat(p.latitude) : null,
        longitude: p.longitude ? parseFloat(p.longitude) : null,
        service_type: p.service_type,
        rating: p.rating ? parseFloat(p.rating) : null,
        total_reviews: p.total_reviews || 0,
        opening_hours: p.opening_hours || {},
        google_map_url: p.google_map_url,
        pioneers: {
          claimed: parseInt(p.pioneer_count || "0"),
          slotsOpen: Math.max(0, 3 - parseInt(p.pioneer_count || "0")),
        },
        verifiedReviewsCount: parseInt(p.verified_review_count || "0"),
        bounty: p.active_bounty_avax
          ? {
              active: true,
              remainingAvax: parseFloat(p.active_bounty_avax),
              rewardPerVisitAvax: parseFloat(p.reward_per_visit_avax || "0"),
            }
          : { active: false, remainingAvax: 0, rewardPerVisitAvax: 0 },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/places:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch places", details: error.message },
      { status: 500 }
    );
  }
}
