import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { withdrawal, getUserBalances } from "@/lib/services/ledger";
import { parseUsdt, formatUsdt } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    const body = await req.json();
    const { network, address, amount } = body;

    if (!network || !address || !amount) {
      return errorResponse("network, address, and amount are required", 400);
    }

    // Validate network
    const validNetworks = ["TRC20", "BEP20", "ERC20"];
    if (!validNetworks.includes(network)) {
      return errorResponse(
        `Invalid network. Must be one of: ${validNetworks.join(", ")}`,
        400
      );
    }

    // Validate address format
    const trimmedAddress = address.trim();
    if (network === "TRC20") {
      // Tron address: starts with 'T', base58 alphanumeric, exactly 34 characters
      const tronRegex = /^T[1-9A-HJ-NP-za-km-z]{33}$/;
      if (!tronRegex.test(trimmedAddress)) {
        return errorResponse(
          "Invalid TRC20 address. Must start with 'T' and be 34 characters long.",
          400
        );
      }
    } else {
      // ERC20 or BEP20: starts with 0x followed by 40 hex characters
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!ethRegex.test(trimmedAddress)) {
        return errorResponse(
          `Invalid ${network} address. Must start with '0x' and be 42 characters long.`,
          400
        );
      }
    }

    const amountUnits = parseUsdt(String(amount));
    if (amountUnits <= BigInt(0)) {
      return errorResponse("Amount must be greater than zero", 400);
    }

    await client.query("BEGIN");
    // Check available balance
    const balances = await getUserBalances(client, user.id);
    if (balances.available < amountUnits) {
      await client.query("ROLLBACK");
      return errorResponse(
        `Insufficient available balance. You have ${formatUsdt(balances.available)} USDT`,
        400
      );
    }

    const journalResult = await withdrawal(client, user.id, amountUnits);
    await client.query("COMMIT");

    // Generate simulated transaction hash
    const fakeTxHash =
      network === "TRC20"
        ? crypto.randomBytes(32).toString("hex")
        : `0x${crypto.randomBytes(32).toString("hex")}`;

    const newBalances = await getUserBalances(client, user.id);

    return jsonResponse({
      success: true,
      journalId: journalResult.journalId,
      txHash: fakeTxHash,
      network,
      address: trimmedAddress,
      amountFormatted: formatUsdt(amountUnits),
      newBalances: {
        available: newBalances.available,
        locked: newBalances.locked,
        availableFormatted: formatUsdt(newBalances.available),
        lockedFormatted: formatUsdt(newBalances.locked),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 400);
  } finally {
    client.release();
  }
}
