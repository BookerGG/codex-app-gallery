# Support Ticket System

A beginner-friendly portfolio project for triaging customer requests, priorities, ownership, and ticket status.

## Project Goal

Build a compact support dashboard that helps a team understand what needs attention now. The first version uses realistic mock data and focuses on ticket triage before adding persistent storage or user accounts.

## Current Milestone

- Product brief and user stories are documented.
- Ticket data model is defined.
- Working dashboard uses mock data.
- Status, priority, search, and a new ticket form are implemented.
- Domain logic has lightweight tests.

## MVP Features

- View all support tickets.
- Filter tickets by status and priority.
- Search by title, requester, assignee, channel, or notes.
- Add a new ticket during the session.
- See summary metrics for open, urgent, waiting, and resolved tickets.

## Workforce-Style Workflow

1. Define the business problem.
2. Write user stories and MVP scope.
3. Model the core data.
4. Build a first usable internal-tool dashboard.
5. Add tests around filtering and reporting logic.
6. Document tradeoffs and next improvements.

## How To Preview

Open `index.html` through a local static server. From this folder, one option is:

```bash
python -m http.server 8766
```

Then visit:

```txt
http://localhost:8766
```

## How To Publish With GitHub Pages

This project is ready to publish as a static GitHub Pages demo because `index.html` lives at the project root and the app does not need a backend build step.

1. Create a new GitHub repository named `support-ticket-system`.
2. Keep the repository empty when you create it. Do not add a README, license, or `.gitignore` on GitHub because this folder already has those project files.
3. From this folder, make the first commit, connect the GitHub repo, and push:

```bash
git init
git branch -M main
git add .
git commit -m "Initial support ticket dashboard"
git remote add origin https://github.com/YOUR-USERNAME/support-ticket-system.git
git push -u origin main
```

4. In GitHub, open the repository settings.
5. Go to **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select branch `main` and folder `/`, then save.
8. After GitHub finishes publishing, the demo URL will look like:

```txt
https://YOUR-USERNAME.github.io/support-ticket-system/
```

## How To Test

```bash
node --test tests/*.test.js
```

## Next Iterations

- Persist tickets in local storage.
- Add ticket detail view and edit workflow.
- Add SLA due dates.
- Add agent assignment filters.
- Deploy the app and add screenshots to this README.
