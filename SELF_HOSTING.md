# Self-host Qube

Qube uses the configured PostgreSQL database for its own users, organizations, projects, and the projects' schemas. In this deployment there is no separate Qube metadata database container. Neon is optional: use a Neon connection URI or another PostgreSQL URL. Realtime LISTEN/NOTIFY may require an unpooled `REALTIME_DATABASE_URL`.

## Local source installation

Requirements: Docker Engine, Docker Compose v2, `curl`, `jq`, and OpenSSL. For Neon project discovery, the installer calls the official Neon API; it does not create Neon projects or persistent resources.

From the repository root:

```sh
./scripts/qube install
```

The installer prompts for a PostgreSQL URL, or offers Neon API key validation and existing project selection. The Neon key is entered without terminal echo and only held in a mode 0600 temporary file while requests are made. The installer asks for the database and role names required to retrieve a connection URI. It never creates a Neon project. The API runs migrations before startup, and the installer creates the initial account through Qube registration after health checks pass.

The configuration is stored in `.qube/.env` with mode 0600. Do not commit it. The dashboard and API ports are bound to localhost by default (`3001` and `3000`). Qube's database is external and durable; this Compose stack does not create or own a database volume.

## Lifecycle

```sh
./scripts/qube start
./scripts/qube stop
./scripts/qube restart
./scripts/qube status
./scripts/qube logs [api|web]
./scripts/qube update
./scripts/qube backup [backup.dump]
./scripts/qube restore backup.dump
./scripts/qube uninstall
```

Backup and restore require PostgreSQL client utilities (`pg_dump`, `pg_restore`). Backups contain Qube's metadata and the project schemas in the configured database. Restore prompts before replacing database objects. Uninstall stops and removes containers while leaving the external database untouched. Re-running `install` never overwrites `.qube/.env`.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL for Qube metadata and project schemas. Keep the database role least-privileged. |
| `REALTIME_DATABASE_URL` | No | Direct, unpooled PostgreSQL URL for LISTEN/NOTIFY if the main URL is pooled. |
| `WEB_PORT` | No | Local dashboard port; default `3001`. |
| `API_PORT` | No | Local API port; default `3000`. |
| `PUBLIC_API_URL` | No | Browser-visible API URL, baked into the web build; default `http://localhost:3000/api`. |
| `JWT_ACCESS_SECRET` | Yes | Secret used to sign access tokens. |
| `JWT_REFRESH_SECRET` | Yes | Secret used to sign refresh tokens. |
| `PROJECT_JWT_SECRET` | Yes | Secret used for project API keys. |
| `INVITE_SECRET` | Yes | Secret used for organization invites. |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token lifetime; default `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token lifetime; default `7d`. |

The installer generates 256-bit random secrets for the four required application secrets. Optional OAuth and email delivery settings are not configured by the installer; see the root README environment section.

## Remote deployment

The checked-in Compose file binds both ports to loopback. To serve Qube remotely, put a TLS reverse proxy in front of the dashboard and API, configure `WEB_URL` and build-time `PUBLIC_API_URL` to the public HTTPS origins, and explicitly change the port bindings in a reviewed Compose override. Restrict firewall access to the reverse proxy. Do not expose the database URL or Docker socket to the web container. Use HTTPS so authentication cookies remain protected.

The Dockerfiles build from the local source tree. This repository does not currently publish signed, versioned Qube images or a remote one-line installer URL; production image provenance and release automation remain follow-up work.

## Troubleshooting

- **Docker daemon unavailable:** start Docker Engine/Desktop and verify `docker info` works for the installing user.
- **Compose plugin missing:** install Docker Compose v2 and verify `docker compose version`.
- **Migration or API health check fails:** run `./scripts/qube logs api`; verify DNS, TLS, database permissions, and `DATABASE_URL`.
- **Realtime connects but does not receive changes:** set `REALTIME_DATABASE_URL` to an unpooled connection and ensure the project table has realtime triggers enabled.
- **Browser cannot reach API:** the web bundle needs the browser-visible `PUBLIC_API_URL`; after changing it, run `./scripts/qube update` to rebuild the web image.
- **Neon selection fails:** verify the key and project access, then check the database and role names. Management API access does not itself grant SQL privileges to the selected role.

## Observatory telemetry and security

Telemetry is stored in Qube's PostgreSQL database with a 90-day retention cleanup. Project REST request data, Qube SQL editor duration/status and normalized SHA-256 query fingerprints, and Realtime connection/subscription/delivery counts are collected. Raw parameters and query results are not put in telemetry. Existing SQL editor `query_history` continues to store SQL text for its existing history feature; use database access controls accordingly. Metrics are unavailable until telemetry events have been collected. Database size and table counts come from catalog visibility, and are not Neon compute or infrastructure usage metrics.
