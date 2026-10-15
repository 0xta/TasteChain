import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getFujiProvider, getSnowtraceTxUrl } from "@/lib/web3";

export const dynamic = "force-dynamic";

// In-memory IP rate limiter: IP => timestamp
const ipRateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { success: false, error: "ที่อยู่กระเป๋าเงินไม่ถูกต้อง (Invalid Web3 address)" },
        { status: 400 }
      );
    }

    // Rate Limiting by IP
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const lastRequestTime = ipRateLimitMap.get(clientIp);
    const now = Date.now();

    if (lastRequestTime && now - lastRequestTime < RATE_LIMIT_WINDOW_MS) {
      const waitMinutes = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastRequestTime)) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `คุณได้ขอรับ Testnet AVAX ไปแล้ว กรุณารออีก ${waitMinutes} นาทีก่อนขอใหม่`,
        },
        { status: 429 }
      );
    }

    const faucetKey = process.env.FAUCET_PRIVATE_KEY;
    const dripAmountStr = process.env.FAUCET_DRIP_AMOUNT || "0.1";
    const dripAmount = ethers.parseEther(dripAmountStr);

    if (!faucetKey) {
      return NextResponse.json(
        { success: false, error: "Faucet service is not configured (FAUCET_PRIVATE_KEY missing)" },
        { status: 503 }
      );
    }

    const provider = getFujiProvider();
    const faucetWallet = new ethers.Wallet(faucetKey, provider);

    // Check Faucet Balance
    const balance = await provider.getBalance(faucetWallet.address);
    if (balance < dripAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `กระเป๋า Faucet มีเหรียญไม่เพียงพอ (คงเหลือ ${ethers.formatEther(balance)} AVAX) กรุณาเติมเหรียญที่ https://core.app/tools/testnet-faucet/`,
          faucetAddress: faucetWallet.address,
        },
        { status: 503 }
      );
    }

    // Send AVAX transaction on Fuji
    const tx = await faucetWallet.sendTransaction({
      to: address,
      value: dripAmount,
    });

    // Record rate limit
    ipRateLimitMap.set(clientIp, now);

    return NextResponse.json({
      success: true,
      message: `โอนสำเร็จ! ส่ง ${dripAmountStr} Fuji AVAX เข้ากระเป๋าเรียบร้อยแล้ว`,
      recipient: address,
      amount: dripAmountStr,
      txHash: tx.hash,
      snowtraceUrl: getSnowtraceTxUrl(tx.hash),
    });
  } catch (error: any) {
    console.error("Error in /api/faucet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to drip AVAX", details: error.message },
      { status: 500 }
    );
  }
}
