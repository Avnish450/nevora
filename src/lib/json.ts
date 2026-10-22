import { NextResponse } from "next/server";

/**
 * Safely convert objects containing bigint values into JSON-friendly format.
 * Converts BigInt to string.
 */
export function serializeBigInts<T>(obj: T): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export function jsonResponse(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(serializeBigInts(data), init);
}

export function errorResponse(
  message: string,
  status = 400,
  code = "BAD_REQUEST"
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}
