# Run Qube in one Docker container

Qube runs its web app and API in **one container**. PostgreSQL remains an external service; the self-host installer requires a Neon database URI. Qube does not launch a separate database container. Its user, organization, project, telemetry, and query-history metadata use the Neon database configured by `DATABASE_URL`.

## Install from a source checkout

Requirements on the host: Docker Engine, Docker Compose v2, `curl`, `jq`, and OpenSSL. For database backup/restore, the runtime image includes PostgreSQL client tools.

```sh
./scripts/qube install
```

The installer checks Docker and architecture, then asks for a Neon connection URI. For the manual URI prompt, terminal input is visible while typing or pasting. The hostname must end in `.neon.tech` and the query must include `sslmode=require` or `sslmode=verify-full`; percent-encode special characters in credentials. Do not share terminal recordings or transcripts that contain the URI. It is stored in `.qube/.env`, mode `0600`, under a mode `0700` directory.

You can instead choose Neon discovery. The installer hides the Neon management API key, validates it with Neon, lists projects, and requests a connection URI for the selected project, database, role, and branch. It does not create Neon resources. Neon management credentials and SQL credentials are separate permissions.

After selecting the DB, configure the dashboard/API host ports and public URLs, then enter the first Qube account. The installer generates four distinct signing secrets, writes the protected config, builds the single image, applies migrations, waits for API and web health checks, and registers the account. Re-running install leaves an existing config untouched.

## Container and ports

Compose starts one service named `qube`, with one container and two localhost-bound ports:

- Dashboard: `http://localhost:3001`
- API: `http://localhost:3000/api`

The API binds to container port `3000`; Next.js binds to `3001`. Both processes run under a small supervisor with graceful shutdown. Docker health checks require both HTTP services to respond. Database migrations run before either process starts. The container runs as a non-root user and has no Docker socket mount.

The browser uses `PUBLIC_API_URL`, compiled into the web bundle. `API_URL` is set internally to `http://127.0.0.1:3000/api` for server-side web requests. `WEB_URL` is the browser-facing dashboard origin used for CORS and OAuth redirects. For a remote deployment, put TLS reverse proxy routes in front of the mapped ports, set `WEB_URL` and `PUBLIC_API_URL` to the public HTTPS origins, and keep the container ports bound to localhost. Rebuild with `./scripts/qube update` after changing `PUBLIC_API_URL`.

## Credentials and configuration

| Variable or credential | Required | Used by |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Qube API and migrations; Neon PostgreSQL connection URI with TLS enabled. |
| `JWT_ACCESS_SECRET` | Yes | API JWT signing and web session verification. |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing. |
| `PROJECT_JWT_SECRET` | Yes | Project API token signing. |
| `INVITE_SECRET` | Yes | Organization invite tokens. |
| `WEB_URL` | Yes | Dashboard origin for CORS and auth redirects. |
| `PUBLIC_API_URL` | Yes | Browser API endpoint and public links. Set it to the API’s externally reachable URL. |
| `API_URL` | Internal | Server-side web-to-API requests; set by Compose to the API in the same container. |
| `REALTIME_DATABASE_URL` | Optional | Direct/unpooled Neon URI for LISTEN/NOTIFY when `DATABASE_URL` is pooled; same hostname and TLS validation applies. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Optional | Google OAuth. Register the callback URL with Google. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | Optional | GitHub OAuth. Register the callback URL with GitHub. |
| `RESEND_API_KEY` | Optional | Email delivery for organization invitations. Without it, email invitations are unavailable. |
| `UPLOADTHING_TOKEN` | Optional for launch; required for file upload, deletion, and signed storage URLs | UploadThing storage API credential used by `UTApi`. |
| `WEB_HOST_PORT`, `API_HOST_PORT` | Optional | Host ports, default `3001` and `3000`; both bind to `127.0.0.1`. |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Optional | Token lifetimes, default `15m` and `7d`. |

See [.env.example](.env.example) for the complete Compose environment template. The installer creates the four required application secrets. Keep the Neon API key out of `.qube/.env`; the installer only holds it in a temporary mode-`0600` curl config while making the discovery request.

The audit found `NEXT_PUBLIC_QUBE_*` names in SDK examples but no runtime reads of those values in the Qube dashboard or API. They are not installer requirements. `UPLOADTHING_TOKEN` is used by the API’s UploadThing client and is collected as an optional credential for file storage functionality.

## Lifecycle

```sh
./scripts/qube start
./scripts/qube stop
./scripts/qube restart
./scripts/qube status
./scripts/qube logs
./scripts/qube update
./scripts/qube backup [backup.dump]
./scripts/qube restore backup.dump
./scripts/qube uninstall
```

Backups and restores run `pg_dump`/`pg_restore` inside the Qube container so the database URI is not placed in the host process arguments. Restore prompts before modifying database objects. Uninstall removes the container and image-managed state but leaves the external PostgreSQL database unchanged.

## Troubleshooting

- **Docker unavailable:** start the daemon and verify `docker info`; install Compose v2 if `docker compose version` fails.
- **Migration or health check failure:** run `./scripts/qube logs`; check URI encoding, database DNS/TLS, and the role’s migration permissions.
- **URI rejected by installer:** use a Neon connection URI whose host ends in `.neon.tech` and include `sslmode=require` (or `sslmode=verify-full`).
- **Realtime listener cannot connect:** use a direct, unpooled `REALTIME_DATABASE_URL` and ensure the database permits connections from this host.
- **Browser cannot reach the API:** check `PUBLIC_API_URL`, its host port, and proxy/firewall rules; rebuild using `./scripts/qube update` after changing the public URL.
- **OAuth redirect mismatch:** the callback URL must exactly match the provider console and use the public API origin.
- **Neon URI discovery fails:** check the Neon key and project access. The selected SQL role still needs database privileges independently of the Neon management key.

Qube telemetry records only instrumented Qube activity. It does not expose Neon compute metrics. SQL telemetry stores sanitized query fingerprints; existing SQL editor history has its separate retention and access behavior.
