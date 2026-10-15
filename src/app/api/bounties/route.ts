import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getPlaceHash, getSnowtraceTxUrl } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      place_id,
      merchant_address,
      total_budget_avax,
      reward_per_visit_avax,
      min_spend_thb = 100,
      onchain_tx_hash,
    } = body;

    if (!place_id || !merchant_address || !total_budget_avax || !reward_per_visit_avax) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (place_id, merchant_address, total_budget_avax, reward_per_visit_avax)" },
        { status: 400 }
      );
    }

    const budget = parseFloat(total_budget_avax);
    const reward = parseFloat(reward_per_visit_avax);

    if (budget <= 0 || reward <= 0 || reward > budget) {
      return NextResponse.json(
        { success: false, error: "Invalid budget or reward amounts (reward must be > 0 and <= total budget)" },
        { status: 400 }
      );
    }

    const placeCheck = await query(
      `SELECT place_id, name FROM places WHERE place_id = $1 LIMIT 1;`,
      [place_id]
    );

    if (placeCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 }
      );
    }

    const placeHash = getPlaceHash(place_id);
    const txHash = onchain_tx_hash || "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

    const insertSql = `
      INSERT INTO merchant_bounties (
        place_id, place_hash, merchant_address, total_budget_avax,
        remaining_budget_avax, reward_per_visit_avax, min_spend_thb,
        total_claims, onchain_tx_hash, status
      ) VALUES (
        $1, $2, $3, $4,
        $4, $5, $6,
        0, $7, 'ACTIVE'
      ) RETURNING id, place_id, total_budget_avax, status, created_at;
    `;

    const res = await query(insertSql, [
      place_id,
      placeHash,
      merchant_address,
      budget,
      reward,
      min_spend_thb,
      txHash,
    ]);

    return NextResponse.json({
      success: true,
      message: `ตั้งแคมเปญ Bounty สำเร็จ! งบประมาณ ${budget} AVAX (จ่าย ${reward} AVAX/รีวิว)`,
      bounty: res[0],
      snowtraceUrl: getSnowtraceTxUrl(txHash),
    });
  } catch (error: any) {
    console.error("Error creating bounty:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create bounty", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const bounties = await query(`
      SELECT 
        mb.id,
        mb.place_id,
        p.name as place_name,
        p.address as place_address,
        p.service_type,
        mb.merchant_address,
        mb.total_budget_avax,
        mb.remaining_budget_avax,
        mb.reward_per_visit_avax,
        mb.min_spend_thb,
        mb.total_claims,
        mb.onchain_tx_hash,
        mb.status,
        mb.created_at
      FROM merchant_bounties mb
      JOIN places p ON mb.place_id = p.place_id
      ORDER BY mb.created_at DESC
      LIMIT 20;
    `);

    return NextResponse.json({
      success: true,
      bounties: bounties.map((b: any) => ({
        ...b,
        total_budget_avax: parseFloat(b.total_budget_avax),
        remaining_budget_avax: parseFloat(b.remaining_budget_avax),
        reward_per_visit_avax: parseFloat(b.reward_per_visit_avax),
        snowtraceUrl: getSnowtraceTxUrl(b.onchain_tx_hash),
      })),
    });
  } catch (error: any) {
    console.error("Error listing bounties:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bounties", details: error.message },
      { status: 500 }
    );
  }
}
