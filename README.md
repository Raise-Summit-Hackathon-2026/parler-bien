# Parler Bien

AI pronunciation practice with Supabase Auth and OpenRouter.

## Teammate setup

No local Kubernetes or database setup is required. The app uses the shared
Supabase project for login.

```bash
git clone <this-repo>
cd Raise-Hack
cp .env.example .env
npm install
npm run dev
```

Fill `.env` with the shared OpenRouter key and Supabase publishable key:

```env
OPENROUTER_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CONTENT_SAFETY_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://tvpeojtagsagycyjqmys.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_POOLER_REGION=eu-west-1
```

If signups require email confirmation, either confirm through the email link or
disable email confirmations in the Supabase Auth settings for hackathon demos.

Generated scenario images are cached in Supabase Postgres. The API creates the
`scenario_image_cache` table lazily when `SUPABASE_DB_PASSWORD` or
`SUPABASE_DATABASE_URL` is configured. The SQL is also checked in at
`migrations/001_image_cache.sql` for manual setup.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
