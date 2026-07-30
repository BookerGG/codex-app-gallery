# Job Hunt Tracker

A beginner-friendly portfolio project for tracking job applications, interview progress, contacts, and next steps.

## Project Goal

Build a focused dashboard that helps a job seeker see where every application stands and what needs attention next. The first version uses realistic mock data so the product flow can be designed before adding a database or authentication.

## Current Milestone

- Product brief and user stories are documented.
- Application data model is defined.
- Working dashboard uses mock data.
- Status filters, search, summary metrics, and a customizable application form are implemented.
- Applications can be created, edited, and deleted during the session.
- Applications are saved locally in the browser.
- Table and board views are available for scanning the pipeline.
- Filtered listings can be exported to a PDF report.
- Sample data can be restored from the UI.
- All listings can be deleted at once to start a blank tracker.
- Domain and storage logic have lightweight tests.

## MVP Features

- View all applications in one table.
- Filter applications by status.
- Search by company, role, location, contact, or source.
- Add a new application during the session.
- Edit or delete existing applications.
- Save tracker changes in browser-local storage.
- Reset the tracker to the original sample data.
- Start over with a blank tracker.
- Switch between table and board views.
- Export the current filtered list to PDF.
- See summary metrics for total applications, interviews, offers, and next actions.

## Workforce-Style Workflow

1. Define the problem and target user.
2. Write user stories and MVP scope.
3. Model the core data.
4. Build the first usable UI slice with mock data.
5. Add tests around reusable business logic.
6. Document decisions and next improvements.

## How To Open

Double-click:

```txt
Open Job Hunt Tracker.html
```

That file opens `index.html` in your browser. No terminal or local server is required for normal use.

Developer preview is still available through a local static server if you want a URL:

```bash
python -m http.server 8765
```

## How To Test

```bash
node --test tests/*.test.js
```

## Build The Double-Click Version

The browser-ready bundle is generated from the modular source files:

```bash
node scripts/build-browser-bundle.mjs
```

## Next Iterations

- Add a backend database so records can sync across devices.
- Deploy the app and add screenshots to this README.
- Add a short portfolio case study with screenshots.
