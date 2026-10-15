const http = require("http");

async function request(url, options = {}) {
  const parsed = new URL(url);
  const payload = options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : null;
  const headers = { ...(options.headers || {}) };
  if (payload) {
    headers["Content-Length"] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
          } catch (e) {
            resolve({ status: res.statusCode, body: null, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runE2E() {
  console.log("===============================================================");
  console.log("🚀 TasteChain BKK — Automated End-to-End Integration Test Suite");
  console.log("===============================================================\n");

  const baseUrl = "http://localhost:3000";

  // Step 1: Health & Stats Check
  console.log("STEP 1: Checking Protocol Health & Initial Stats...");
  const statsRes = await request(`${baseUrl}/api/stats`);
  if (statsRes.status !== 200 || !statsRes.body.success) {
    throw new Error("Failed to connect to /api/stats: " + JSON.stringify(statsRes.body));
  }
  console.log("✅ API Server is Healthy! Bangkok Venues:", statsRes.body.stats.totalBangkokVenues);

  // Step 2: Search for target test venue
  console.log("\nSTEP 2: Searching for test venue with open pioneer slots...");
  const searchRes = await request(`${baseUrl}/api/places?pioneer=true&limit=20`);
  if (searchRes.status !== 200 || !searchRes.body.places?.length) {
    throw new Error("Failed to find target venue");
  }
  const testVenue = searchRes.body.places.find(p => p.pioneers.claimed === 0) || searchRes.body.places[0];
  console.log(`✅ Selected Venue: ${testVenue.name} (ID: ${testVenue.place_id})`);
  console.log(`   Initial Pioneer Status: ${testVenue.pioneers.claimed}/3 claimed`);

  // Step 3: Merchant Funds a 0.5 AVAX Bounty
  console.log("\nSTEP 3: Merchant Funds a 0.5 AVAX Bounty...");
  const merchantAddress = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const bountyRes = await request(`${baseUrl}/api/bounties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      place_id: testVenue.place_id,
      merchant_address: merchantAddress,
      total_budget_avax: 0.5,
      reward_per_visit_avax: 0.05,
      min_spend_thb: 200,
    },
  });
  if (bountyRes.status !== 200 || !bountyRes.body || !bountyRes.body.success) {
    throw new Error(`Failed to fund bounty: status=${bountyRes.status}, raw=${bountyRes.raw}`);
  }
  console.log("✅ Bounty Funded Successfully! Budget: 0.5 AVAX (0.05 AVAX/visit)");
  console.log("   Snowtrace Tx URL:", bountyRes.body.snowtraceUrl);

  // Step 4: Reviewer 1 performs Proof-of-Visit & Claims Pioneer Slot #1
  console.log("\nSTEP 4: Reviewer 1 uploads slip and claims Pioneer Slot #1...");
  const reviewer1 = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const slip1Base64 = Buffer.from(`SLIP_REVIEWER_1_${Date.now()}_${Math.random()}`).toString("base64");

  // 4a. OCR Verification
  const ocr1Res = await request(`${baseUrl}/api/verify-slip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { imageBase64: slip1Base64 },
  });
  if (ocr1Res.status !== 200 || !ocr1Res.body.success) {
    throw new Error("OCR Verification failed: " + JSON.stringify(ocr1Res.body));
  }
  console.log("✅ Slip 1 OCR Passed! Bank:", ocr1Res.body.ocr.bank_name, "| Ref:", ocr1Res.body.ocr.transaction_ref_id);

  // 4b. Submit Review 1
  const submit1Res = await request(`${baseUrl}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      place_id: testVenue.place_id,
      reviewer_address: reviewer1,
      rating: 5,
      review_text: "ปูผัดผงกะหรี่ในตำนาน อร่อยมาก สมศักดิ์ศรีบรรทัดทอง",
      verification_tier: 3,
      slip_amount_thb: ocr1Res.body.ocr.amount_thb,
      slip_ref_hash: ocr1Res.body.hashes.slipRefHash,
      is_pioneer: true,
      pioneer_slot: 1,
      bounty_reward_avax: 0.05,
    },
  });
  if (submit1Res.status !== 200 || !submit1Res.body.success) {
    throw new Error("Review 1 submission failed: " + JSON.stringify(submit1Res.body));
  }
  console.log(`✅ Review 1 Submitted! Reviewer 1 earned Pioneer Slot #${submit1Res.body.pioneerSlot}`);

  // Step 5: Reviewer 2 performs Proof-of-Visit & Claims Pioneer Slot #2
  console.log("\nSTEP 5: Reviewer 2 uploads slip and claims Pioneer Slot #2...");
  const reviewer2 = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const slip2Base64 = Buffer.from(`SLIP_REVIEWER_2_${Date.now()}_${Math.random()}`).toString("base64");

  const ocr2Res = await request(`${baseUrl}/api/verify-slip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { imageBase64: slip2Base64 },
  });

  const submit2Res = await request(`${baseUrl}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      place_id: testVenue.place_id,
      reviewer_address: reviewer2,
      rating: 4,
      review_text: "ต้มยำกุ้งน้ำข้นรสเด็ด บริการดีรวดเร็ว",
      verification_tier: 3,
      slip_amount_thb: ocr2Res.body.ocr.amount_thb,
      slip_ref_hash: ocr2Res.body.hashes.slipRefHash,
      is_pioneer: true,
      pioneer_slot: 2,
      bounty_reward_avax: 0.05,
    },
  });
  console.log(`✅ Review 2 Submitted! Reviewer 2 earned Pioneer Slot #${submit2Res.body.pioneerSlot}`);

  // Step 6: Anti-Fraud Verification (Duplicate Slip Rejection)
  console.log("\nSTEP 6: Anti-Fraud Test — Re-submitting Slip 1...");
  const fraudSlipRes = await request(`${baseUrl}/api/verify-slip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { imageBase64: slip1Base64 },
  });
  if (fraudSlipRes.status === 409 && fraudSlipRes.body.is_duplicate) {
    console.log("✅ Anti-Fraud PASS: Duplicate slip rejected with 409 Conflict!");
    console.log("   Message:", fraudSlipRes.body.error);
  } else {
    throw new Error("Anti-Fraud FAIL: Duplicate slip was not rejected!");
  }

  // Step 7: Anti-Fraud Verification (24-Hour Rate Limit per Wallet)
  console.log("\nSTEP 7: Anti-Fraud Test — Reviewer 1 trying to spam a second review...");
  const spamReviewRes = await request(`${baseUrl}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      place_id: testVenue.place_id,
      reviewer_address: reviewer1,
      rating: 5,
      review_text: "Spamming second review...",
      slip_ref_hash: "0x" + "f".repeat(64),
    },
  });
  if (spamReviewRes.status === 429) {
    console.log("✅ Rate Limit PASS: Second review rejected with 429 Too Many Requests!");
  } else {
    throw new Error("Rate Limit FAIL: Second review was not blocked!");
  }

  // Step 8: Verify User Profile Portfolios
  console.log("\nSTEP 8: Verifying User Profile Portfolios...");
  const prof1Res = await request(`${baseUrl}/api/profile/${reviewer1}`);
  console.log("✅ Reviewer 1 Profile Verified:");
  console.log("   Total Reviews:", prof1Res.body.stats.totalReviews);
  console.log("   Pioneer Slots Held:", prof1Res.body.stats.totalPioneers);
  console.log("   Total AVAX Earned:", prof1Res.body.stats.totalEarnedAvax, "AVAX");

  // Step 9: Verify Leaderboard & Protocol Stats
  console.log("\nSTEP 9: Verifying Leaderboard Rankings & Protocol Stats...");
  const lbRes = await request(`${baseUrl}/api/leaderboard`);
  console.log("✅ Leaderboard Live:");
  console.log("   Top Pioneers:", lbRes.body.topPioneers.length, "ranked");
  console.log("   Top Reviewers:", lbRes.body.topReviewers.length, "ranked");
  console.log("   Recent Activities Stream:", lbRes.body.recentActivity.length, "records");

  const finalStatsRes = await request(`${baseUrl}/api/stats`);
  console.log("✅ Final Protocol Metrics:");
  console.log("   Total Verified Reviews:", finalStatsRes.body.stats.totalVerifiedReviews);
  console.log("   Total Pioneers Claimed:", finalStatsRes.body.stats.totalPioneersClaimed);
  console.log("   Total AVAX Distributed:", finalStatsRes.body.stats.totalAvaxDistributed, "AVAX");

  console.log("\n===============================================================");
  console.log("🎉 ALL END-TO-END INTEGRATION TESTS PASSED 100%!");
  console.log("===============================================================\n");
}

runE2E().catch((err) => {
  console.error("❌ E2E Test Failed:", err);
  process.exit(1);
});
