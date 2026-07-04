import pg from "pg"

const TABLE_NAME = "scenario_image_cache"

type GlobalWithImageCacheDb = typeof globalThis & {
  imageCachePool?: pg.Pool
  imageCacheSchemaReady?: Promise<void>
  imageCacheConfigWarningShown?: boolean
  imageCacheErrorWarningShown?: boolean
}

const globalForImageCache = globalThis as GlobalWithImageCacheDb

function getProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? null
  } catch {
    return null
  }
}

function getDatabaseUrl() {
  if (process.env.SUPABASE_DATABASE_URL) {
    return process.env.SUPABASE_DATABASE_URL
  }

  const password = process.env.SUPABASE_DB_PASSWORD
  const projectRef = getProjectRef()
  const poolerRegion = process.env.SUPABASE_DB_POOLER_REGION

  if (!password || !projectRef) {
    if (!globalForImageCache.imageCacheConfigWarningShown) {
      console.warn(
        "Image DB cache disabled: set SUPABASE_DATABASE_URL or SUPABASE_DB_PASSWORD."
      )
      globalForImageCache.imageCacheConfigWarningShown = true
    }
    return null
  }

  if (poolerRegion) {
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${poolerRegion}.pooler.supabase.com:6543/postgres`
  }

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`
}

function getPool() {
  const connectionString = getDatabaseUrl()
  if (!connectionString) return null

  if (!globalForImageCache.imageCachePool) {
    globalForImageCache.imageCachePool = new pg.Pool({
      connectionString,
      max: 3,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10_000,
    })
  }

  return globalForImageCache.imageCachePool
}

async function ensureSchema(pool: pg.Pool) {
  globalForImageCache.imageCacheSchemaReady ??= pool
    .query(
      `
    create table if not exists public.${TABLE_NAME} (
      cache_key text primary key,
      image_prompt text not null,
      image_url text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `
    )
    .then(() => undefined)

  await globalForImageCache.imageCacheSchemaReady
}

async function withCacheDb<T>(operation: (pool: pg.Pool) => Promise<T>) {
  const pool = getPool()
  if (!pool) return null

  try {
    await ensureSchema(pool)
    return await operation(pool)
  } catch (error) {
    if (!globalForImageCache.imageCacheErrorWarningShown) {
      console.warn(
        "Image DB cache unavailable; falling back to generation.",
        error
      )
      globalForImageCache.imageCacheErrorWarningShown = true
    }
    return null
  }
}

export async function getCachedImageUrl(cacheKey: string) {
  return withCacheDb(async (pool) => {
    const result = await pool.query<{ image_url: string }>(
      `select image_url from public.${TABLE_NAME} where cache_key = $1`,
      [cacheKey]
    )

    return result.rows[0]?.image_url ?? null
  })
}

export async function setCachedImageUrl(
  cacheKey: string,
  imagePrompt: string,
  imageUrl: string
) {
  await withCacheDb(async (pool) => {
    await pool.query(
      `
        insert into public.${TABLE_NAME} (cache_key, image_prompt, image_url)
        values ($1, $2, $3)
        on conflict (cache_key) do update
          set image_prompt = excluded.image_prompt,
              image_url = excluded.image_url,
              updated_at = now()
      `,
      [cacheKey, imagePrompt, imageUrl]
    )
  })
}
