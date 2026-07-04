# Parler Bien

AI pronunciation practice with a local Rancher Desktop PostgreSQL database.

## Teammate setup

The one-shot setup expects Rancher Desktop plus the SUSE/Rancher hackathon repo.
It will run the hackathon `init.sh` when Rancher Desktop or the Application
Collection pull secret is not ready, install PostgreSQL, write `.env`, run
migrations, port-forward Postgres, and start Next.js.

```bash
git clone <this-repo>
cd Raise-Hack
npm install

# Optional if the hackathon repo is not in ~/Data/GitPlay/rancher-hack/rancher-hackathon-paris
export RANCHER_HACK_DIR=/path/to/rancher-hackathon-paris

npm run dev:up
```

If `init.sh` asks for an attendee email, use the email assigned by the hackathon
organizers. Each laptop gets its own local Rancher Desktop database; for a shared
team dev server, run this on one shared machine or cluster and share the app URL.

## Manual database commands

```bash
/path/to/rancher-hackathon-paris/init.sh
kubectl --context rancher-desktop -n hackathon get secret application-collection

kubectl --context rancher-desktop -n hackathon create secret generic parler-bien-db-auth \
  --from-literal=password="$(openssl rand -base64 24)" \
  --from-literal=postgresPassword="$(openssl rand -base64 24)" \
  --from-literal=replicationPassword="$(openssl rand -base64 24)"

helm upgrade --install parler-bien-db oci://dp.apps.rancher.io/charts/postgresql \
  --kube-context rancher-desktop \
  --namespace hackathon \
  --set auth.database=parler_bien \
  --set auth.username=parler_bien \
  --set auth.existingSecret=parler-bien-db-auth \
  --set 'global.imagePullSecrets[0].name=application-collection' \
  --wait --timeout 5m

kubectl --context rancher-desktop -n hackathon port-forward svc/parler-bien-db-postgresql 5432:5432
npm run db:migrate
npm run dev
```

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
