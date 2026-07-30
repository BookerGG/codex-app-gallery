# Job Hunt Tracker

A beginner-friendly portfolio project for tracking job applications, interview progress, contacts, and next steps.

## Live Demo

- Live site: https://bookergg.github.io/job-hunt-tracker/
- Case study: [docs/case-study.md](./docs/case-study.md)

## Project Goal

Build a focused dashboard that helps a job seeker see where every application stands and what needs attention next. The first version uses realistic mock data so the product flow can be designed before adding a database or authentication.

## Project Highlights

- Static front-end app that runs locally, from GitHub Pages, or by double-clicking the opener file.
- Browser-local persistence with save/load, sample reset, and blank tracker workflows.
- Table and board views for scanning the application pipeline.
- Guarded archive workflow for rejected or withdrawn jobs that become unpursuable.
- PDF export for the current filtered view.
- Modular source with 19 tests covering domain and storage behavior.

## Screenshots

### Active Dashboard

![Active dashboard](./docs/screenshots/active-dashboard.png)

### Archive View

![Archive view](./docs/screenshots/archive-view.png)

### Create and Edit Form

![Create and edit form](./docs/screenshots/create-edit-form.png)

### PDF Export Preview

![PDF export preview](./docs/screenshots/pdf-export-preview.png)

## Current Milestone

- Product brief and user stories are documented.
- Application data model is defined.
- Working dashboard uses mock data.
- Status filters, search, summary metrics, and a customizable application form are implemented.
- Applications can be created, edited, and deleted during the session.
- Applications are saved locally in the browser.
- Table and board views are available for scanning the pipeline.
- Rejected or withdrawn jobs that are no longer pursuable can be moved to an archive and restored later.
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
- Archive rejected or withdrawn jobs outside the active tracker.
- Restore archived jobs if they become relevant again.
- Save tracker changes in browser-local storage.
- Reset the tracker to the original sample data.
- Start over with a blank tracker.
- Switch between table and board views.
- Export the current filtered list to PDF.
- See summary metrics for active applications, interviews, offers, and archived jobs.

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

## GitHub Sharing

Live site:

```txt
https://bookergg.github.io/job-hunt-tracker/
```

Public repository:

```txt
https://github.com/BookerGG/job-hunt-tracker
```

For GitHub Pages, publish from the `main` branch and root folder. The app's browser entry point is `index.html`.

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
- Add JSON backup import/export so users can move saved tracker data between browsers.
- Add richer interview notes and contact history.
