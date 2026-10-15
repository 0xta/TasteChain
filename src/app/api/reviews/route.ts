import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getPlaceHash, getSnowtraceTxUrl } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      place_id,
      reviewer_address,
      rating,
      review_text,
      verification_tier = 3,
      slip_amount_thb = 0,
      slip_ref_hash,
      slip_ocr_raw,
      food_photo_phash,
      photo_url,
      onchain_tx_hash,
      onchain_block_number,
      is_pioneer = false,
      pioneer_slot = null,
      bounty_reward_avax = 0,
    } = body;

    // 1. Validations
    if (!place_id || !reviewer_address || !rating || !review_text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (place_id, reviewer_address, rating, review_text)" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Verify place exists in places table
    const placeCheck = await query(
      `SELECT place_id FROM places WHERE place_id = $1 LIMIT 1;`,
      [place_id]
    );

    if (placeCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Place not found in database" },
        { status: 404 }
      );
    }

    const placeHash = getPlaceHash(place_id);

    // 2. Check 24-hour rate limit per wallet per place
    const recentReview = await query(
      `SELECT id, created_at FROM verified_reviews 
       WHERE place_id = $1 AND reviewer_address = $2 
       AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1;`,
      [place_id, reviewer_address]
    );

    if (recentReview.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "คุณได้ส่งรีวิวร้านนี้ไปแล้วในรอบ 24 ชั่วโมง กรุณารอ 24 ชั่วโมงก่อนส่งรีวิวถัดไป",
        },
        { status: 429 }
      );
    }

    // 3. Insert into verified_reviews
    const insertReviewSql = `
      INSERT INTO verified_reviews (
        place_id, place_hash, reviewer_address, rating, review_text,
        verification_tier, slip_amount_thb, slip_ref_hash, slip_ocr_raw,
        food_photo_phash, photo_url, onchain_tx_hash, onchain_block_number,
        is_pioneer, pioneer_slot, bounty_reward_avax, status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, 'CONFIRMED'
      ) RETURNING id, created_at;
    `;

    const reviewRes = await query(insertReviewSql, [
      place_id,
      placeHash,
      reviewer_address,
      rating,
      review_text,
      verification_tier,
      slip_amount_thb,
      slip_ref_hash,
      slip_ocr_raw ? JSON.stringify(slip_ocr_raw) : null,
      food_photo_phash || null,
      photo_url || null,
      onchain_tx_hash || null,
      onchain_block_number || null,
      is_pioneer,
      pioneer_slot,
      bounty_reward_avax,
    ]);

    const reviewId = reviewRes[0].id;

    // 4. If pioneer slot awarded, insert into pioneer_claims
    let registeredPioneerSlot = null;
    if (is_pioneer && pioneer_slot && [1, 2, 3].includes(pioneer_slot)) {
      try {
        const insertPioneerSql = `
          INSERT INTO pioneer_claims (
            place_id, place_hash, slot_index, pioneer_address, review_id, onchain_tx_hash
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (place_id, slot_index) DO NOTHING
          RETURNING slot_index;
        `;
        const pioneerRes = await query(insertPioneerSql, [
          place_id,
          placeHash,
          pioneer_slot,
          reviewer_address,
          reviewId,
          onchain_tx_hash || "0x0",
        ]);
        if (pioneerRes.length > 0) {
          registeredPioneerSlot = pioneerRes[0].slot_index;
        }
      } catch (pioneerErr: any) {
        console.warn("Could not insert pioneer claim (slot might be taken):", pioneerErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "รีวิวและหลักฐาน Proof-of-Visit บันทึกสำเร็จ!",
      reviewId,
      isPioneer: !!registeredPioneerSlot,
      pioneerSlot: registeredPioneerSlot,
      snowtraceUrl: onchain_tx_hash ? getSnowtraceTxUrl(onchain_tx_hash) : null,
    });
  } catch (error: any) {
    if (error.code === "23505" && error.constraint === "verified_reviews_slip_ref_hash_key") {
      return NextResponse.json(
        { success: false, is_duplicate: true, error: "สลิปนี้ถูกใช้ในระบบไปแล้ว ไม่สามารถส่งซ้ำได้" },
        { status: 409 }
      );
    }
    console.error("Error in /api/reviews:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record review", details: error.message },
      { status: 500 }
    );
  }
}
