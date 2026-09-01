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
      commitContributionsByRepository(maxRepositories: 100) {
        repository {
          primaryLanguage {
            name
            color
          }
        }
        contributions(
          first: 100
          orderBy: { field: OCCURRED_AT, direction: ASC }
        ) {
          nodes {
            occurredAt
            commitCount
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
        commitContributionsByRepository: {
          repository: {
            primaryLanguage: {
              name: string;
              color: string | null;
            } | null;
          };
          contributions: {
            nodes: {
              occurredAt: string;
              commitCount: number;
            }[];
          };
        }[];
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
  let start = new Date(from);
  while (start <= to) {
    const nextStart = addDays(start, CHUNK_DAYS);
    const chunkEnd = new Date(nextStart.getTime() - 1);
    yield [start, chunkEnd < to ? chunkEnd : to];
    start = nextStart;
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
  const languagesByDate = new Map<
    string,
    Map<string, { count: number; color: string | null }>
  >();
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
    for (const repository of user.contributionsCollection
      .commitContributionsByRepository) {
      const language = repository.repository.primaryLanguage;
      if (!language) {
        continue;
      }
      for (const contribution of repository.contributions.nodes) {
        const date = contribution.occurredAt.slice(0, 10);
        const languages =
          languagesByDate.get(date) ??
          new Map<string, { count: number; color: string | null }>();
        const current = languages.get(language.name);
        languages.set(language.name, {
          count: (current?.count ?? 0) + contribution.commitCount,
          color: language.color,
        });
        languagesByDate.set(date, languages);
      }
    }
    for (const week of user.contributionsCollection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        const currentDate = new Date(`${day.date}T00:00:00Z`);
        if (currentDate < from || currentDate > to) {
          continue;
        }
        byDate.set(day.date, {
          date: day.date,
          count: day.contributionCount,
          level: day.contributionLevel,
          color: day.color,
          weekday: day.weekday,
          weekIndex: 0,
          year: currentDate.getUTCFullYear(),
          language: null,
          languageColor: null,
        });
      }
    }
  }

  if (!profile) {
    throw new GitHubApiError("기여 달력이 비어 있습니다.", 502);
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (days.length === 0) {
    throw new GitHubApiError("기여 날짜가 없습니다.", 502);
  }

  for (const day of days) {
    const current = new Date(`${day.date}T00:00:00Z`);
    const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
    const dayOfYear =
      Math.floor((current.getTime() - yearStart.getTime()) / 86_400_000) + 1;
    day.weekIndex = Math.min(52, Math.floor((dayOfYear - 1) / 7));
    day.weekday = current.getUTCDay();
    const languages = languagesByDate.get(day.date);
    const dominant = languages
      ? [...languages.entries()].sort(
          ([nameA, valueA], [nameB, valueB]) =>
            valueB.count - valueA.count || nameA.localeCompare(nameB),
        )[0]
      : undefined;
    day.language = dominant?.[0] ?? null;
    day.languageColor = dominant?.[1].color ?? null;
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

export function calendarYearRange(
  fromYear: number,
  toYear: number,
  now = new Date(),
): { from: Date; to: Date } {
  const yearEnd = new Date(Date.UTC(toYear, 11, 31, 23, 59, 59, 999));
  return {
    from: new Date(Date.UTC(fromYear, 0, 1)),
    to: yearEnd > now ? now : yearEnd,
  };
}
