# Wave 6 Manual Smoke Test

Run after deploying the built client. Target: local dev via Docker Compose, or staging, or prod.

## Asset delivery

1. `curl -I http://localhost:3900/manifest.webmanifest` → `200 OK`, `Content-Type: application/json` or `application/manifest+json`.
2. `curl -I http://localhost:3900/favicon.svg` → `200 OK`, `Content-Type: image/svg+xml`.
3. `curl -I http://localhost:3900/apple-touch-icon.png` → `200 OK`, `Content-Type: image/png`.

## Branding

4. Open the app in Safari (desktop). Browser tab shows 🪴 and title reads "PLNT".
5. Open in mobile Safari → "Share" → "Add to Home Screen". The home-screen icon is the 🪴 pot.
6. Dashboard welcome copy reads "Welcome to PLNT" (visible on an empty state or first load).

## Hamburger menu

7. Click the ≡ button (top-right of header). Drawer slides in from the right within ~200 ms.
8. Drawer contains six entries in order: Add plant, Archive, Feedback, Settings, Setup, About.
9. Click "Archive" → drawer closes, route changes to `/archived`.
10. Reopen menu → press `Escape` → drawer closes.
11. Reopen menu → click outside the drawer (on the dimmed backdrop) → drawer closes.
12. Reopen menu → Tab through all six entries → focus wraps from About back to "Add plant".
13. Reopen menu → Shift+Tab from "Add plant" → focus wraps to About.
14. Click "About" → page shows heading "About PLNT" and the tagline paragraph.

## Vacation hidden (#81)

15. Dashboard contains no "Vacation" button anywhere.
16. Settings page still shows only the existing "Show developer info" toggle — no vacation section added.

## Regression

17. Add a plant (top-bar hamburger → Add plant). Flow completes, plant appears on Dashboard.
18. Water the plant once. Schedule updates; timeline shows the watering event. Bin-packer behavior unchanged.

## Plumbing check (optional)

19. The `/vacation-start` and `/vacation-end` API endpoints still respond:
    ```bash
    curl -X POST http://localhost:3900/api/vacation-start -H 'content-type: application/json' -d '{"end_date":"2099-01-01"}'
    curl -X POST http://localhost:3900/api/vacation-end
    ```
    Both return 200 with the vacation-status JSON. (This confirms the backend plumbing is intact even though the UI is hidden.)
