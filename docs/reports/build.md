# Task: Make the Qube SDK Independently Installable and Testable

You are working inside my existing Qube monorepo. Your task is to fix the packaging and build configuration of `qube-js` so it can be installed and tested in an external project **without requiring access to the Qube monorepo**.

## Current Problem

Qube is a monorepo managed with pnpm workspaces. It contains shared internal packages such as:

- `packages/qube-js`
- `packages/types`
- `packages/constants`

The SDK imports shared resources from internal workspace packages. When I pack the SDK into a `.tgz` archive and install it in an independent Vite project, npm attempts to download an internal dependency such as `@qube/constants` from the npm registry and fails with a 404.

I want to test the actual distributable SDK before publishing anything.

## Phase 1: Inspect the Existing Architecture

Before changing code, inspect:

- Root `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `packages/qube-js/package.json`
- The package manifests for `packages/types` and `packages/constants`
- All imports and exports between internal packages
- Existing TypeScript, bundler, and build configurations
- Existing SDK entry points, declaration files, tests, and package scripts

Identify which internal packages contain runtime code and which are type-only packages.

Do not assume that the project uses a particular bundler. Work with the existing architecture where practical.

## Phase 2: Choose the Correct Packaging Strategy

Prefer producing a self-contained SDK package.

1. Bundle internal runtime dependencies such as `@qube/constants` into the SDK output when appropriate.
2. Ensure TypeScript types from `@qube/types` are available to consumers without requiring unpublished workspace packages.
3. Bundle or generate declaration files as needed so public declarations do not contain unresolved imports to private workspace packages.
4. Keep third-party dependencies external when appropriate and declare them correctly in the SDK's `dependencies` or `peerDependencies`.
5. Do not bundle server-only code, secrets, or backend credentials into browser-facing SDK output.
6. Preserve the SDK's intended public API and avoid unnecessary breaking changes.

If a shared package should remain a separately published dependency, explain why and configure it with valid package versions and dependency metadata. Do not leave `workspace:*` references that make the packed SDK unusable outside the monorepo.

## Phase 3: Fix the Build and Package Metadata

Configure the SDK to produce valid distributable artifacts for its intended consumers.

Check and fix:

- ESM output
- CommonJS output, if supported by the current project
- TypeScript declarations
- `main`, `module`, `types`, and `exports` fields where appropriate
- Correct package entry points
- Runtime and development dependencies
- Files included in the npm archive
- Exclusion of source files, secrets, environment files, and unnecessary build artifacts
- Compatibility between the build output and the package metadata

Use the project's existing build tools if they can support this reliably. Introduce a new dependency only when necessary.

## Phase 4: Build and Inspect the Real Archive

Provide working commands or scripts to:

1. Build the required workspace packages in the correct order.
2. Generate the SDK's `.tgz` archive.
3. Inspect the archive's `package/package.json`.
4. List the archive contents.
5. Verify that no unresolved `workspace:` dependency or unpublished internal package remains.
6. Verify that every exported JavaScript and TypeScript entry point exists.

Do not assume that a successful build means the package is distributable.

## Phase 5: Test Outside the Monorepo

Create or document a minimal standalone Vite + TypeScript application in a directory outside the Qube workspace.

Install the SDK from the generated archive using a local file path, for example:

`npm install /absolute/path/to/qube-js-1.0.0.tgz`

The test application must not use workspace aliases, monorepo path mappings, or direct imports from Qube's source directories.

Test the following:

- Importing the SDK from JavaScript/TypeScript
- TypeScript declaration resolution
- Instantiating the SDK with valid configuration
- Calling a simple SDK method
- Building the Vite application for production
- Running a small integration test against the configured Qube API when valid credentials and a test environment are available

Verify that the package works as an installed consumer would use it, rather than merely importing source files.

## Phase 6: Review SDK Functionality and Security

Inspect the SDK's existing API before writing tests. Use the actual method signatures and implementation rather than inventing APIs.

Pay particular attention to:

- Database queries and mutations
- Realtime functionality
- Storage operations
- Authentication
- Error handling and TypeScript types

Do not assume all features can be tested without a running backend or provider configuration. Clearly distinguish build-time tests, local tests, and live integration tests.

Security requirements:

- Never expose a service-role key or other privileged server credential in browser code.
- Keep server-only operations on the backend.
- Ensure public configuration contains only credentials explicitly intended to be public.
- Do not silently weaken authentication or authorization to make tests pass.

If existing functionality is broken, identify the issue and make the smallest justified fix.

## Phase 7: Deliverables

After implementing the changes, provide:

1. A concise explanation of the root cause.
2. A list of files changed and why.
3. The final SDK packaging strategy and its trade-offs.
4. Exact commands to build and pack the SDK.
5. Exact commands to install the archive in the standalone Vite project.
6. The tests executed and their actual results.
7. Any remaining issues or prerequisites before publishing to npm.

## Important Rules

- Inspect the real repository before editing.
- Do not rewrite the entire monorepo.
- Do not invent file paths, SDK methods, dependency versions, or test results.
- Preserve existing functionality and naming conventions.
- Make changes directly in the working tree when tools permit.
- Run the relevant builds and tests after making changes.
- If a command fails, investigate and fix the underlying cause rather than hiding the failure.
- Do not publish anything to npm.
- Do not claim success unless the standalone installation and production build actually pass.

**Definition of done:** I can build a `.tgz` archive from the Qube monorepo, install that archive in a completely separate Vite + TypeScript project, import the SDK, resolve its types, and build the consumer application without requiring unpublished internal Qube packages or access to the monorepo.
