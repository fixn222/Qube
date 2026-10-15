# UI/UX review and fixes

Static review of the web app routes, shared navigation, and project creation flow. All reported issues below have been addressed in the current code. No browser or device testing was performed.

## Findings and status

| Priority | Finding | Status and resolution |
| --- | --- | --- |
| High | Project sidebar linked to an Auth route that did not exist. | **Fixed:** removed the unsupported Auth item from [app-sidebar.tsx](apps/web/src/components/app-sidebar.tsx). |
| High | Project creation errors were returned by the server action but not shown in the dialog. | **Fixed:** the dialog now displays the error in an announced alert and hides stale errors when reopened. |
| Medium | The New project trigger nested a button inside Radix’s trigger button. | **Fixed:** changed to `DialogTrigger asChild`. |
| Medium | `/` showed only API health status and offered no path into the app. | **Fixed:** it redirects to `/organizations`; the existing auth proxy routes signed-out users to `/login`. |
| Low | Browser metadata still used the Next.js starter title and description. | **Fixed:** replaced with Qube product metadata. |

## Visual refresh

- Reworked light and dark color tokens, rounded corners, focus rings, and page typography in [globals.css](apps/web/src/app/globals.css).
- Updated the dashboard shell with a sticky project bar and a theme toggle that follows the resolved system theme.
- Redesigned the organization and project lists with responsive cards, clearer page headings, hover and focus states, and actionable empty states.
- Refreshed login and registration with matching Qube branding and corrected registration labels, autocomplete hints, and copy.
- Added a project Observatory overview with range selection, live metrics, empty/loading/error states, and project resource details.
- Added a read-only interactive ER diagram backed by PostgreSQL catalog introspection, with confirmed relationships distinguished from inferred suggestions.
- Replaced the checked-in SDK test service-role token with an operator-entered key field so privileged project credentials are no longer embedded in the browser bundle.

## Verification limits

`git diff --check`, Web TypeScript checking, the Web lint command, API build, and API unit tests passed during the Observatory implementation. Web lint retains warnings in unrelated files. A full Web production build did not complete in this environment; Docker Engine was present but its daemon socket was unavailable, so browser and container end-to-end checks were not run.
