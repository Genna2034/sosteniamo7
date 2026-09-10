import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ service: "sosteniamo7", version: "0.7.0", status: "ok" }); }
