import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import pg from "pg"

const root = path.resolve(import.meta.dirname, "..")

async function loadEnv() {
  const envPath = path.join(root, ".env")

  try {
    const env = await fs.readFile(envPath, "utf8")
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
        continue

      const index = trimmed.indexOf("=")
      const key = trimmed.slice(0, index)
      const value = trimmed.slice(index + 1)
      process.env[key] ??= value
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}

await loadEnv()

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Run scripts/dev-up.sh or set it in .env."
  )
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const migrationsDir = path.join(root, "migrations")
  const entries = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort()

  for (const name of entries) {
    const applied = await client.query(
      "select 1 from schema_migrations where name = $1",
      [name]
    )
    if (applied.rowCount) {
      console.log(`skip ${name}`)
      continue
    }

    const sql = await fs.readFile(path.join(migrationsDir, name), "utf8")
    await client.query("begin")
    try {
      await client.query(sql)
      await client.query("insert into schema_migrations (name) values ($1)", [
        name,
      ])
      await client.query("commit")
      console.log(`apply ${name}`)
    } catch (error) {
      await client.query("rollback")
      throw error
    }
  }
} finally {
  await client.end()
}
