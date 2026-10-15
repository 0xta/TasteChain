import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Query place by place_id or UUID id
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
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const place = placeRows[0];

    // Fetch pioneers for this place
    const pioneers = await query(
      `
      SELECT slot_index, pioneer_address, onchain_tx_hash, total_royalty_earned_avax, claimed_at
      FROM pioneer_claims
      WHERE place_id = $1
      ORDER BY slot_index ASC;
    `,
      [place.place_id]
    );

    // Fetch verified reviews for this place
    const reviews = await query(
      `
      SELECT 
        id, reviewer_address, rating, review_text, verification_tier,
        slip_amount_thb, onchain_tx_hash, onchain_block_number, is_pioneer,
        pioneer_slot, bounty_reward_avax, status, created_at
      FROM verified_reviews
      WHERE place_id = $1
      ORDER BY created_at DESC
      LIMIT 20;
    `,
      [place.place_id]
    );

    // Fetch bounties
    const bounties = await query(
      `
      SELECT id, merchant_address, total_budget_avax, remaining_budget_avax,
             reward_per_visit_avax, min_spend_thb, total_claims, onchain_tx_hash,
             status, created_at
      FROM merchant_bounties
      WHERE place_id = $1
      ORDER BY created_at DESC;
    `,
      [place.place_id]
    );

    return NextResponse.json({
      place: {
        ...place,
        latitude: place.latitude ? parseFloat(place.latitude) : null,
        longitude: place.longitude ? parseFloat(place.longitude) : null,
        rating: place.rating ? parseFloat(place.rating) : null,
      },
      pioneers,
      reviews,
      bounties,
    });
  } catch (error: any) {
    console.error("Error fetching place detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch place detail", details: error.message },
      { status: 500 }
    );
  }
}
