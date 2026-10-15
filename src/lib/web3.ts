import { ethers } from "ethers";
import crypto from "crypto";

export const FUJI_CHAIN_ID = 43113;
export const FUJI_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
export const SNOWTRACE_BASE_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.snowtrace.io";

/**
 * Compute placeHash from Google Place ID using keccak256
 * Matches contract input: bytes32 placeHash
 */
export function getPlaceHash(placeId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(placeId));
}

/**
 * Compute slipHash from Transaction Ref ID
 */
export function getSlipHash(refId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(refId));
}

/**
 * Compute SHA-256 hash of Bank Tx Ref ID for database uniqueness
 */
export function getSha256(content: string): string {
  return "0x" + crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Get Avalanche Fuji JsonRpcProvider
 */
export function getFujiProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(FUJI_RPC_URL);
}

/**
 * Get Snowtrace link for transaction or address
 */
export function getSnowtraceTxUrl(txHash: string): string {
  return `${SNOWTRACE_BASE_URL}/tx/${txHash}`;
}

export function getSnowtraceAddressUrl(address: string): string {
  return `${SNOWTRACE_BASE_URL}/address/${address}`;
}
