# Qube JavaScript SDK report

## Purpose

`qube-js` is a browser-oriented TypeScript client for a Qube project. It wraps project REST requests, realtime Socket.IO subscriptions, storage operations, and account authentication. The public entry point is `src/index.ts`; `createClient(projectUrl, apiKey)` constructs one `QubeClient` and exposes `db`, `realTime`, `auth`, and `storage` clients. `client.from(table)` is a shortcut for `client.db.from(table)`.

The project URL must identify a project API endpoint, normally in the form `https://<api-host>/api/projects/<project-slug>`. The API key is a project key. The server validates that the key belongs to the project named in the URL. The package build emits ESM, CommonJS, and declaration files; package exports point to those generated files.

## Database (`client.from(table)`)

`QubeDb.from<T>(table)` creates a lazy `QueryBuilder<T>`. Chain methods configure a REST request, and awaiting the builder calls `execute()` through its `then()` method. `.execute()` can also be called directly.

Supported operations:

- `.select(columns)`, `.eq()`, `.noteq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.like()`, `.ilike()`, `.is()` filters.
- `.order(column, direction)`, `.limit(n)`, and `.offset(n)` for reads.
- `.insert(data)`, `.update(data)`, and `.delete()` for mutations.

Requests go to `<projectUrl>/rest/<table>`, with a Bearer project key and JSON content type. Reads and inserts use query parameters and a JSON body as appropriate; updates and deletes target `<table>/<id>`. Update and delete require `.eq("id", id)` and use that ID in the URL. The server currently returns row arrays for reads and mutation responses according to the endpoint; HTTP 204 is represented as `{ data: null, error: null }`. Other HTTP and network failures are returned in `{ data: null, error }`.

Known limits: the builder serializes filter values as strings; setting two filters on the same column overwrites the earlier one because query parameters use `set()`. Mutation IDs and table names are inserted into the URL without URL encoding. `.select()` changes the selection parameter for reads, but it does not configure mutation return behavior. Server-side parsing and supported operators are authoritative.

## Realtime (`client.realTime`)

`subscribe(table, callback)` lazily opens a Socket.IO connection to `<projectUrl origin>/realtime`, authenticates with the project key in the Socket.IO handshake, and emits the server's subscribe event for the table. Events for a table are passed to all registered callbacks. The returned function removes that callback; `unsubscribe(table)` removes all callbacks for a table. `disconnect()` closes the socket and clears subscriptions.

The API verifies the project key at connection time and associates the socket with its project ID. It then subscribes to the requested table. Realtime events have the shared `RealtimeEvent` type (`INSERT`, `UPDATE`, or `DELETE`). The SDK logs server realtime errors to the browser console. The API must have realtime enabled/configured for a table for useful events to arrive.

## Storage (`client.storage.from(bucketName)`)

`from(bucketName)` creates a bucket reference. Its operations are:

- `list()` retrieves bucket objects.
- `upload(file)` uploads a browser `File` through UploadThing, then posts the returned file metadata to Qube.
- `remove(objectId)` deletes an object.
- `getSignedUrl(objectId)` requests a signed URL.

Requests use `<projectUrl>/storage/...` paths and send `Authorization: Bearer <apiKey>`. Results use `{ data, error }`. The API resolves the bucket name within the project and protects metadata writes/deletes with service-role authorization. Listing and signed URL access use the project key guard. Upload requires browser `File` support and a working UploadThing configuration on the server.

## Authentication (`client.auth`)

Auth derives the API root by removing `/projects/<slug>` from the project URL, then calls `/auth/...` at that root. `signIn()` posts email and password to `/auth/login`; `signUp()` posts to `/auth/register`; each then requests `/auth/me`. `signOut()` posts to `/auth/logout`. These calls include browser credentials because the API sets HttpOnly access and refresh cookies. On successful sign-in/up, `getUser()` returns the user cached in this SDK instance as `{ id, email }`.

Google and GitHub methods navigate the current page to the API OAuth routes. `getAccessToken()` returns `null`: tokens are kept in HttpOnly cookies and are not exposed to JavaScript. `sendMagickLink()` returns an unsupported error because there is no magic-link route in the API.

Known issue: the API's registration DTO requires `name`, but this SDK's `signUp()` accepts and sends only `email` and `password`. Signup therefore fails server validation unless the SDK/API contract is updated. Cross-origin cookie behavior also depends on API CORS and cookie settings; the API currently uses credentialed CORS and `SameSite=Lax` cookies.

## Build and runtime requirements

Run `pnpm build` in this package to generate `dist/index.js` (ESM), `dist/index.cjs` (CommonJS), and type declarations. Browser methods use global `fetch`, `window`, and `File`; realtime and storage also rely on Socket.IO and UploadThing client packages. Use the SDK from a page served over HTTP(S), not by opening a local HTML file with `file://`. The project API must allow the browser origin through CORS. Do not expose a service-role key in a publicly deployed browser application; it grants write access.

## Scope and verification

This report describes the checked-in SDK source and the corresponding API controllers. `pnpm build` completed successfully during analysis. No live API integration was run, so database permissions, project configuration, CORS, realtime table setup, and storage provider credentials were not exercised.
