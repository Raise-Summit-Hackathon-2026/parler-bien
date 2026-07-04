#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

KUBECTL_CONTEXT="${KUBECTL_CONTEXT:-rancher-desktop}"
NAMESPACE="${NAMESPACE:-hackathon}"
RELEASE="${RELEASE:-parler-bien-db}"
DB_NAME="${DB_NAME:-parler_bien}"
DB_USER="${DB_USER:-parler_bien}"
DB_SECRET="${DB_SECRET:-parler-bien-db-auth}"
APP_ENV_SECRET="${APP_ENV_SECRET:-parler-bien-app-env}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"

find_rancher_init() {
  if [[ -n "${RANCHER_HACK_DIR:-}" && -x "$RANCHER_HACK_DIR/init.sh" ]]; then
    printf '%s\n' "$RANCHER_HACK_DIR/init.sh"
    return
  fi

  local candidates=(
    "$ROOT/../rancher-hack/rancher-hackathon-paris/init.sh"
    "$HOME/Data/GitPlay/rancher-hack/rancher-hackathon-paris/init.sh"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24
  else
    node -e "console.log(crypto.randomBytes(24).toString('base64'))"
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  node - "$key" "$value" <<'NODE'
const fs = require("fs")
const [key, value] = process.argv.slice(2)
const path = ".env"
const line = `${key}=${value}`
let text = ""
try {
  text = fs.readFileSync(path, "utf8")
} catch (error) {
  if (error.code !== "ENOENT") throw error
}
const lines = text.split(/\r?\n/)
const index = lines.findIndex((item) => item.startsWith(`${key}=`))
if (index >= 0) {
  lines[index] = line
} else {
  if (lines.length && lines[lines.length - 1] !== "") lines.push("")
  lines.push(line)
}
fs.writeFileSync(path, lines.join("\n").replace(/\n*$/, "\n"))
NODE
}

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required. Install Rancher Desktop first."
  exit 1
fi

if ! command -v helm >/dev/null 2>&1; then
  echo "helm is required. Install Rancher Desktop first."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

RANCHER_INIT="$(find_rancher_init || true)"
if ! kubectl --context "$KUBECTL_CONTEXT" get namespace "$NAMESPACE" >/dev/null 2>&1; then
  if [[ -n "$RANCHER_INIT" ]]; then
    echo "Rancher Desktop namespace is not ready; running $RANCHER_INIT"
    "$RANCHER_INIT"
  else
    echo "Cannot find Rancher hackathon init.sh. Set RANCHER_HACK_DIR=/path/to/rancher-hackathon-paris."
    exit 1
  fi
fi

kubectl --context "$KUBECTL_CONTEXT" create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl --context "$KUBECTL_CONTEXT" apply -f -

if ! kubectl --context "$KUBECTL_CONTEXT" -n "$NAMESPACE" get secret application-collection >/dev/null 2>&1; then
  if [[ -n "$RANCHER_INIT" ]]; then
    echo "Application Collection pull secret is missing; running $RANCHER_INIT"
    "$RANCHER_INIT"
  else
    echo "Missing application-collection pull secret and no init.sh was found."
    exit 1
  fi
fi

if ! kubectl --context "$KUBECTL_CONTEXT" -n "$NAMESPACE" get secret "$DB_SECRET" >/dev/null 2>&1; then
  APP_DB_PASSWORD="$(random_secret)"
  POSTGRES_PASSWORD="$(random_secret)"
  REPLICATION_PASSWORD="$(random_secret)"
  kubectl --context "$KUBECTL_CONTEXT" -n "$NAMESPACE" create secret generic "$DB_SECRET" \
    --from-literal=password="$APP_DB_PASSWORD" \
    --from-literal=postgresPassword="$POSTGRES_PASSWORD" \
    --from-literal=replicationPassword="$REPLICATION_PASSWORD"
fi

helm upgrade --install "$RELEASE" oci://dp.apps.rancher.io/charts/postgresql \
  --kube-context "$KUBECTL_CONTEXT" \
  --namespace "$NAMESPACE" \
  --set "auth.database=$DB_NAME" \
  --set "auth.username=$DB_USER" \
  --set "auth.existingSecret=$DB_SECRET" \
  --set 'global.imagePullSecrets[0].name=application-collection' \
  --set persistence.resources.requests.storage=8Gi \
  --wait --timeout 5m

APP_DB_PASSWORD="$(kubectl --context "$KUBECTL_CONTEXT" -n "$NAMESPACE" get secret "$DB_SECRET" -o jsonpath='{.data.password}' | base64 --decode)"
LOCAL_DATABASE_URL="postgresql://$DB_USER:$APP_DB_PASSWORD@localhost:$LOCAL_DB_PORT/$DB_NAME"
CLUSTER_DATABASE_URL="postgresql://$DB_USER:$APP_DB_PASSWORD@$RELEASE-postgresql.$NAMESPACE.svc.cluster.local:5432/$DB_NAME"

kubectl --context "$KUBECTL_CONTEXT" -n "$NAMESPACE" create secret generic "$APP_ENV_SECRET" \
  --from-literal=DATABASE_URL="$CLUSTER_DATABASE_URL" \
  --dry-run=client -o yaml | kubectl --context "$KUBECTL_CONTEXT" apply -f -

set_env_value DATABASE_URL "$LOCAL_DATABASE_URL"
set_env_value NEXT_PUBLIC_APP_URL "${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
set_env_value CONTENT_SAFETY_ENABLED "${CONTENT_SAFETY_ENABLED:-true}"

if ! grep -q '^OPENROUTER_API_KEY=' .env 2>/dev/null; then
  echo "OPENROUTER_API_KEY=replace-me" >> .env
  echo "Add your OpenRouter key to .env before using AI features."
fi

if ! lsof -nP -iTCP:"$LOCAL_DB_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  kubectl --context "$KUBECTL_CONTEXT" -n "$NAMESPACE" port-forward "svc/$RELEASE-postgresql" "$LOCAL_DB_PORT:5432" >/tmp/parler-bien-db-port-forward.log 2>&1 &
  PORT_FORWARD_PID=$!
  trap 'kill "$PORT_FORWARD_PID" >/dev/null 2>&1 || true' EXIT
  sleep 2
fi

npm run db:migrate
npm run dev
