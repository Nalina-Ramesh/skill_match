import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "./index.js";

let directory;
let server;
let baseUrl;
let storePath;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "skillmatch-test-"));
  storePath = path.join(directory, "store.json");
  server = createApp({
    storePath,
    serveClient: false,
  }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await rm(directory, { recursive: true, force: true });
});

async function request(route, { cookie, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
  const setCookie = response.headers.get("set-cookie")?.split(";")[0];
  const body = response.status === 204 ? null : await response.json();
  return { response, body, cookie: setCookie ?? cookie };
}

describe("authentication and workspace API", () => {
  it("initializes an existing empty data file during signup", async () => {
    await writeFile(storePath, "");
    const signup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "First User",
        email: "first@example.com",
        password: "correct horse battery",
      }),
    });

    expect(signup.response.status).toBe(201);
    expect(signup.body.user.email).toBe("first@example.com");
  });

  it("creates empty isolated workspaces and persists them after login", async () => {
    const firstSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "First User",
        email: "first@example.com",
        password: "correct horse battery",
      }),
    });

    expect(firstSignup.response.status).toBe(201);
    expect(firstSignup.body.workspace).toMatchObject({
      employees: [],
      projects: [],
      assignments: [],
      history: [],
    });
    expect(firstSignup.body.user).not.toHaveProperty("passwordHash");

    const updated = {
      ...firstSignup.body.workspace,
      employees: [{ id: "employee-1", name: "Private employee" }],
    };
    const saveResponse = await request("/api/workspace", {
      method: "PUT",
      cookie: firstSignup.cookie,
      body: JSON.stringify(updated),
    });
    expect(saveResponse.response.status).toBe(200);

    const secondSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Second User",
        email: "second@example.com",
        password: "another secure password",
      }),
    });
    expect(secondSignup.body.workspace.employees).toEqual([]);

    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "first@example.com",
        password: "correct horse battery",
      }),
    });
    expect(login.response.status).toBe(200);
    expect(login.body.workspace.employees).toEqual(updated.employees);

    const logout = await request("/api/auth/logout", {
      method: "POST",
      cookie: login.cookie,
    });
    expect(logout.response.status).toBe(204);
    const session = await request("/api/auth/me", { cookie: login.cookie });
    expect(session.body.user).toBeNull();
  });

  it("rejects unauthenticated workspace access and invalid signup input", async () => {
    const noSession = await request("/api/auth/me");
    expect(noSession.response.status).toBe(200);
    expect(noSession.body.user).toBeNull();

    const unauthorized = await request("/api/workspace");
    expect(unauthorized.response.status).toBe(401);

    const invalidSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "", email: "bad", password: "short" }),
    });
    expect(invalidSignup.response.status).toBe(400);
  });

  it("links employee accounts to a manager and only permits personal skill edits", async () => {
    const managerSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Team Manager",
        email: "manager@example.com",
        password: "correct horse battery",
        accountRole: "Manager",
      }),
    });
    const managerWorkspace = {
      ...managerSignup.body.workspace,
      employees: [
        {
          id: "employee-1",
          name: "Taylor Employee",
          email: "taylor@example.com",
          skills: [{ name: "JavaScript", level: "Intermediate" }],
        },
        {
          id: "employee-2",
          name: "Other Employee",
          email: "other@example.com",
          skills: [],
        },
      ],
      projects: [
        { id: "project-1", name: "Assigned project" },
        { id: "project-2", name: "Other project" },
      ],
      assignments: [
        {
          id: "assignment-1",
          employeeId: "employee-1",
          projectId: "project-1",
          status: "Active",
        },
        {
          id: "assignment-2",
          employeeId: "employee-2",
          projectId: "project-2",
          status: "Active",
        },
      ],
      history: [
        { id: "history-1", employeeId: "employee-1", description: "Assigned" },
        {
          id: "history-2",
          employeeId: "employee-2",
          description: "Other change",
        },
      ],
    };
    const savedManagerWorkspace = await request("/api/workspace", {
      method: "PUT",
      cookie: managerSignup.cookie,
      body: JSON.stringify(managerWorkspace),
    });
    expect(savedManagerWorkspace.response.status).toBe(200);

    const employeeSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Taylor Employee",
        email: "taylor@example.com",
        password: "another secure password",
        accountRole: "Employee",
        managerEmail: "manager@example.com",
      }),
    });
    expect(employeeSignup.response.status).toBe(201);
    expect(employeeSignup.body.user).toMatchObject({
      accountRole: "Employee",
      employeeId: "employee-1",
    });
    expect(employeeSignup.body.workspace).toMatchObject({
      role: "Employee",
      selectedEmployeeId: "employee-1",
      employees: [{ id: "employee-1" }],
      projects: [{ id: "project-1" }],
      assignments: [{ employeeId: "employee-1" }],
      history: [{ employeeId: "employee-1" }],
    });

    const wrongRoleLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "taylor@example.com",
        password: "another secure password",
        accountRole: "Manager",
      }),
    });
    expect(wrongRoleLogin.response.status).toBe(401);

    const alteredWorkspace = {
      ...employeeSignup.body.workspace,
      employees: [
        {
          ...employeeSignup.body.workspace.employees[0],
          name: "Changed name",
          skills: [{ name: "TypeScript", level: "Advanced" }],
        },
        { id: "employee-2", name: "Changed other employee", skills: [] },
      ],
      projects: [],
      assignments: [],
    };
    const employeeSave = await request("/api/workspace", {
      method: "PUT",
      cookie: employeeSignup.cookie,
      body: JSON.stringify(alteredWorkspace),
    });
    expect(employeeSave.response.status).toBe(200);

    const managerRead = await request("/api/workspace", {
      cookie: managerSignup.cookie,
    });
    expect(managerRead.body.employees).toMatchObject([
      {
        id: "employee-1",
        name: "Taylor Employee",
        skills: [{ name: "TypeScript", level: "Advanced" }],
      },
      { id: "employee-2", name: "Other Employee", skills: [] },
    ]);
    expect(managerRead.body.assignments).toHaveLength(2);
    expect(managerRead.body.projects).toHaveLength(2);
  });

  it("requires employee signup email to match the manager directory", async () => {
    const managerSignup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Manager",
        email: "manager@example.com",
        password: "correct horse battery",
      }),
    });
    const response = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Unlisted Employee",
        email: "unlisted@example.com",
        password: "another secure password",
        accountRole: "Employee",
        managerEmail: "manager@example.com",
      }),
    });
    expect(response.response.status).toBe(400);
    expect(managerSignup.response.status).toBe(201);
  });
});
