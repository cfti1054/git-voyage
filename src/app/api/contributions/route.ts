import { NextRequest, NextResponse } from "next/server";
import { createDemoCalendar } from "@/lib/demo-calendar";
import {
  calendarYearRange,
  fetchContributionCalendar,
  GitHubApiError,
} from "@/lib/github";
import type { VoyageCalendar } from "@/lib/types";

const FIRST_GITHUB_YEAR = 2008;
const MAX_YEAR_SPAN = 10;
const CACHE_TTL_MS = 60 * 60 * 1000;
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const calendarCache = new Map<
  string,
  { calendar: VoyageCalendar; expiresAt: number }
>();

function publicResponse(calendar: VoyageCalendar) {
  return NextResponse.json(calendar, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const demo = request.nextUrl.searchParams.get("demo") === "1";
  const currentYear = new Date().getUTCFullYear();
  const fromYear = Number(
    request.nextUrl.searchParams.get("fromYear") ?? currentYear - 5,
  );
  const toYear = Number(
    request.nextUrl.searchParams.get("toYear") ?? currentYear,
  );

  if (
    !Number.isInteger(fromYear) ||
    !Number.isInteger(toYear) ||
    fromYear < FIRST_GITHUB_YEAR ||
    toYear > currentYear ||
    fromYear > toYear ||
    toYear - fromYear + 1 > MAX_YEAR_SPAN
  ) {
    return NextResponse.json(
      {
        error: `${FIRST_GITHUB_YEAR}~${currentYear} 사이에서 최대 ${MAX_YEAR_SPAN}년을 선택하세요.`,
      },
      { status: 400 },
    );
  }

  if (!username || demo) {
    return publicResponse(createDemoCalendar(fromYear, toYear));
  }

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "올바른 GitHub 계정명을 입력하세요." },
      { status: 400 },
    );
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "공개 GitHub 조회가 설정되지 않았습니다. 배포 관리자가 GITHUB_TOKEN 환경 변수를 설정해야 합니다.",
        demoAvailable: true,
      },
      { status: 503 },
    );
  }

  try {
    const cacheKey = `${username.toLowerCase()}:${fromYear}:${toYear}`;
    const cached = calendarCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return publicResponse(cached.calendar);
    }

    const { from, to } = calendarYearRange(fromYear, toYear);
    const calendar = await fetchContributionCalendar(token, username, from, to);
    calendarCache.set(cacheKey, {
      calendar,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return publicResponse(calendar);
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
