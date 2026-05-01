import { NextResponse } from "next/server";
import { getLeadsFromSheet } from "@/lib/sheets";

export async function GET() {
  try {
    const leads = await getLeadsFromSheet();
    return NextResponse.json({ leads });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
