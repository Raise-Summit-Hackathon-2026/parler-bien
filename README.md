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

Fill `.env` with the shared OpenRouter key and Supabase publishable key:

```env
OPENROUTER_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CONTENT_SAFETY_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=https://tvpeojtagsagycyjqmys.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

If signups require email confirmation, either confirm through the email link or
disable email confirmations in the Supabase Auth settings for hackathon demos.

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
