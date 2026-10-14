# Qube JavaScript SDK

`qube-js` is the browser client for a Qube project. It provides database REST
queries, realtime subscriptions, storage operations, and auth helpers.

## Install and build

In this pnpm workspace, add the package to an app with:

```bash
pnpm --filter web add qube-js@workspace:*
pnpm --filter qube-js build
```

The package exports ESM, CommonJS, and TypeScript declarations from `dist/`.
Build it before using it from an app that resolves the workspace package exports.

## Create a client

Pass the project API URL and a project key to `createClient`:

```ts
import { createClient } from "qube-js";

const qube = createClient(
  "http://localhost:3000/api/projects/my-project",
  process.env.NEXT_PUBLIC_QUBE_PROJECT_KEY!,
);
```

The URL ends at `/api/projects/<project-slug>`; the SDK adds the REST and
storage paths itself. In a browser, the API must allow the web app's origin
through CORS. Use an anonymous project key for reads and realtime. Writes need
a service-role key. A service-role key grants write access, so do not place one
in a public browser app; use it only in a trusted server or a local-only test
page.

Every request returns `{ data, error }`. On success, `error` is `null` and
`data` contains the returned rows or object. On failure, `data` is `null` and
`error` contains a message.

## Database queries

The query builder can be executed with `.execute()` or awaited directly:

```ts
type User = { id: string; email: string; name: string | null };

const { data, error } = await qube
  .from<User>("users")
  .select("id,email,name")
  .eq("email", "sam@example.com")
  .order("name", "asc")
  .limit(10)
  .execute();

if (error) {
  console.error(error);
} else {
  console.log(data); // User[]
}
```

Reads return arrays. Inserts return the inserted row; updates and deletes
return the affected row. Available read methods are:

```ts
.select("id,name") // defaults to all columns
.eq("status", "active")
.noteq("status", "archived")
.gt("age", 18)
.gte("age", 18)
.lt("age", 65)
.lte("age", 65)
.like("email", "%@example.com")
.ilike("name", "sam%")
.is("deleted_at", "null") // or "not null"
.order("created_at", "desc") // direction defaults to asc
.limit(20)
.offset(20)
```

Use a service-role key for writes:

```ts
const inserted = await qube
  .from<User>("users")
  .insert({ email: "sam@example.com", name: "Sam" })
  .execute();

const updated = await qube
  .from<User>("users")
  .update({ name: "Sam Q." })
  .eq("id", "row-uuid")
  .execute();

const deleted = await qube
  .from<User>("users")
  .delete()
  .eq("id", "row-uuid")
  .execute();
```

Updates and deletes require `.eq("id", rowId)`. The server applies that value
to the table's primary key. The builder currently supports one filter per
column; a later filter for the same column replaces the earlier one.

## Realtime

Enable realtime for the table in the Qube project first. Then subscribe with a
callback for events and an optional callback for connection status:

```ts
const unsubscribe = qube.realTime.subscribe(
  "users",
  (event) => {
    console.log(event.type, event.record, event.oldRecord);
  },
  (status, message) => {
    console.log(status, message);
  },
);

// Remove this subscription when the component unmounts.
unsubscribe();

// Or close the socket and clear every subscription on this client.
qube.realTime.disconnect();
```

Statuses are `connecting`, `connected`, `disconnected`, and `error`. Events
have a `type` of `INSERT`, `UPDATE`, or `DELETE`, plus `table`, `record`,
`projectId`, and `timestamp`; updates and deletes also include `oldRecord`.
Realtime uses Socket.IO at the API host's `/realtime` namespace. Browser pages
must be served over HTTP(S), and the API must allow their origin.

## Storage

Create the bucket in Qube first. Listing and signed URL access use the project
key; upload and delete require a service-role key. Upload accepts a browser
`File` and requires UploadThing to be configured on the API:

```ts
const bucket = qube.storage.from("avatars");

const listed = await bucket.list();
const uploaded = await bucket.upload(fileInput.files![0]);
const signed = uploaded.data
  ? await bucket.getSignedUrl(uploaded.data.id)
  : null;

if (uploaded.error) console.error(uploaded.error);
```

Other methods are `bucket.remove(objectId)` and `bucket.getSignedUrl(objectId)`.
They also return `{ data, error }`.

## Authentication

The client exposes `qube.auth.signIn`, `signUp`, `signOut`, `getUser`,
`signInWithGoogle`, and `signInWithGithub`. Auth uses API cookies and browser
credentials. Magic-link sign-in is not supported. The current `signUp` method
sends only email and password, while the API registration DTO also requires a
name, so signup needs that contract aligned before it can succeed.
