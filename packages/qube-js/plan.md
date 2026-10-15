# Plan: Test `qube-js` from a separate app

## Goal

Verify that a consumer app can install and import the SDK, build with its
published package entry points and types, and use its browser APIs against a
Qube project. Keep the test app separate from this pnpm workspace so workspace
aliases cannot hide packaging problems.

## What the SDK currently provides

- `createClient(projectUrl, apiKey)` creates a client with `db`, `realTime`,
  `auth`, and `storage`; `client.from(table)` is a database shortcut.
- The package exports ESM, CommonJS, and TypeScript declarations from `dist/`.
  Build the SDK before packing or consuming it.
- Database supports reads, filters, sorting, pagination, and insert/update/delete.
- Realtime uses Socket.IO at the API origin's `/realtime` endpoint.
- Storage supports listing, browser `File` upload, deletion, and signed URLs.
- Auth uses API routes and browser cookies. Google/GitHub auth redirects the
  current page.

## Prerequisites and constraints

1. Have a running Qube API and a test project with its project URL and an
   anonymous project key. The URL should end in
   `/api/projects/<project-slug>`.
2. Use only disposable test data. Database writes, storage upload, and storage
   deletion require a service-role key according to the SDK docs. Never put
   that key in a deployed or publicly accessible browser app. For a local
   write test, use a temporary project and keep the key in a local-only test
   setup; otherwise skip mutation cases.
3. Configure API CORS for the test app's origin. Auth also depends on
   credentialed CORS and cookie settings; cross-origin cookies may not work
   with every app/API origin arrangement.
4. Enable realtime on the test table. Configure UploadThing on the API before
   testing file uploads.
5. `signUp()` currently sends only email and password, while the API
   registration DTO requires `name`. Treat signup as a known failing case
   until that contract is aligned. Magic-link auth is unsupported.

## Step-by-step plan

### 1. Build and inspect the SDK artifact

From `packages/qube-js`:

```bash
pnpm build
```

Confirm that `dist/index.js`, `dist/index.cjs`, and `dist/index.d.ts` exist.
Review that `package.json` points `main`, `module`, `types`, and `exports` to
those files. Do not test against source imports; the goal is to verify the
actual consumer package.

### 2. Create a standalone consumer app

Create a small Vite + TypeScript app in a sibling directory or a temporary
directory outside the pnpm workspace. Use a simple page with a table/status
area and controls for each operation. Avoid importing Qube workspace packages
directly.

### 3. Install the packed SDK

From the SDK package directory, create a package archive:

```bash
pnpm pack
```

Install the resulting `.tgz` into the standalone app using its local path, then
install the app's remaining dependencies and run its production build. This
checks the packed files, dependency declarations, conditional exports, and
declaration types. If the build reports missing runtime dependencies or
declarations, fix the SDK package metadata/build before moving on.

### 4. Configure the client without exposing privileged credentials

In the app, add a small SDK wrapper that calls:

```ts
import { createClient } from "qube-js";

const qube = createClient(
  import.meta.env.VITE_QUBE_PROJECT_URL,
  import.meta.env.VITE_QUBE_PROJECT_KEY,
);
```

Put the API URL and anonymous key in the app's local environment file. Ignore
that file in version control. Keep the service-role key out of browser variables;
use it only in an isolated local write test if required.

### 5. Verify database reads

Create or choose a non-sensitive test table and seed a few rows through the Qube
dashboard/API. Query it using `qube.from<Row>("table").select(...).eq(...)
.order(...).limit(...).execute()`. Display both `data` and `error` in the page.
Then exercise one additional filter and offset. Record expected versus actual
results, including empty results and an invalid table/key response.

### 6. Verify mutations only in disposable data

If the local environment permits safe use of a service-role key, test insert,
update, and delete against a dedicated disposable table and row. Confirm that
update/delete include `.eq("id", rowId)` and inspect the returned result.
Remove the key immediately after the local test. If using only the anonymous
key, confirm that the API rejects writes and record that as the expected
permission result rather than weakening the key.

### 7. Verify realtime

Subscribe to the enabled test table, show connection status and incoming event
payloads, and create a row from a separate Qube client/dashboard session. Check
that the callback receives the event. Unsubscribe or disconnect when leaving
the page, then confirm no further events appear.

### 8. Verify storage

List objects from a test bucket and request a signed URL for an existing test
object. With UploadThing configured and safe local write credentials, upload a
small non-sensitive file and then delete that test object. Confirm failures
are surfaced through `{ data, error }`; do not use real user files.

### 9. Verify auth

Test sign-in and sign-out with a dedicated test account. Check the browser
network panel for requests to the API auth routes, cookie behavior, and the
`getUser()` result. Test signup separately and document the current expected
failure caused by the missing `name` field. Test OAuth only if provider
credentials and redirect URLs are configured; it navigates away from the test
page.

### 10. Record results and fix packaging/API issues

For each feature, record the app build result, request URL/status, returned
data/error, and any required API configuration. Classify issues as package
resolution/build, CORS/cookie, key/permission, API configuration, or SDK/API
contract. Fix and repack the SDK for package-level issues, then reinstall the
new archive and repeat affected checks.

## Completion criteria

- A standalone app outside the workspace installs the `.tgz`, type-checks, and
  produces a production build.
- Read queries work against the test project and show useful errors on failure.
- Realtime connects and delivers a test event; storage/auth paths are verified
  where their server-side prerequisites are configured.
- Write tests use disposable resources and no privileged credential is shipped
  to a public browser bundle.
- Known gaps, especially signup requiring `name`, are recorded with a clear
  pass/fail status rather than mistaken for package-install failures.
