import pg from "pg"

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: pg.Pool
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured")
  }

  return databaseUrl
}

export function getPool() {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new pg.Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
    })
  }

  return globalForPg.pgPool
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  return getPool().query<T>(text, values)
}
