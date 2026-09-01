import type { ContributionDay, ContributionLevel, VoyageCalendar } from "./types";

const GRAPHQL_URL = "https://api.github.com/graphql";
const CHUNK_DAYS = 13 * 7;

const CALENDAR_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    avatarUrl
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
            color
            weekday
          }
        }
      }
    }
  }
}
`;

type GraphQLDay = {
  date: string;
  contributionCount: number;
  contributionLevel: ContributionLevel;
  color: string;
  weekday: number;
};

type GraphQLResponse = {
  data?: {
    user: {
      login: string;
      name: string | null;
      avatarUrl: string;
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: GraphQLDay[] }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

function toIso(date: Date): string {
  return date.toISOString();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function* dateChunks(from: Date, to: Date): Generator<[Date, Date]> {
  let start = from;
  while (start < to) {
    const end = addDays(start, CHUNK_DAYS);
    yield [start, end < to ? end : to];
    start = end;
  }
}

async function queryChunk(
  token: string,
  login: string,
  from: Date,
  to: Date,
): Promise<GraphQLResponse> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "git-voyage",
    },
    body: JSON.stringify({
      query: CALENDAR_QUERY,
      variables: {
        login,
        from: toIso(from),
        to: toIso(to),
      },
    }),
  });

  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub GraphQL HTTP ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as GraphQLResponse;
}

export async function fetchContributionCalendar(
  token: string,
  login: string,
  from: Date,
  to: Date,
): Promise<VoyageCalendar> {
  const byDate = new Map<string, ContributionDay>();
  let profile: Pick<VoyageCalendar, "login" | "name" | "avatarUrl"> | null =
    null;

  for (const [chunkFrom, chunkTo] of dateChunks(from, to)) {
    const payload = await queryChunk(token, login, chunkFrom, chunkTo);

    if (payload.errors?.length) {
      throw new GitHubApiError(payload.errors[0].message, 502);
    }

    const user = payload.data?.user;
    if (!user) {
      throw new GitHubApiError(`GitHub 사용자 "${login}"를 찾을 수 없습니다.`, 404);
    }

    profile = {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
    for (const week of user.contributionsCollection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        byDate.set(day.date, {
          date: day.date,
          count: day.contributionCount,
          level: day.contributionLevel,
          color: day.color,
          weekday: day.weekday,
          weekIndex: 0,
        });
      }
    }
  }

  if (!profile) {
    throw new GitHubApiError("기여 달력을 비었습니다.", 502);
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (days.length === 0) {
    throw new GitHubApiError("기여 날짜가 없습니다.", 502);
  }

  const first = new Date(`${days[0].date}T00:00:00Z`);
  const firstWeekday = first.getUTCDay();
  const origin = addDays(first, -firstWeekday);

  for (const day of days) {
    const current = new Date(`${day.date}T00:00:00Z`);
    const diff = Math.floor(
      (current.getTime() - origin.getTime()) / 86_400_000,
    );
    day.weekIndex = Math.floor(diff / 7);
    day.weekday = current.getUTCDay();
  }

  const totalContributions = days.reduce((sum, day) => sum + day.count, 0);

  return {
    ...profile,
    totalContributions,
    days,
    source: "github",
    from: days[0].date,
    to: days[days.length - 1].date,
  };
}

export function lastYearRange(now = new Date()): { from: Date; to: Date } {
  const to = now;
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  return { from, to };
}
