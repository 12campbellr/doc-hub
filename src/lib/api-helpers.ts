import { NextResponse } from "next/server";

export function handleApiError(err: unknown) {
  const status = (err as { status?: number })?.status ?? 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  if (status === 500) {
    console.error(err);
  }
  return NextResponse.json({ error: message }, { status });
}
