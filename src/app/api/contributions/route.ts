import { NextRequest, NextResponse } from "next/server";
import { createDemoCalendar } from "@/lib/demo-calendar";
import { fetchContributionCalendar, GitHubApiError, lastYearRange } from "@/lib/github";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const demo = request.nextUrl.searchParams.get("demo") === "1";

  if (!username || demo) {
    return NextResponse.json(createDemoCalendar());
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "GITHUB_TOKEN이 없습니다. .env.local에 토큰을 넣거나 데모 도시로 시작하세요.",
        demoAvailable: true,
      },
      { status: 503 },
    );
  }

  try {
    const { from, to } = lastYearRange();
    const calendar = await fetchContributionCalendar(token, username, from, to);
    return NextResponse.json(calendar);
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "기여 달력을 가져오지 못했습니다." },
      { status: 500 },
    );
  }
}
