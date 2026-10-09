import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "./index.js";

let directory;
let server;
let baseUrl;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "skillmatch-test-"));
  server = createApp({
    storePath: path.join(directory, "store.json"),
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
});
