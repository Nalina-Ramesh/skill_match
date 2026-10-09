export const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];
export const levelValue = (value) =>
  typeof value === "number" ? value : levels.indexOf(value) + 1;
export const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase();
export function workload(state, employee) {
  const assignments = Array.isArray(state?.assignments)
    ? state.assignments
    : [];
  const projects = Array.isArray(state?.projects) ? state.projects : [];
  const employeeId = employee?.id;
  const assigned = employeeId
    ? assignments
        .filter(
          (a) =>
            a?.status === "Active" &&
            a.employeeId === employeeId &&
            projects.some(
              (p) => p?.id === a.projectId && p.status !== "Completed",
            ),
        )
        .reduce((sum, a) => sum + (Number(a.commitment) || 0), 0)
    : 0;
  const capacity = Number(employee?.capacity) || 0;
  return {
    assigned,
    capacity,
    remaining: Math.max(0, capacity - assigned),
    utilization:
      capacity > 0 ? Math.round((assigned / capacity) * 1000) / 10 : 0,
  };
}
export function availability(state, employee) {
  if (
    employee.explicitAvailability === "Unavailable" ||
    employee.status !== "Active" ||
    employee.capacity <= 0
  )
    return "Unavailable";
  const w = workload(state, employee);
  if (w.remaining <= 0) return "Fully Allocated";
  return w.assigned > 0 ? "Partially Allocated" : "Available";
}
export function matchSkills(required = [], skills = []) {
  if (!required.length)
    return { score: null, matched: [], below: [], missing: [] };
  const map = new Map(
    skills.map((s) => [normalize(s.name), levelValue(s.level)]),
  );
  let weighted = 0,
    weights = 0;
  const matched = [],
    below = [],
    missing = [];
  for (const req of required) {
    const weight = Math.max(0, Number(req.weight) || 1),
      need = levelValue(req.level),
      have = map.get(normalize(req.name));
    weights += weight;
    if (!have) {
      missing.push(req.name);
      continue;
    }
    const score = Math.min(1, have / need);
    weighted += weight * score;
    if (have >= need) matched.push(req.name);
    else below.push(req.name);
  }
  return {
    score: weights ? Math.round((weighted / weights) * 1000) / 10 : 0,
    matched,
    below,
    missing,
  };
}
export function recommendations(state, project) {
  const out = state.employees
    .filter(
      (e) =>
        e.status === "Active" &&
        e.explicitAvailability !== "Unavailable" &&
        !state.assignments.some(
          (a) =>
            a.projectId === project.id &&
            a.employeeId === e.id &&
            a.status === "Active",
        ),
    )
    .map((employee) => {
      const w = workload(state, employee),
        commitment = Number(project.commitment || 25),
        projected = w.assigned + commitment;
      return {
        employee,
        work: w,
        commitment,
        projected,
        projectedUtilization: employee.capacity
          ? Math.round((projected / employee.capacity) * 1000) / 10
          : 0,
        match: matchSkills(project.requiredSkills, employee.skills),
      };
    })
    .filter((c) => c.work.capacity > 0 && c.projected <= c.work.capacity)
    .sort(
      (a, b) =>
        (b.match.score ?? -1) - (a.match.score ?? -1) ||
        a.projectedUtilization - b.projectedUtilization ||
        b.employee.experience - a.employee.experience ||
        a.employee.name.localeCompare(b.employee.name),
    );
  return out;
}
export function validateEmployee(form, employees, currentId) {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Name is required";
  if (!/^\S+@\S+\.\S+$/.test(form.email || ""))
    errors.email = "Enter a valid email";
  if (
    employees.some(
      (e) => e.id !== currentId && normalize(e.email) === normalize(form.email),
    )
  )
    errors.email = "Email must be unique";
  if (!form.department?.trim()) errors.department = "Department is required";
  if (!form.role?.trim()) errors.role = "Role is required";
  if (Number(form.experience) < 0)
    errors.experience = "Experience cannot be negative";
  if (Number(form.capacity) < 0 || Number(form.capacity) > 100)
    errors.capacity = "Capacity must be 0–100";
  return errors;
}
export function validateProject(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Project name is required";
  if (!form.client?.trim()) errors.client = "Client or department is required";
  if (Number(form.teamSize) < 1) errors.teamSize = "Team size must be positive";
  if (new Date(form.deadline) < new Date(form.startDate))
    errors.deadline = "Deadline cannot precede start date";
  if (Number(form.commitment) <= 0 || Number(form.commitment) > 100)
    errors.commitment = "Commitment must be 1–100%";
  return errors;
}
export function csv(rows) {
  const cell = (value) => {
    let s = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
