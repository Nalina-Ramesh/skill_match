# SkillMatch

SkillMatch is an employee skill and project allocation app built with React, Vite, Express, JavaScript, React Router, Recharts, Lucide React, and plain CSS. Accounts have private workspaces stored by the backend; every new workspace starts empty.

## Run locally

```sh
npm install
npm run dev
```

The development command starts the Vite frontend and Express API together. Create a production bundle with `npm run build`, then run the combined app with `npm start`. Run all unit and backend integration tests with `npm test`, check JavaScript and React code with `npm run lint`, and verify formatting with `npm run format:check`. GitHub Actions runs the tests, lint, formatting check, and production build for pushes and pull requests; CodeQL performs additional static analysis. See [VERIFICATION.md](./VERIFICATION.md) for the latest local check results and their limitations.

## Features

- Manager dashboard with live KPI cards, department distribution, utilization, staffing, and skill coverage charts.
- Employee directory with search, combined filters, sorting, CRUD, capacity validation, skill management, and employee profiles.
- Project portfolio and project detail pages with staffing progress, requirements, and ranked candidate recommendations.
- Assignment management, employee workload tracking, and allocation history.
- CSV downloads for employee utilization, project staffing, and assignment details.
- Role-based account signup, login, and logout for managers and employees.
- Manager accounts for maintaining the employee directory, creating projects, and assigning employees.
- Employee workspaces for viewing personal skills and assigned projects, with permission to update only their own skills.
- Server-side workspace persistence and a confirmed clear action.

## Accounts and roles

Choose **Manager** or **Employee** when creating an account, and select the same role when signing in. A manager account owns a workspace and can manage its employee records, projects, assignments, and reports. To join a manager's workspace, the manager must first add the employee's work email to the employee directory. The employee then signs up using that same email address and enters the manager account's email. Employee accounts can view their own profile, skills, and assigned projects; they cannot access the manager's directory or change project assignments. Employees can add, edit, and remove skills on their own profile.

## Architecture

`server/index.js` provides signup, login, logout, session, and workspace endpoints. Passwords are hashed with Node's scrypt; the session token is stored in an HttpOnly cookie. Manager workspaces and employee-to-manager links are persisted in `data/skillmatch.json` by default; set `SKILLMATCH_DATA_FILE` to use a different location. Employee API responses are scoped to the linked employee and assigned projects, and employee workspace updates are restricted server-side to that employee's skills. A missing or empty data file is initialized as a new store. `src/context/AppContext.jsx` owns authenticated state and coordinated record operations. `src/utils/domain.js` contains pure skill scoring, candidate ranking, workload, availability, CSV escaping, and validation rules. Route-level pages live in `src/app/Pages.jsx` and `src/app/AuthPages.jsx`; shared styling is in `src/styles.css`.

## Business rules

Skill match is the weighted average of each requirement's score: missing skill is 0, below-required proficiency is employee level divided by required level, and meeting or exceeding the level is 1. Scores are shown to one decimal; projects with no requirements show N/A. Candidates must be active, available, have enough remaining capacity for the project's commitment, and not already be assigned. Ties use projected utilization, experience, and name. Employee utilization is active assigned commitment divided by maximum capacity. Completed-project assignments remain in records but are excluded from current workload.

CSV values are quoted and escaped, with formula-triggering values prefixed to reduce spreadsheet formula injection. Each manager has a server-stored workspace; employee accounts are linked to one employee record in a manager's workspace. Browser data from the previous demo version is removed and is not imported. History is preserved for current record deletions; clearing the manager workspace removes it.
