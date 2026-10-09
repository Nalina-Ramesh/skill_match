# SkillMatch

SkillMatch is an employee skill and project allocation app built with React, Vite, Express, JavaScript, React Router, Recharts, Lucide React, and plain CSS. Accounts have private workspaces stored by the backend; every new workspace starts empty.

## Run locally

```sh
npm install
npm run dev
```

The development command starts the Vite frontend and Express API together. Create a production bundle with `npm run build`, then run the combined app with `npm start`. Run backend integration tests with `npx vitest run server/index.test.js --pool forks --maxWorkers 1`. Format the project with `npm run format` and verify formatting with `npm run format:check`.

## Features

- Manager dashboard with live KPI cards, department distribution, utilization, staffing, and skill coverage charts.
- Employee directory with search, combined filters, sorting, CRUD, capacity validation, skill management, and employee profiles.
- Project portfolio and project detail pages with staffing progress, requirements, and ranked candidate recommendations.
- Assignment management, employee workload tracking, and allocation history.
- CSV downloads for employee utilization, project staffing, and assignment details.
- Account signup, login, and logout with private, empty-by-default workspaces.
- Server-side workspace persistence and a confirmed clear action.

## Architecture

`server/index.js` provides signup, login, logout, session, and workspace endpoints. Passwords are hashed with Node's scrypt; the session token is stored in an HttpOnly cookie. The server persists account and workspace data to `data/skillmatch.json` by default; set `SKILLMATCH_DATA_FILE` to use a different location. `src/context/AppContext.jsx` owns authenticated state and coordinated record operations. `src/utils/domain.js` contains pure skill scoring, candidate ranking, workload, availability, CSV escaping, and validation rules. Route-level pages live in `src/app/Pages.jsx` and `src/app/AuthPages.jsx`; shared styling is in `src/styles.css`.

## Business rules

Skill match is the weighted average of each requirement's score: missing skill is 0, below-required proficiency is employee level divided by required level, and meeting or exceeding the level is 1. Scores are shown to one decimal; projects with no requirements show N/A. Candidates must be active, available, have enough remaining capacity for the project's commitment, and not already be assigned. Ties use projected utilization, experience, and name. Employee utilization is active assigned commitment divided by maximum capacity. Completed-project assignments remain in records but are excluded from current workload.

CSV values are quoted and escaped, with formula-triggering values prefixed to reduce spreadsheet formula injection. Each account has its own server-stored workspace. Browser data from the previous demo version is removed and is not imported. History is preserved for current record deletions; clearing the workspace removes it.

## Limitations

The JSON file store is intended for local development and small single-server deployments, not concurrent multi-instance production use. Use HTTPS in production so session cookies are secure, and configure backups and request rate limiting before exposing the service publicly. All accounts currently use the manager workspace; role-based employee access has not been implemented.
