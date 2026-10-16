# Qube JavaScript SDK

`qube-js` is a TypeScript-friendly client for using a Qube project from JavaScript or TypeScript. It wraps the project REST API, Socket.IO realtime service, storage routes, and selected cookie-based authentication endpoints.

## Install

In this monorepo, add the workspace package to an app and build it:

```bash
pnpm --filter web add qube-js@workspace:*
pnpm --filter qube-js build
```

The package publishes ESM, CommonJS, and TypeScript declarations from `dist/`. To create a local npm archive, build with `pnpm --filter qube-js build`, then run `npm pack --pack-destination /tmp` from `packages/qube-js/`.

## Create a client

Use the project API URL ending in `/api/projects/<project-slug>` and a project key from Qube:

```ts
import { createClient } from "qube-js";

const qube = createClient(
  "https://api.example.com/api/projects/my-project",
  process.env.NEXT_PUBLIC_QUBE_PROJECT_KEY!,
);
```

The client exposes four areas: `qube.from()` for table queries, `qube.realTime` for change subscriptions, `qube.storage` for bucket operations, and `qube.auth` for cookie-based user authentication. Browser applications need the API to allow their origin through CORS.

## Database queries

Queries use a chainable builder. Reads return arrays; inserts, updates, and deletes return the affected row. Results use `{ data, error }` so callers can handle request failures:

```ts
const { data, error } = await qube
  .from<{ id: string; name: string }>("users")
  .select("id,name")
  .eq("id", "user-123")
  .execute();

if (error) console.error(error);
else console.log(data);
```

Supported filters include `eq`, `noteq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, and `is`. Reads also support `order`, `limit`, and `offset`. Writes use `insert`, `update`, and `delete`; updates and deletes require an equality filter on `id`, which the API applies to the row's primary key.

Anonymous project keys are intended for reads. Writes require the service-role key. Keep service-role keys on trusted servers and out of browser bundles.

## Realtime

Enable realtime for a table in Qube, then subscribe to its row-change events:

```ts
const unsubscribe = qube.realTime.subscribe("users", (event) => {
  console.log(event.type, event.record, event.oldRecord);
});

// Call when the view or component is disposed.
unsubscribe();
```

Events cover `INSERT`, `UPDATE`, and `DELETE`. A subscription can also receive connection status through an optional second callback. Use `qube.realTime.disconnect()` to close all subscriptions on the client.

## Storage

Create a bucket in Qube before using it. The client supports listing objects, uploading a browser `File`, removing an object, and requesting a signed URL:

```ts
const avatars = qube.storage.from("avatars");
const { data, error } = await avatars.list();
```

Upload and delete require a service-role key. Upload also requires UploadThing to be configured by the API deployment. Avoid exposing privileged keys in a public application.

## Authentication

`qube.auth` provides `signIn`, `signUp`, `signOut`, `getUser`, `signInWithGoogle`, and `signInWithGithub`. Email/password methods use API cookies; OAuth methods redirect the browser. Magic-link sign-in is not supported. Authentication behavior depends on the API's cookie, CORS, and OAuth configuration.

## Current API notes

- The SDK sends database and storage requests to the configured project endpoint and relies on the Qube API for authorization.
- The current `signUp` helper sends email and password, while the API registration endpoint may require a name; confirm the deployed API contract before relying on signup through this helper.
- Realtime subscriptions require a browser/runtime with Socket.IO support and an API origin reachable by that client.

For implementation details, see [`packages/qube-js/README.md`](packages/qube-js/README.md) and the source in [`packages/qube-js/src/`](packages/qube-js/src/).
