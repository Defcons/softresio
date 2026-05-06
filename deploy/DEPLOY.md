# softresio prod deploy

This folder contains the compose stack that runs on **LXC 107 (`host`)** at
`10.0.2.107` and serves [softres.epoglogs.com](https://softres.epoglogs.com).
It is intentionally separate from the repo-root `compose.yaml`, which is the
**dev** stack (frontend hot-reload, backend bind-mounts, no GHCR image).

GitHub Actions in this repo build `ghcr.io/defcons/softresio:latest` on every
push to `main`. Pulling that image and recreating the container is the entire
deploy.

## Layout
- `/apps/softresio/` on CT107 — working dir (compose.yaml + .env + data/)
- `compose.yaml` — this file. Single combined `softresio` service from the
  prebuilt image, plus a Postgres sidecar.
- `.env` — secrets and per-instance config. Not in git. See **Env vars** below.
- `/apps/softresio/data/` — Postgres data, persisted across restarts.
- Container exposes `3015:8000` on the LXC; reverse proxy (LXC 102) terminates
  TLS for `softres.epoglogs.com`.

## First bring-up (only needed once per LXC)

```bash
mkdir -p /apps/softresio/data
cd /apps/softresio
# copy this compose.yaml to the LXC (see Update flow below)
# then create .env:
cat > .env <<'EOF'
DATABASE_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
DISCORD_LOGIN_ENABLED=true
DISCORD_CLIENT_ID=...    # from discord.com/developers/applications
DISCORD_CLIENT_SECRET=...
ADMIN_DISCORD_IDS=...    # comma-separated, your Discord user IDs
EOF
docker compose pull
docker compose up -d
docker compose logs -f softresio
```

## Env vars

| Var | Required | Notes |
|---|---|---|
| `DATABASE_PASSWORD` | yes | Random hex; shared with the postgres sidecar. |
| `JWT_SECRET` | yes | Random hex. Signs auth cookies. |
| `DISCORD_LOGIN_ENABLED` | yes | `true` for prod; `false` disables Discord login. |
| `DISCORD_CLIENT_ID` | if Discord enabled | From the Discord dev portal. |
| `DISCORD_CLIENT_SECRET` | if Discord enabled | From the Discord dev portal. |
| `ADMIN_DISCORD_IDS` | optional | Comma-separated Discord user IDs for the `/admin` stats panel. Empty = no admins. |

## Discord application

Reuse the existing Discord app shared with epoglogs.com. OAuth2 → Redirects,
add **both**:
- `https://softres.epoglogs.com/api/discord`
- `https://epoglogs.com/auth/discord/callback`

## Update flow (after merging a PR to softresio main)

GitHub Actions has already built and pushed the new image by the time you read
the merge notification. To roll it out:

```bash
# Sync this repo locally first so you have the latest deploy/compose.yaml
cd /c/Dev/wow/softresio && git pull

# Push compose.yaml to the LXC (only needed when this file actually changed)
ssh -p 2222 root@10.0.2.107 "cat > /apps/softresio/compose.yaml" < deploy/compose.yaml

# Pull + recreate
ssh -p 2222 root@10.0.2.107 "cd /apps/softresio && docker compose pull && docker compose up -d && docker compose ps"
```

If only the image changed (no compose.yaml edits), skip step 2.

## DNS + reverse proxy

- DNS: `softres.epoglogs.com` → same Cloudflare-fronted public IP as
  `epoglogs.com`.
- Proxy (LXC 102 / Nginx Proxy Manager): forwards `softres.epoglogs.com` →
  `http://10.0.2.107:3015`. Whatever pattern epoglogs.com already uses on the
  proxy LXC, mirror it.

## Backup

Add `/apps/softresio/data` to the existing Restic / Sanoid policy on CT107.
No SQLite here; Postgres data lives in that bind mount.
