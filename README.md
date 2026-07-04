# Parler Bien

AI pronunciation practice with Supabase Auth and OpenRouter.

## Teammate setup

No local Kubernetes or database setup is required. The app uses the shared
Supabase project for login.

```bash
git clone <this-repo>
cd Raise-Hack
cp .env.example .env
bun install
bun run dev
```

Fill `.env` with the shared OpenRouter key and Supabase project values:

```env
OPENROUTER_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_DB_PASSWORD=...
SUPABASE_CONNECTION=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
# Optional if using Supabase's pooler:
# SUPABASE_DB_POOLER_REGION=eu-west-1
```

If signups require email confirmation, either confirm through the email link or
disable email confirmations in the Supabase Auth settings for hackathon demos.

## Supabase setup

This app uses Supabase Auth for email/password login and Supabase Postgres for
the generated image cache.

The app-owned database schema lives in `supabase/migrations/`. Apply it to a
new Supabase project before enabling the image cache:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

For local development against the new project, copy `.env.example` to `.env`
and set:

- `NEXT_PUBLIC_SUPABASE_URL`: the project API URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable or anon client key.
- `SUPABASE_DB_PASSWORD`: the database password, used only by server routes for
  the image cache.
- `SUPABASE_CONNECTION`: optional full Postgres connection URL. Prefer the
  Supabase shared pooler URL on IPv4-only networks.
- `SUPABASE_DB_POOLER_REGION`: the pooler region, if using Supabase's pooler.
- `SUPABASE_DATABASE_URL`: optional full database URL instead of password and
  pooler-region assembly.

Auth configuration is partly captured for local Supabase in
`supabase/config.toml`: email/password signup is enabled, email confirmation is
disabled for hackathon demos, and `http://localhost:3000` is an allowed site
URL. For a hosted Supabase project, mirror those settings in the Supabase
dashboard under Authentication.

## Adding components

To add components to your app, run the following command:

```bash
bunx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
