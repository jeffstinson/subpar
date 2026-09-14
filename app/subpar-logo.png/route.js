import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect("https://raw.githubusercontent.com/jeffstinson/subpar/main/subpar-logo.png");
}
