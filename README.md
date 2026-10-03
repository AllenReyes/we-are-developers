# WeAreDevelopers 2026 Conference Companion

A fast, dependency-free companion for navigating the WeAreDevelopers World Congress 2026 schedule, following a personal itinerary, and finding live streams and recordings.

## Why I built this

I developed this on the fly during the conference to make reviewing sessions easy while on the go. I used it live during sessions to discuss what we should attend next, compare the upcoming options, and quickly see where I needed to go afterward.

The result is a focused route through a large conference schedule rather than another static agenda: it surfaces what is happening now, what is next, and the location of each session.

## Features

- Search and filter the complete conference schedule.
- Follow a conflict-free itinerary organized into `ATTENDING`, `MUST`, `PRIORITY`, and `RESERVED` tiers.
- Jump to sessions happening now or to the next selected session.
- Review session times, stages, speakers, descriptions, and official links.
- Browse live streams and recordings in a separate media view.
- Edit, import, and export the itinerary when signed in as the configured owner.
- Use the responsive, keyboard-accessible interface from a phone or desktop.

## Local preview

The application uses plain HTML, CSS, and JavaScript and has no package installation step. From the repository root, start a local static server:

```sh
python3 -m http.server 8000 --directory conference-companion
```

Then open:

- `http://localhost:8000/` for the itinerary
- `http://localhost:8000/recordings.html` for recordings and session links

The local static preview uses the public, read-only itinerary experience. Owner authorization is injected by the hosted worker.

## Project structure

- `conference-companion/index.html` and `app.js` provide the itinerary interface.
- `conference-companion/recordings.html` and `recordings.js` provide the media library.
- `conference-companion/timeline.js` contains the live and upcoming-session logic.
- `conference-companion/itinerary.js` contains the default selected route.
- `conference-companion/styles.css` contains the shared responsive design.
- `conference-companion/sessions.js` is generated schedule data.
- `conference-companion/build.mjs` bundles the site into the tracked hosted worker at `conference-companion/dist/server/index.js`.
- `conference-companion/verify-itinerary.mjs` validates the itinerary, timeline behavior, markup, authorization, and generated worker.

Repository-specific guidance for coding agents is in [`AGENTS.md`](AGENTS.md).

## Development and verification

Use a recent Node.js release with built-in `fetch` and `import.meta.dirname` support.

Syntax-check any JavaScript file you change:

```sh
node --check conference-companion/app.js
```

After changing a bundled HTML, JavaScript, CSS, or image asset, rebuild the tracked worker:

```sh
node conference-companion/build.mjs
```

Run the project verification after application, schedule, itinerary, build, or related markup changes:

```sh
node conference-companion/verify-itinerary.mjs
```

When browser assets change, also update their cache-busting query strings in the HTML files that load them.

## Refreshing schedule data

`conference-companion/refresh-sessions.mjs` reads `conference-schedule-data.json`, fetches the official session directory, applies known live corrections, and rewrites `conference-companion/sessions.js`.

Run this only when intentionally synchronizing the schedule because it performs network requests and changes generated data:

```sh
node conference-companion/refresh-sessions.mjs
```

Review the generated diff, rebuild the worker, and run the itinerary verification afterward.

## Hosting and owner access

The repository includes OpenAI Sites project configuration in `conference-companion/.openai/hosting.json`. The generated worker serves the bundled assets and injects authorization state into the itinerary page.

Owner editing is enabled only when the authenticated email matches the hosted `OWNER_EMAIL` environment value. Public visitors receive the approved baseline itinerary without access to browser-saved owner overrides.
