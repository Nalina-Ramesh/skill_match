import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import express from "express";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
const sessionCookie = "skillmatch_session";
const sessionDuration = 7 * 24 * 60 * 60 * 1000;
const dummySalt = "skillmatch-invalid-login-salt";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const skillLevels = new Set(["Beginner", "Intermediate", "Advanced", "Expert"]);

export function emptyWorkspace() {
  return {
    version: 1,
    employees: [],
    projects: [],
    assignments: [],
    history: [],
    role: "Manager",
    selectedEmployeeId: null,
    settings: {},
  };
}

function emptyStore() {
  return { users: [], sessions: [], workspaces: {} };
}

function readStore(filePath) {
  if (!existsSync(filePath)) {
    const store = emptyStore();
    writeStore(filePath, store);
    return store;
  }

  const contents = readFileSync(filePath, "utf8");
  if (!contents.trim()) {
    const store = emptyStore();
    writeStore(filePath, store);
    return store;
  }

  const store = JSON.parse(contents);
  if (
    !Array.isArray(store.users) ||
    !Array.isArray(store.sessions) ||
    !store.workspaces
  ) {
    throw new Error("The SkillMatch data store has an invalid format.");
  }
  return store;
}

function writeStore(filePath, store) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(store), { mode: 0o600 });
  renameSync(temporaryPath, filePath);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password, salt) {
  const hash = await scryptAsync(password, salt, 64);
  return Buffer.from(hash).toString("hex");
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accountRole: user.accountRole === "Employee" ? "Employee" : "Manager",
    employeeId: user.accountRole === "Employee" ? user.employeeId : null,
  };
}

function readCookie(request) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  const entry = cookies.find((cookie) =>
    cookie.trim().startsWith(`${sessionCookie}=`),
  );
  return entry?.trim().slice(sessionCookie.length + 1) ?? "";
}

function setSessionCookie(response, token) {
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDuration,
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function createSession(store, userId, response, storePath) {
  const token = randomBytes(32).toString("base64url");
  store.sessions = store.sessions.filter(
    (session) => session.expiresAt > Date.now(),
  );
  store.sessions.push({
    tokenHash: hashToken(token),
    userId,
    expiresAt: Date.now() + sessionDuration,
  });
  writeStore(storePath, store);
  setSessionCookie(response, token);
}

function normalizeWorkspace(value) {
  const empty = emptyWorkspace();
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(value.employees) ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.history)
  ) {
    return null;
  }

  if (
    value.employees.length > 5000 ||
    value.projects.length > 5000 ||
    value.assignments.length > 20000 ||
    value.history.length > 20000
  ) {
    return null;
  }

  return {
    ...empty,
    employees: value.employees,
    projects: value.projects,
    assignments: value.assignments,
    history: value.history,
    role: value.role === "Employee" ? "Employee" : "Manager",
    selectedEmployeeId:
      typeof value.selectedEmployeeId === "string"
        ? value.selectedEmployeeId
        : null,
    settings:
      value.settings && typeof value.settings === "object"
        ? value.settings
        : {},
  };
}

function workspaceForUser(store, user) {
  const workspace = store.workspaces[user.id] ?? emptyWorkspace();
  if (user.accountRole !== "Employee") return workspace;

  const managerWorkspace = store.workspaces[user.managerId];
  const employee = managerWorkspace?.employees.find(
    (item) => item.id === user.employeeId,
  );
  if (!employee) return { ...emptyWorkspace(), role: "Employee" };

  const assignments = managerWorkspace.assignments.filter(
    (item) => item.employeeId === employee.id,
  );
  return {
    ...emptyWorkspace(),
    role: "Employee",
    selectedEmployeeId: employee.id,
    employees: [employee],
    projects: managerWorkspace.projects,
    assignments,
    history: managerWorkspace.history.filter(
      (item) => item.employeeId === employee.id,
    ),
  };
}

function normalizeSkills(value) {
  if (!Array.isArray(value) || value.length > 100) return null;
  const skills = [];
  for (const skill of value) {
    const name = typeof skill?.name === "string" ? skill.name.trim() : "";
    if (!name || name.length > 80 || !skillLevels.has(skill.level)) return null;
    skills.push({ name, level: skill.level });
  }
  return skills;
}

