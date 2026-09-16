import { NextRequest, NextResponse } from "next/server";
import type { CommitDetail } from "@/lib/types";

const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_TTL_MS = 60 * 60 * 1000;
const commitCache = new Map<
  string,
  { commits: CommitDetail[]; expiresAt: number }
>();

type GitHubCommitSearchResponse = {
  message?: string;
  items?: {
    sha: string;
    html_url: string;
    repository: {
      full_name: string;
      private: boolean;
    };
    commit: {
      message: string;
      author: { date: string } | null;
      committer: { date: string } | null;
    };
  }[];
};

function response(commits: CommitDetail[]) {
  return NextResponse.json(
    { commits },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!USERNAME_PATTERN.test(username) || !DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { error: "올바른 GitHub 계정명과 날짜가 필요합니다." },
      { status: 400 },
    );
  }

  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return NextResponse.json(
      { error: "올바른 날짜가 필요합니다." },
      { status: 400 },
    );
  }

  const cacheKey = `${username.toLowerCase()}:${date}`;
  const cached = commitCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return response(cached.commits);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GitHub 커밋 조회가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const query = `author:${username} author-date:${date}`;
  const searchUrl = new URL("https://api.github.com/search/commits");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("sort", "author-date");
  searchUrl.searchParams.set("order", "desc");
  searchUrl.searchParams.set("per_page", "20");

  const githubResponse = await fetch(searchUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "git-voyage",
    },
  });
  const payload = (await githubResponse.json()) as GitHubCommitSearchResponse;

  if (!githubResponse.ok) {
    return NextResponse.json(
      { error: payload.message ?? "GitHub 커밋을 조회하지 못했습니다." },
      { status: githubResponse.status },
    );
  }

  // A broadly scoped deployment token can see private repositories. Never
  // expose those results through this public endpoint.
  const commits = (payload.items ?? [])
    .filter((item) => !item.repository.private)
    .map<CommitDetail>((item) => ({
      sha: item.sha,
      message: item.commit.message.split(/\r?\n/, 1)[0],
      repository: item.repository.full_name,
      url: item.html_url,
      committedAt: item.commit.author?.date ?? item.commit.committer?.date ?? null,
    }));

  commitCache.set(cacheKey, {
    commits,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return response(commits);
}
