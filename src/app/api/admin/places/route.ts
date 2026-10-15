import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const serviceType = searchParams.get("type") || "";
    const minRating = parseFloat(searchParams.get("minRating") || "0");
    const sortBy = searchParams.get("sortBy") || "reviews_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
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

    const whereClause = conditions.join(" AND ");

    // Sorting
    let orderBy = "total_reviews DESC NULLS LAST";
    if (sortBy === "rating_desc") {
      orderBy = "rating DESC NULLS LAST, total_reviews DESC NULLS LAST";
    } else if (sortBy === "name_asc") {
      orderBy = "name ASC";
    }

    // 1. Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total 
      FROM v_bangkok_venues 
      WHERE ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes[0]?.total || "0");
    const totalPages = Math.ceil(total / limit);

    // 2. Fetch records with companion web3 stats (pioneer count, active bounty)
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
        v.website,
        (SELECT COUNT(*) FROM pioneer_claims pc WHERE pc.place_id = v.place_id) as pioneer_count,
        (SELECT COUNT(*) FROM verified_reviews vr WHERE vr.place_id = v.place_id) as review_count,
        (SELECT COUNT(*) > 0 FROM merchant_bounties mb WHERE mb.place_id = v.place_id AND mb.status = 'ACTIVE') as has_active_bounty
      FROM v_bangkok_venues v
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const listParams = [...params, limit, offset];
    const places = await query(listSql, listParams);

    return NextResponse.json({
      places: places.map((p: any) => ({
        ...p,
        latitude: p.latitude ? parseFloat(p.latitude) : null,
        longitude: p.longitude ? parseFloat(p.longitude) : null,
        rating: p.rating ? parseFloat(p.rating) : null,
        pioneer_count: parseInt(p.pioneer_count || "0"),
        review_count: parseInt(p.review_count || "0"),
        has_active_bounty: !!p.has_active_bounty,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error searching places:", error);
    return NextResponse.json(
      { error: "Failed to search places", details: error.message },
      { status: 500 }
    );
  }
}