export function createApp({
  storePath = process.env.SKILLMATCH_DATA_FILE ||
    path.resolve(process.cwd(), "data", "skillmatch.json"),
  serveClient = true,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  function requireAuth(request, response, next) {
    try {
      const token = readCookie(request);
      if (!token) {
        response.status(401).json({ error: "Please sign in to continue." });
        return;
      }

      const store = readStore(storePath);
      const tokenHash = hashToken(token);
      const session = store.sessions.find(
        (item) => item.tokenHash === tokenHash && item.expiresAt > Date.now(),
      );
      const user =
        session && store.users.find((item) => item.id === session.userId);
      if (!user) {
        response.status(401).json({ error: "Please sign in to continue." });
        return;
      }

      request.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  }

  app.post("/api/auth/signup", async (request, response, next) => {
    try {
      const name = String(request.body?.name ?? "").trim();
      const email = String(request.body?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(request.body?.password ?? "");
      const accountRole =
        request.body?.accountRole === "Employee" ? "Employee" : "Manager";
      const managerEmail = String(request.body?.managerEmail ?? "")
        .trim()
        .toLowerCase();

      if (!name || name.length > 100) {
        response.status(400).json({ error: "Enter your name." });
        return;
      }
      if (!emailPattern.test(email) || email.length > 254) {
        response.status(400).json({ error: "Enter a valid email address." });
        return;
      }
      if (password.length < 10 || password.length > 256) {
        response
          .status(400)
          .json({ error: "Use a password between 10 and 256 characters." });
        return;
      }

      const store = readStore(storePath);
      if (store.users.some((user) => user.email === email)) {
        response
          .status(409)
          .json({ error: "An account with this email already exists." });
        return;
      }

      let manager;
      let employee;
      if (accountRole === "Employee") {
        manager = store.users.find(
          (user) =>
            user.email === managerEmail &&
            (user.accountRole ?? "Manager") === "Manager",
        );
        const managerWorkspace = manager && store.workspaces[manager.id];
        employee = managerWorkspace?.employees.find(
          (item) =>
            String(item.email ?? "")
              .trim()
              .toLowerCase() === email,
        );
        if (!manager || !employee) {
          response.status(400).json({
            error:
              "Ask your manager to add your work email to their employee directory first.",
          });
          return;
        }
      }

      const user = {
        id: randomBytes(16).toString("hex"),
        name,
        email,
        accountRole,
        ...(accountRole === "Employee"
          ? { managerId: manager.id, employeeId: employee.id }
          : {}),
        salt: randomBytes(16).toString("hex"),
        createdAt: new Date().toISOString(),
      };
      user.passwordHash = await hashPassword(password, user.salt);
      store.users.push(user);
      if (accountRole === "Manager")
        store.workspaces[user.id] = emptyWorkspace();
      createSession(store, user.id, response, storePath);
      response.status(201).json({
        user: safeUser(user),
        workspace: workspaceForUser(store, user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (request, response, next) => {
    try {
      const email = String(request.body?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(request.body?.password ?? "");
      const requestedRole = request.body?.accountRole;
      const store = readStore(storePath);
      const user = store.users.find((item) => item.email === email);
      const salt = user?.salt ?? dummySalt;
      const actualHash = await hashPassword(password, salt);
      const expectedHash = Buffer.from(
        user?.passwordHash ?? "0".repeat(128),
        "hex",
      );
      const valid =
        expectedHash.length === 64 &&
        timingSafeEqual(Buffer.from(actualHash, "hex"), expectedHash);

      if (
        !user ||
        !valid ||
        (requestedRole && requestedRole !== (user.accountRole ?? "Manager"))
      ) {
        response.status(401).json({ error: "Email or password is incorrect." });
        return;
      }

      createSession(store, user.id, response, storePath);
      response.json({
        user: safeUser(user),
        workspace: workspaceForUser(store, user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", (request, response, next) => {
    try {
      const token = readCookie(request);
      if (token) {
        const store = readStore(storePath);
        store.sessions = store.sessions.filter(
          (session) => session.tokenHash !== hashToken(token),
        );
        writeStore(storePath, store);
      }
      clearSessionCookie(response);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", (request, response, next) => {
    try {
      const token = readCookie(request);
      if (!token) {
        response.json({ user: null, workspace: null });
        return;
      }
      const store = readStore(storePath);
      const tokenHash = hashToken(token);
      const session = store.sessions.find(
        (item) => item.tokenHash === tokenHash && item.expiresAt > Date.now(),
      );
      const user =
        session && store.users.find((item) => item.id === session.userId);
      if (!user) {
        response.json({ user: null, workspace: null });
        return;
      }
      response.json({
        user: safeUser(user),
        workspace: workspaceForUser(store, user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/workspace", requireAuth, (request, response, next) => {
    try {
      const store = readStore(storePath);
      response.json(workspaceForUser(store, request.authUser));
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/employees/:employeeId/certificates",
    requireAuth,
    express.raw({ type: "application/octet-stream", limit: "5mb" }),
    (request, response, next) => {
      try {
        const store = readStore(storePath);
        const user = request.authUser;
        const workspace =
          user.accountRole === "Employee"
            ? store.workspaces[user.managerId]
            : store.workspaces[user.id];
        const employee = workspace?.employees.find(
          (item) => item.id === request.params.employeeId,
        );
        if (
          !employee ||
          (user.accountRole === "Employee" && user.employeeId !== employee.id)
        ) {
          response.status(404).json({ error: "Employee profile not found." });
          return;
        }

        const contentType = request.get("x-certificate-type");
        const file = request.body;
        const validFile =
          Buffer.isBuffer(file) &&
          ((contentType === "application/pdf" &&
            file.subarray(0, 5).toString() === "%PDF-") ||
            (contentType === "image/png" &&
              file
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
            (contentType === "image/jpeg" &&
              file.length >= 3 &&
              file[0] === 255 &&
              file[1] === 216 &&
              file[2] === 255));
        const originalName = String(request.get("x-certificate-name") ?? "");
        const skill = String(request.get("x-certificate-skill") ?? "").trim();
        const name = path
          .basename(originalName.replaceAll("\\", "/"))
          .replace(/[\u0000-\u001f\u007f]/g, "") // eslint-disable-line no-control-regex -- strip control chars from uploaded filenames
          .trim();
        if (
          !validFile ||
          !name ||
          name.length > 180 ||
          !skill ||
          skill.length > 80 ||
          !employee.skills?.some(
            (item) =>
              item.name.toLocaleLowerCase() === skill.toLocaleLowerCase(),
          )
        ) {
          response.status(400).json({
            error:
              "Choose a listed skill and upload a valid PDF, PNG, or JPEG certificate (up to 5 MB).",
          });
          return;
        }

        const certificate = {
          id: randomBytes(16).toString("hex"),
          name,
          type: contentType,
          skill,
          uploadedAt: new Date().toISOString(),
        };
        const certificateDirectory = `${storePath}.certificates`;
        mkdirSync(certificateDirectory, { recursive: true });
        writeFileSync(path.join(certificateDirectory, certificate.id), file, {
          mode: 0o600,
        });
        employee.certificates = [...(employee.certificates ?? []), certificate];
        employee.updatedAt = new Date().toISOString();
        writeStore(storePath, store);
        response.status(201).json({ certificate });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/employees/:employeeId/certificates/:certificateId",
    requireAuth,
    (request, response, next) => {
      try {
        const store = readStore(storePath);
        const user = request.authUser;
        const workspace =
          user.accountRole === "Employee"
            ? store.workspaces[user.managerId]
            : store.workspaces[user.id];
        const employee = workspace?.employees.find(
          (item) => item.id === request.params.employeeId,
        );
        if (
          !employee ||
          (user.accountRole === "Employee" && user.employeeId !== employee.id)
        ) {
          response.status(404).json({ error: "Certificate not found." });
          return;
        }
        const certificate = (employee.certificates ?? []).find(
          (item) => item.id === request.params.certificateId,
        );
        if (!certificate) {
          response.status(404).json({ error: "Certificate not found." });
          return;
        }
        const certificatePath = path.join(
          `${storePath}.certificates`,
          certificate.id,
        );
        response.type(certificate.type);
        response.set(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(certificate.name)}`,
        );
        response.send(readFileSync(certificatePath));
      } catch (error) {
        next(error);
      }
    },
  );

  app.put("/api/workspace", requireAuth, (request, response, next) => {
    try {
      const workspace = normalizeWorkspace(request.body);
      if (!workspace) {
        response.status(400).json({ error: "Workspace data is invalid." });
        return;
      }
      const store = readStore(storePath);
      if (request.authUser.accountRole === "Employee") {
        const managerWorkspace = store.workspaces[request.authUser.managerId];
        const employee = managerWorkspace?.employees.find(
          (item) => item.id === request.authUser.employeeId,
        );
        const submittedEmployee = workspace.employees.find(
          (item) => item.id === request.authUser.employeeId,
        );
        const skills = normalizeSkills(submittedEmployee?.skills);
        if (!employee || !submittedEmployee || !skills) {
          response
            .status(403)
            .json({ error: "Your employee profile cannot be updated." });
          return;
        }
        employee.skills = skills;
        employee.updatedAt = new Date().toISOString();
      } else {
        store.workspaces[request.authUser.id] = workspace;
      }
      writeStore(storePath, store);
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error.type === "entity.too.large") {
      response.status(413).json({ error: "Workspace data is too large." });
      return;
    }
    console.error(error);
    response
      .status(500)
      .json({ error: "The server could not complete the request." });
  });

  if (serveClient) {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (request, response) => {
      if (request.path.startsWith("/api/")) {
        response.status(404).json({ error: "API route not found." });
        return;
      }
      const indexPath = path.join(distPath, "index.html");
      if (existsSync(indexPath)) response.sendFile(indexPath);
      else
        response
          .status(404)
          .send("Build the frontend first with npm run build.");
    });
  }

  return app;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, () => {
    console.log(`SkillMatch server listening on http://localhost:${port}`);
  });
}
