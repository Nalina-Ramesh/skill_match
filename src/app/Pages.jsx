import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import {
  availability,
  csv,
  levels,
  matchSkills,
  recommendations,
  workload,
} from "../utils/domain.js";

const fmtDate = (s) =>
  s
    ? new Date(`${s}T00:00:00`).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
function Badge({ children, tone = "" }) {
  return (
    <span
      className={`badge ${tone || String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {children}
    </span>
  );
}
function PageHead({ title, sub, action }) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({ label, value, change, icon: Icon, tone = "blue", onClick }) {
  return (
    <button
      className={`stat-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="stat-label">{label}</div>
      <strong>{value}</strong>
      <small>{change}</small>
    </button>
  );
}
function Empty({
  title = "Nothing here yet",
  text = "Try changing your filters or add a record.",
}) {
  return (
    <div className="empty">
      <div className="empty-icon">⌕</div>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            <p>Fields marked * are required</p>
          </div>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function EmployeeForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, skills: initial.skills || [] }
      : {
          name: "",
          email: "",
          department: "Engineering",
          role: "Software Engineer",
          experience: 0,
          capacity: 100,
          explicitAvailability: "Available",
          status: "Active",
          skills: [],
        },
  );
  const [skill, setSkill] = useState(""),
    [level, setLevel] = useState("Intermediate");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title={initial ? "Edit employee" : "Add employee"} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            experience: parseInt(form.experience, 10) || 0,
            capacity: parseInt(form.capacity, 10) || 0,
          });
        }}
      >
        {field("Full name*", "name", form, set)}
        {field("Email address*", "email", form, set, "email")}
        <label>
          Department*
          <input
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            required
          />
        </label>
        <label>
          Job role*
          <input
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            required
          />
        </label>
        <label>
          Years of experience
          <input
            type="number"
            min="0"
            step="1"
            value={form.experience}
            onChange={(e) => set("experience", e.target.value)}
          />
        </label>
        <label>
          Maximum capacity (%)
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={form.capacity}
            onChange={(e) => set("capacity", e.target.value)}
          />
        </label>
        <label>
          Availability
          <select
            value={form.explicitAvailability}
            onChange={(e) => set("explicitAvailability", e.target.value)}
          >
            <option>Available</option>
            <option>Unavailable</option>
          </select>
        </label>
        <label>
          Employment status
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>
        <div className="full skill-edit">
          <b>Skills and proficiency</b>
          <div className="inline-form">
            <input
              placeholder="Skill name"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button
              className="btn btn-light"
              type="button"
              onClick={() => {
                if (!skill.trim()) return;
                const exists = form.skills.some(
                  (x) => x.name.toLowerCase() === skill.trim().toLowerCase(),
                );
                if (exists) return;
                set("skills", [...form.skills, { name: skill.trim(), level }]);
                setSkill("");
              }}
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div className="skill-list">
            {form.skills.map((s, i) => (
              <span className="skill-chip" key={s.name}>
                {s.name}
                <select
                  aria-label={`${s.name} proficiency`}
                  value={s.level}
                  onChange={(e) =>
                    set(
                      "skills",
                      form.skills.map((x) =>
                        x.name === s.name ? { ...x, level: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {levels.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove ${s.name}`}
                  onClick={() =>
                    set(
                      "skills",
                      form.skills.filter((_, n) => n !== i),
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-actions full">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Save employee</button>
        </div>
      </form>
    </Modal>
  );
}
function field(label, key, form, set, type = "text") {
  return (
    <label>
      {label}
      <input
        required={label.includes("*")}
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
}
function ProjectForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, requiredSkills: initial.requiredSkills || [] }
      : {
          name: "",
          description: "",
          client: "Engineering",
          teamSize: 3,
          priority: "Medium",
          status: "Planning",
          commitment: 25,
          startDate: new Date().toISOString().slice(0, 10),
          deadline: "",
          requiredSkills: [],
        },
  );
  const [skill, setSkill] = useState(""),
    [level, setLevel] = useState("Intermediate");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      title={initial ? "Edit project" : "Create project"}
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            teamSize: parseInt(form.teamSize, 10) || 1,
            commitment: Number(form.commitment),
          });
        }}
      >
        {field("Project name*", "name", form, set)}
        {field("Client or department*", "client", form, set)}
        <label className="full">
          Description
          <textarea
            rows="2"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <label>
          Target team size
          <input
            type="number"
            min="1"
            step="1"
            value={form.teamSize}
            onChange={(e) => set("teamSize", e.target.value)}
          />
        </label>
        <label>
          Workload commitment (%)
          <input
            type="number"
            min="1"
            max="100"
            value={form.commitment}
            onChange={(e) => set("commitment", e.target.value)}
          />
        </label>
        <label>
          Priority
          <select
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            {["Low", "Medium", "High", "Critical"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {["Planning", "Active", "On Hold", "Completed"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Start date
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            required
          />
        </label>
        <label>
          Deadline
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            required
          />
        </label>
        <div className="full skill-edit">
          <b>Required skills</b>
          <div className="inline-form">
            <input
              placeholder="Skill name"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                if (
                  skill.trim() &&
                  !form.requiredSkills.some(
                    (x) => x.name.toLowerCase() === skill.trim().toLowerCase(),
                  )
                ) {
                  set("requiredSkills", [
                    ...form.requiredSkills,
                    { name: skill.trim(), level, weight: 1 },
                  ]);
                  setSkill("");
                }
              }}
            >
              <Plus size={15} /> Add
            </button>
          </div>
          <div className="skill-list">
            {form.requiredSkills.map((s) => (
              <span className="skill-chip" key={s.name}>
                {s.name} · {s.level}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "requiredSkills",
                      form.requiredSkills.filter((x) => x.name !== s.name),
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-actions full">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Save project</button>
        </div>
      </form>
    </Modal>
  );
}

export function Dashboard() {
  const { state, reset } = useApp(),
    nav = useNavigate();
  const active = state.projects.filter((p) => p.status === "Active"),
    activePeople = state.employees.filter((e) => e.status === "Active"),
    available = activePeople.filter(
      (e) =>
        availability(state, e) === "Available" ||
        availability(state, e) === "Partially Allocated",
    ),
    avg = activePeople.length
      ? Math.round(
          activePeople.reduce(
            (n, e) => n + (workload(state, e)?.utilization || 0),
            0,
          ) / activePeople.length,
        )
      : 0;
  const dept = Object.entries(
    state.employees.reduce(
      (a, e) => ((a[e.department] = (a[e.department] || 0) + 1), a),
      {},
    ),
  ).map(([name, value]) => ({ id: name, name, value }));
  const util = state.employees.map((e) => ({
    id: e.id,
    name: e.name.split(" ")[0],
    utilization: workload(state, e)?.utilization || 0,
  }));
  const staffing = state.projects
    .filter((p) => p.status !== "Completed")
    .map((p) => ({
      id: p.id,
      name: p.name,
      assigned: state.assignments.filter(
        (a) => a.projectId === p.id && a.status === "Active",
      ).length,
      target: p.teamSize,
    }));
  const skills = Object.entries(
    state.employees
      .filter((e) => e.status === "Active")
      .flatMap((e) => e.skills.map((s) => s.name))
      .reduce((a, n) => ((a[n] = (a[n] || 0) + 1), a), {}),
  )
    .map(([name, value]) => ({ id: name, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
  const open = state.projects.filter(
    (p) =>
      p.status !== "Completed" &&
      state.assignments.filter(
        (a) => a.projectId === p.id && a.status === "Active",
      ).length < p.teamSize,
  );
  const risky = activePeople.filter(
    (e) => workload(state, e).utilization >= 80,
  );
  const uncovered = state.projects.filter(
    (p) =>
      p.status === "Active" &&
      p.requiredSkills.some(
        (r) =>
          !state.employees.some(
            (e) =>
              e.status === "Active" &&
              e.skills.some(
                (s) =>
                  s.name.toLowerCase() === r.name.toLowerCase() &&
                  levels.indexOf(s.level) >= levels.indexOf(r.level),
              ),
          ),
      ),
  );
  return (
    <>
      <PageHead
        title="Good morning, manager"
        sub="Here's what's happening across your people and projects today."
        action={
          <button
            className="btn btn-light"
            onClick={() =>
              window.confirm(
                "Clear all workspace data? This removes employees, projects, assignments, and activity history from this browser.",
              ) && reset()
            }
          >
            Clear workspace
          </button>
        }
      />
      <div className="stat-grid">
        <Stat
          label="Total employees"
          value={state.employees.length}
          change="Across all departments"
          icon={Users}
          onClick={() => nav("/employees")}
        />
        <Stat
          label="Active projects"
          value={active.length}
          change={`${state.projects.length} projects in portfolio`}
          icon={BriefcaseBusiness}
          tone="purple"
          onClick={() => nav("/projects")}
        />
        <Stat
          label="Available employees"
          value={available.length}
          change="Ready for new assignments"
          icon={ArrowUpRight}
          tone="green"
          onClick={() => nav("/employees")}
        />
        <Stat
          label="Average utilization"
          value={`${avg}%`}
          change="Active employees only"
          icon={ChartNoAxesCombined}
          tone="orange"
          onClick={() => nav("/reports")}
        />
      </div>
      <div className="summary-grid">
        <button onClick={() => nav("/projects")}>
          <b>{open.length}</b>
          <span>Projects with open positions</span>
          <ArrowDownRight size={17} />
        </button>
        <button onClick={() => nav("/employees")}>
          <b>{risky.length}</b>
          <span>Employees at workload warning</span>
          <ArrowDownRight size={17} />
        </button>
        <button onClick={() => nav("/projects")}>
          <b>{uncovered.length}</b>
          <span>Projects with skill coverage gaps</span>
          <ArrowDownRight size={17} />
        </button>
        <button onClick={() => nav("/employees")}>
          <b>{available.length}</b>
          <span>Employees ready for work</span>
          <ArrowDownRight size={17} />
        </button>
      </div>
      <div className="charts-grid">
        <ChartCard title="Team by department" subtitle="Employee distribution">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={dept}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={3}
              >
                {dept.map((item, i) => (
                  <Cell
                    key={item.id}
                    fill={
                      ["#2563EB", "#7C3AED", "#0F9F78", "#F59E0B", "#E45A74"][
                        i % 5
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <LegendSimple items={dept} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Employee utilization"
          subtitle="Current workload across the team"
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={util} margin={{ left: -22, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar
                dataKey="utilization"
                fill="#2563EB"
                radius={[5, 5, 0, 0]}
                onClick={(d) => nav(`/employees/${d?.payload?.id || ""}`)}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Project staffing"
          subtitle="Assigned team compared with target"
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={staffing} margin={{ left: -22, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="assigned"
                name="Assigned"
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="target"
                name="Target"
                fill="#CBD5E1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Skill coverage" subtitle="Active employees by skill">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={skills}
              layout="vertical"
              margin={{ left: 4, right: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={82}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="value"
                name="Employees"
                fill="#0F9F78"
                radius={[0, 5, 5, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="lower-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Recent activity</h3>
              <p>Latest changes in your workspace</p>
            </div>
            <Link to="/assignments">View all</Link>
          </div>
          {state.history.slice(0, 5).map((h) => (
            <div className="activity-row" key={h.id}>
              <span className="activity-dot" />
              <div>
                <b>{h.description}</b>
                <small>{new Date(h.timestamp).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Projects needing attention</h3>
              <p>Open roles and skill gaps</p>
            </div>
            <Link to="/projects">All projects</Link>
          </div>
          {open.slice(0, 4).map((p) => (
            <Link className="attention-row" to={`/projects/${p.id}`} key={p.id}>
              <span>
                <b>{p.name}</b>
                <small>
                  {p.client} · due {fmtDate(p.deadline)}
                </small>
              </span>
              <Badge tone="warning">
                {p.teamSize -
                  state.assignments.filter(
                    (a) => a.projectId === p.id && a.status === "Active",
                  ).length}{" "}
                open
              </Badge>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
function LegendSimple({ items }) {
  return (
    <div className="legend-simple">
      {items.map((x, i) => (
        <span key={x.name}>
          <i
            style={{
              background: [
                "#2563EB",
                "#7C3AED",
                "#0F9F78",
                "#F59E0B",
                "#E45A74",
              ][i % 5],
            }}
          />
          {x.name} <b>{x.value}</b>
        </span>
      ))}
    </div>
  );
}
function ChartCard({ title, subtitle, children }) {
  return (
    <section className="panel chart-card">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="chart-menu">···</span>
      </div>
      {children}
    </section>
  );
}

export function Employees() {
  const { state, addEmployee, updateEmployee, deleteEmployee } = useApp();
  const [q, setQ] = useState(""),
    [dept, setDept] = useState("All departments"),
    [skill, setSkill] = useState("All skills"),
    [avail, setAvail] = useState("All availability"),
    [status, setStatus] = useState("Active"),
    [sort, setSort] = useState("name"),
    [modal, setModal] = useState(null);
  const depts = [...new Set(state.employees.map((e) => e.department))],
    skills = [
      ...new Set(state.employees.flatMap((e) => e.skills.map((s) => s.name))),
    ];
  const list = state.employees
    .filter((e) => {
      const text =
        `${e.name} ${e.email} ${e.role} ${e.skills.map((s) => s.name).join(" ")}`.toLowerCase();
      return (
        (!q || text.includes(q.trim().toLowerCase())) &&
        (dept === "All departments" || e.department === dept) &&
        (skill === "All skills" || e.skills.some((s) => s.name === skill)) &&
        (avail === "All availability" || availability(state, e) === avail) &&
        (status === "All statuses" || e.status === status)
      );
    })
    .sort((a, b) =>
      sort === "experience"
        ? b.experience - a.experience
        : sort === "utilization"
          ? workload(state, b).utilization - workload(state, a).utilization
          : sort === "department"
            ? a.department.localeCompare(b.department)
            : a.name.localeCompare(b.name),
    );
  return (
    <>
      <PageHead
        title="Employee directory"
        sub={`${state.employees.length} people across your organization`}
        action={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={16} /> Add employee
          </button>
        }
      />
      <section className="panel directory-panel">
        <div className="filters">
          <div className="searchbox">
            <Search size={17} />
            <input
              aria-label="Search employees"
              placeholder="Search name, role, email or skill"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Department filter"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option>All departments</option>
            {depts.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Skill filter"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          >
            <option>All skills</option>
            {skills.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Availability filter"
            value={avail}
            onChange={(e) => setAvail(e.target.value)}
          >
            <option>All availability</option>
            {[
              "Available",
              "Partially Allocated",
              "Fully Allocated",
              "Unavailable",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Employment status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select
            aria-label="Sort employees"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="experience">Experience</option>
            <option value="utilization">Utilization</option>
            <option value="department">Department</option>
          </select>
          <button
            className="text-btn"
            onClick={() => {
              setQ("");
              setDept("All departments");
              setSkill("All skills");
              setAvail("All availability");
              setStatus("All statuses");
              setSort("name");
            }}
          >
            <SlidersHorizontal size={15} /> Clear
          </button>
        </div>
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>DEPARTMENT</th>
                  <th>SKILLS</th>
                  <th>UTILIZATION</th>
                  <th>AVAILABILITY</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const w = workload(state, e);
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link className="person-cell" to={`/employees/${e.id}`}>
                          <span className="person-avatar">
                            {initials(e.name)}
                          </span>
                          <span>
                            <b>{e.name}</b>
                            <small>
                              {e.role} · {e.experience} yrs
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{e.department}</td>
                      <td>
                        <div className="table-skills">
                          {e.skills.slice(0, 3).map((s) => (
                            <span key={s.name}>{s.name}</span>
                          ))}
                          {e.skills.length > 3 && (
                            <span>+{e.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="progress-line">
                          <span
                            style={{
                              width: `${Math.min(100, w.utilization)}%`,
                            }}
                          />
                          <b>{w.utilization}%</b>
                        </div>
                      </td>
                      <td>
                        <Badge>{availability(state, e)}</Badge>
                      </td>
                      <td>
                        <Badge>{e.status}</Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/employees/${e.id}`}>View</Link>
                          <button onClick={() => setModal(e)}>Edit</button>
                          <button
                            className="danger-text"
                            onClick={() =>
                              window.confirm(
                                `Delete ${e.name} and close their assignments? This cannot be undone.`,
                              ) && deleteEmployee(e.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No employees match"
            text="Adjust your search or filters to find employees."
          />
        )}
      </section>
      {modal && (
        <EmployeeForm
          initial={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={(f) => {
            const ok = modal.id ? updateEmployee(modal.id, f) : addEmployee(f);
            if (ok) setModal(null);
          }}
        />
      )}
    </>
  );
}
const initials = (name) =>
  name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
export function EmployeeProfile() {
  const { id: employeeId } = useParams(),
    { state, updateEmployee, deleteEmployee, unassign } = useApp(),
    [modal, setModal] = useState(false),
    nav = useNavigate();
  const e = state.employees.find((x) => x.id === employeeId);
  if (!e)
    return (
      <>
        <PageHead
          title="Employee not found"
          sub="This employee may have been removed."
        />
        <Link className="btn btn-primary" to="/employees">
          Back to directory
        </Link>
      </>
    );
  const w = workload(state, e),
    assignments = state.assignments.filter((a) => a.employeeId === e.id),
    active = assignments.filter((a) => a.status === "Active");
  return (
    <>
      <PageHead
        title={e.name}
        sub={`${e.role} · ${e.department}`}
        action={
          <>
            <button className="btn btn-light" onClick={() => setModal(true)}>
              Edit profile
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                window.confirm(
                  `Delete ${e.name} and close their assignments?`,
                ) && (deleteEmployee(e.id), nav("/employees"))
              }
            >
              Delete
            </button>
          </>
        }
      />
      <div className="profile-grid">
        <section className="panel profile-intro">
          <span className="profile-avatar">{initials(e.name)}</span>
          <div>
            <h2>{e.name}</h2>
            <p>{e.role}</p>
            <div className="badge-row">
              <Badge>{e.department}</Badge>
              <Badge>{e.status}</Badge>
              <Badge>{availability(state, e)}</Badge>
            </div>
          </div>
        </section>
        <Stat
          label="Utilization"
          value={`${w.utilization}%`}
          change={`${w.assigned}% assigned workload`}
          icon={ChartNoAxesCombined}
        />
        <Stat
          label="Remaining capacity"
          value={`${w.remaining}%`}
          change={`of ${w.capacity}% maximum`}
          icon={ArrowUpRight}
          tone="green"
        />
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Skills</h3>
              <p>Experience: {e.experience} years</p>
            </div>
            <button className="btn btn-light" onClick={() => setModal(true)}>
              Manage skills
            </button>
          </div>
          <div className="skill-list large">
            {e.skills.map((s) => (
              <span key={s.name} className="skill-chip">
                {s.name}
                <b>{s.level}</b>
              </span>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Current projects</h3>
              <p>{active.length} active allocations</p>
            </div>
          </div>
          {active.length ? (
            active.map((a) => {
              const p = state.projects.find((x) => x.id === a.projectId);
              return (
                <div className="assignment-line" key={a.id}>
                  <Link to={`/projects/${a.projectId}`}>
                    {p?.name || "Removed project"}
                  </Link>
                  <span>{a.commitment}% workload</span>
                  <button
                    className="danger-text"
                    onClick={() =>
                      window.confirm(
                        "Remove this employee from the project?",
                      ) && unassign(a.id)
                    }
                  >
                    Remove
                  </button>
                </div>
              );
            })
          ) : (
            <Empty title="No active projects" />
          )}
        </section>
        <section className="panel full-panel">
          <div className="panel-head">
            <div>
              <h3>Allocation history</h3>
              <p>Recent assignments and management events</p>
            </div>
          </div>
          {state.history
            .filter((h) => h.employeeId === e.id)
            .slice(0, 8)
            .map((h) => (
              <div className="activity-row" key={h.id}>
                <span className="activity-dot" />
                <div>
                  <b>{h.description}</b>
                  <small>{new Date(h.timestamp).toLocaleString()}</small>
                </div>
              </div>
            ))}
          {!state.history.some((h) => h.employeeId === e.id) && (
            <Empty title="No employee history yet" />
          )}
        </section>
      </div>
      {modal && (
        <EmployeeForm
          initial={e}
          onClose={() => setModal(false)}
          onSave={(f) => {
            if (updateEmployee(e.id, f)) setModal(false);
          }}
        />
      )}
    </>
  );
}

export function Projects() {
  const { state, addProject, updateProject, deleteProject } = useApp();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("All statuses"),
    [priority, setPriority] = useState("All priorities"),
    [staff, setStaff] = useState("Any staffing"),
    [sort, setSort] = useState("deadline"),
    [modal, setModal] = useState(null);
  const count = (p) =>
    state.assignments.filter(
      (a) => a.projectId === p.id && a.status === "Active",
    ).length;
  const list = state.projects
    .filter(
      (p) =>
        (!q ||
          `${p.name} ${p.description} ${p.client}`
            .toLowerCase()
            .includes(q.trim().toLowerCase())) &&
        (status === "All statuses" || p.status === status) &&
        (priority === "All priorities" || p.priority === priority) &&
        (staff === "Any staffing" ||
          (staff === "Understaffed"
            ? count(p) < p.teamSize
            : count(p) >= p.teamSize)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "priority"
          ? ["Low", "Medium", "High", "Critical"].indexOf(b.priority) -
            ["Low", "Medium", "High", "Critical"].indexOf(a.priority)
          : sort === "staffing"
            ? count(a) / a.teamSize - count(b) / b.teamSize
            : a.deadline.localeCompare(b.deadline),
    );
  return (
    <>
      <PageHead
        title="Project portfolio"
        sub={`${state.projects.length} projects · ${state.projects.filter((p) => p.status === "Active").length} active`}
        action={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={16} /> Create project
          </button>
        }
      />
      <section className="panel directory-panel">
        <div className="filters">
          <div className="searchbox">
            <Search size={17} />
            <input
              placeholder="Search projects, description or client"
              aria-label="Search projects"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Project status filter"
          >
            <option>All statuses</option>
            {["Planning", "Active", "On Hold", "Completed"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Priority filter"
          >
            <option>All priorities</option>
            {["Low", "Medium", "High", "Critical"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            aria-label="Staffing filter"
          >
            <option>Any staffing</option>
            <option>Understaffed</option>
            <option>Fully staffed</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort projects"
          >
            <option value="deadline">Deadline</option>
            <option value="name">Name</option>
            <option value="priority">Priority</option>
            <option value="staffing">Staffing</option>
          </select>
          <button
            className="text-btn"
            onClick={() => {
              setQ("");
              setStatus("All statuses");
              setPriority("All priorities");
              setStaff("Any staffing");
            }}
          >
            Clear filters
          </button>
        </div>
        {list.length ? (
          <div className="project-grid">
            {list.map((p) => {
              const assigned = count(p),
                pct = Math.min(100, Math.round((assigned / p.teamSize) * 100));
              return (
                <article className="project-card" key={p.id}>
                  <div className="project-title">
                    <div className="project-symbol">
                      <BriefcaseBusiness size={18} />
                    </div>
                    <button
                      className="more-btn"
                      onClick={() => setModal(p)}
                      aria-label={`Edit ${p.name}`}
                    >
                      ···
                    </button>
                  </div>
                  <Link className="project-name" to={`/projects/${p.id}`}>
                    {p.name}
                  </Link>
                  <p>{p.description || p.client}</p>
                  <div className="badge-row">
                    <Badge>{p.status}</Badge>
                    <Badge
                      tone={
                        p.priority === "Critical" || p.priority === "High"
                          ? "priority-high"
                          : "priority-normal"
                      }
                    >
                      {p.priority} priority
                    </Badge>
                  </div>
                  <div className="project-staff">
                    <div>
                      <b>Team staffing</b>
                      <span>
                        {assigned} / {p.teamSize}
                      </span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <small>
                      {assigned < p.teamSize
                        ? `${p.teamSize - assigned} open position${p.teamSize - assigned === 1 ? "" : "s"}`
                        : "Target team size reached"}
                    </small>
                  </div>
                  <div className="project-foot">
                    <span>{p.client}</span>
                    <span>Due {fmtDate(p.deadline)}</span>
                  </div>
                  <div className="row-actions">
                    <Link to={`/projects/${p.id}`}>View project</Link>
                    <button onClick={() => setModal(p)}>Edit</button>
                    <button
                      className="danger-text"
                      onClick={() =>
                        window.confirm(
                          `Delete ${p.name} and close related assignments?`,
                        ) && deleteProject(p.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No projects match"
            text="Change the filters or create a project."
          />
        )}
      </section>
      {modal && (
        <ProjectForm
          initial={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={(f) => {
            const ok = modal.id ? updateProject(modal.id, f) : addProject(f);
            if (ok) setModal(null);
          }}
        />
      )}
    </>
  );
}

export function ProjectDetail() {
  const { id: projectId } = useParams(),
    { state, assign, updateProject, deleteProject } = useApp();
  const [sort, setSort] = useState("score"),
    [min, setMin] = useState(0),
    [modal, setModal] = useState(false);
  const p = state.projects.find((x) => x.id === projectId);
  if (!p)
    return (
      <>
        <PageHead
          title="Project not found"
          sub="This project may have been removed."
        />
        <Link className="btn btn-primary" to="/projects">
          Back to projects
        </Link>
      </>
    );
  const team = state.assignments.filter(
      (a) => a.projectId === p.id && a.status === "Active",
    ),
    candidates = recommendations(state, p)
      .filter((c) => c.match.score === null || c.match.score >= Number(min))
      .sort((a, b) =>
        sort === "utilization"
          ? a.projectedUtilization - b.projectedUtilization
          : sort === "experience"
            ? b.employee.experience - a.employee.experience
            : (b.match.score ?? -1) - (a.match.score ?? -1),
      ),
    assigned = new Set(team.map((a) => a.employeeId));
  return (
    <>
      <PageHead
        title={p.name}
        sub={`${p.client} · Deadline ${fmtDate(p.deadline)}`}
        action={
          <>
            <button className="btn btn-light" onClick={() => setModal(true)}>
              Edit project
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                window.confirm(
                  `Delete ${p.name} and close all related assignments?`,
                ) && deleteProject(p.id)
              }
            >
              Delete
            </button>
          </>
        }
      />
      <div className="detail-grid">
        <section className="panel project-overview">
          <div className="badge-row">
            <Badge>{p.status}</Badge>
            <Badge tone="priority-high">{p.priority} priority</Badge>
          </div>
          <p>{p.description || "No project description has been added."}</p>
          <div className="project-facts">
            <div>
              <small>CLIENT / DEPARTMENT</small>
              <b>{p.client}</b>
            </div>
            <div>
              <small>TEAM SIZE</small>
              <b>
                {team.length} / {p.teamSize}
              </b>
            </div>
            <div>
              <small>COMMITMENT</small>
              <b>{p.commitment}% per person</b>
            </div>
            <div>
              <small>PROJECT WINDOW</small>
              <b>
                {fmtDate(p.startDate)} – {fmtDate(p.deadline)}
              </b>
            </div>
          </div>
          <h3>Required skills</h3>
          <div className="skill-list">
            {p.requiredSkills.length ? (
              p.requiredSkills.map((s) => (
                <span key={s.name} className="skill-chip">
                  {s.name}
                  <b>{s.level}</b>
                </span>
              ))
            ) : (
              <span className="muted">No skills specified</span>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Project team</h3>
              <p>
                {team.length} assigned · {Math.max(0, p.teamSize - team.length)}{" "}
                open positions
              </p>
            </div>
          </div>
          {team.length ? (
            team.map((a) => {
              const e = state.employees.find((x) => x.id === a.employeeId);
              return (
                <div className="assignment-line" key={a.id}>
                  <Link to={`/employees/${a.employeeId}`}>
                    {e?.name || "Removed employee"}
                  </Link>
                  <span>
                    {a.commitment}% ·{" "}
                    {e ? workload(state, e).utilization + "% utilization" : ""}
                  </span>
                </div>
              );
            })
          ) : (
            <Empty title="No team members yet" />
          )}
        </section>
      </div>
      <section className="panel candidate-panel">
        <div className="panel-head">
          <div>
            <h3>Recommended candidates</h3>
            <p>
              Eligible employees ranked by explainable skill fit, projected
              utilization, and experience.
            </p>
          </div>
          <div className="filter-mini">
            <label>
              Minimum match
              <select value={min} onChange={(e) => setMin(e.target.value)}>
                <option value="0">Any score</option>
                <option value="50">50%+</option>
                <option value="75">75%+</option>
                <option value="90">90%+</option>
              </select>
            </label>
            <label>
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="score">Match score</option>
                <option value="utilization">Projected utilization</option>
                <option value="experience">Experience</option>
              </select>
            </label>
          </div>
        </div>
        {p.status === "Completed" ? (
          <Empty
            title="Project completed"
            text="New assignments are disabled for completed projects."
          />
        ) : candidates.length ? (
          <div className="table-wrap">
            <table className="candidate-table">
              <thead>
                <tr>
                  <th>CANDIDATE</th>
                  <th>SKILL MATCH</th>
                  <th>SKILL BREAKDOWN</th>
                  <th>WORKLOAD</th>
                  <th>PROJECTED</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c.employee.id}>
                    <td>
                      <Link
                        className="person-cell"
                        to={`/employees/${c.employee.id}`}
                      >
                        <span className="rank">{i + 1}</span>
                        <span>
                          <b>{c.employee.name}</b>
                          <small>
                            {c.employee.role} · {c.employee.department} ·{" "}
                            {c.employee.experience} yrs
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      {c.match.score === null ? (
                        <Badge>N/A</Badge>
                      ) : (
                        <span className="match-score">{c.match.score}%</span>
                      )}
                    </td>
                    <td>
                      <div className="breakdown">
                        {c.match.matched.length > 0 && (
                          <span className="matched">
                            ✓ {c.match.matched.join(", ")}
                          </span>
                        )}
                        {c.match.below.length > 0 && (
                          <span className="below">
                            ↗ {c.match.below.join(", ")}
                          </span>
                        )}
                        {c.match.missing.length > 0 && (
                          <span className="missing">
                            × {c.match.missing.join(", ")}
                          </span>
                        )}
                        {c.match.score === null && (
                          <span className="muted">No skills required</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {c.work.assigned}%{" "}
                      <small> / {c.work.capacity}% cap.</small>
                    </td>
                    <td>
                      <b>{c.projected}%</b>
                      <small> · {c.projectedUtilization}% utilization</small>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={assigned.has(c.employee.id)}
                        onClick={() => assign(c.employee.id, p.id)}
                      >
                        {assigned.has(c.employee.id) ? "Assigned" : "Assign"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No eligible candidates"
            text="Candidates need enough remaining capacity and must be active, available, and not already assigned."
          />
        )}
      </section>
      {modal && (
        <ProjectForm
          initial={p}
          onClose={() => setModal(false)}
          onSave={(f) => {
            if (updateProject(p.id, f)) setModal(false);
          }}
        />
      )}
    </>
  );
}

export function Assignments() {
  const { state, unassign } = useApp();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("Active");
  const rows = state.assignments
    .filter(
      (a) =>
        (filter === "All" || a.status === filter) &&
        (() => {
          const e = state.employees.find((x) => x.id === a.employeeId),
            p = state.projects.find((x) => x.id === a.projectId);
          return (
            !q ||
            `${e?.name || ""} ${p?.name || ""}`
              .toLowerCase()
              .includes(q.trim().toLowerCase())
          );
        })(),
    )
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return (
    <>
      <PageHead
        title="Team assignments"
        sub="Review active allocations, workload commitments, and allocation history."
        action={
          <Link className="btn btn-primary" to="/projects">
            Find candidates
          </Link>
        }
      />
      <div className="stat-grid compact">
        <Stat
          label="Active assignments"
          value={state.assignments.filter((a) => a.status === "Active").length}
          change="Across all projects"
          icon={Users}
        />
        <Stat
          label="Historical records"
          value={state.assignments.filter((a) => a.status !== "Active").length}
          change="Removed allocations"
          icon={Activity}
          tone="purple"
        />
        <Stat
          label="Understaffed projects"
          value={
            state.projects.filter(
              (p) =>
                p.status !== "Completed" &&
                state.assignments.filter(
                  (a) => a.projectId === p.id && a.status === "Active",
                ).length < p.teamSize,
            ).length
          }
          change="Open team positions"
          icon={BriefcaseBusiness}
          tone="orange"
        />
      </div>
      <section className="panel directory-panel">
        <div className="filters">
          <div className="searchbox">
            <Search size={17} />
            <input
              placeholder="Search employee or project"
              aria-label="Search assignments"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Active</option>
            <option>Removed</option>
            <option>All</option>
          </select>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>PROJECT</th>
                  <th>WORKLOAD</th>
                  <th>ASSIGNED</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const e = state.employees.find((x) => x.id === a.employeeId),
                    p = state.projects.find((x) => x.id === a.projectId);
                  return (
                    <tr key={a.id}>
                      <td>
                        {e ? (
                          <Link
                            className="person-cell"
                            to={`/employees/${e.id}`}
                          >
                            <span className="person-avatar">
                              {initials(e.name)}
                            </span>
                            <span>
                              <b>{e.name}</b>
                              <small>{e.role}</small>
                            </span>
                          </Link>
                        ) : (
                          <span>Deleted employee</span>
                        )}
                      </td>
                      <td>
                        {p ? (
                          <Link to={`/projects/${p.id}`}>{p.name}</Link>
                        ) : (
                          "Deleted project"
                        )}
                      </td>
                      <td>
                        {a.commitment}%{" "}
                        <small>
                          {e
                            ? `· ${workload(state, e).utilization}% total utilization`
                            : ""}
                        </small>
                      </td>
                      <td>{new Date(a.assignedAt).toLocaleDateString()}</td>
                      <td>
                        <Badge>{a.status}</Badge>
                      </td>
                      <td>
                        {a.status === "Active" && (
                          <button
                            className="danger-text"
                            onClick={() =>
                              window.confirm(
                                "Remove this assignment and release capacity?",
                              ) && unassign(a.id)
                            }
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No assignments"
            text="Assign eligible people from a project detail page."
          />
        )}
      </section>
    </>
  );
}

function download(name, rows, notify) {
  if (rows.length <= 1) {
    notify("There is no data available for this report yet.");
    return;
  }
  const blob = new Blob(["\ufeff" + csv(rows)], {
      type: "text/csv;charset=utf-8",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  notify(`${name} downloaded`);
}
export function Reports() {
  const { state, notify } = useApp();
  const employeeRows = [
    [
      "Employee ID",
      "Employee name",
      "Department",
      "Role",
      "Employment status",
      "Maximum capacity",
      "Assigned workload",
      "Remaining capacity",
      "Utilization percentage",
      "Availability status",
    ],
    ...state.employees.map((e) => {
      const w = workload(state, e);
      return [
        e.id,
        e.name,
        e.department,
        e.role,
        e.status,
        w.capacity,
        w.assigned,
        w.remaining,
        w.utilization,
        availability(state, e),
      ];
    }),
  ];
  const projectRows = [
    [
      "Project ID",
      "Project name",
      "Status",
      "Priority",
      "Deadline",
      "Target team size",
      "Assigned team size",
      "Open positions",
      "Staffing percentage",
    ],
    ...state.projects.map((p) => {
      const n = state.assignments.filter(
        (a) => a.projectId === p.id && a.status === "Active",
      ).length;
      return [
        p.id,
        p.name,
        p.status,
        p.priority,
        p.deadline,
        p.teamSize,
        n,
        Math.max(0, p.teamSize - n),
        Math.round((n / p.teamSize) * 100),
      ];
    }),
  ];
  const allocationRows = [
    [
      "Assignment ID",
      "Employee name",
      "Project name",
      "Workload commitment",
      "Assignment timestamp",
      "Assignment status",
    ],
    ...state.assignments.map((a) => [
      a.id,
      state.employees.find((e) => e.id === a.employeeId)?.name ||
        "Deleted employee",
      state.projects.find((p) => p.id === a.projectId)?.name ||
        "Deleted project",
      a.commitment,
      a.assignedAt,
      a.status,
    ]),
  ];
  const cards = [
    [
      "Employee utilization",
      "Current employee capacity and workload",
      "employee-utilization.csv",
      employeeRows,
    ],
    [
      "Project staffing",
      "Team size and open position summary",
      "project-staffing.csv",
      projectRows,
    ],
    [
      "Allocation details",
      "Active and historical assignment records",
      "allocation-details.csv",
      allocationRows,
    ],
  ];
  return (
    <>
      <PageHead
        title="Reports & analytics"
        sub="Export live workspace data or review current utilization trends."
      />
      <div className="report-grid">
        {cards.map(([title, sub, file, rows], i) => (
          <section className="panel report-card" key={title}>
            <div className="report-icon">
              {i === 0 ? (
                <Users />
              ) : i === 1 ? (
                <BriefcaseBusiness />
              ) : (
                <Activity />
              )}
            </div>
            <h3>{title}</h3>
            <p>{sub}</p>
            <small>{rows.length - 1} records · CSV</small>
            <button
              className="btn btn-primary"
              onClick={() => download(file, rows, notify)}
            >
              <Download size={16} /> Download report
            </button>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Utilization overview</h3>
            <p>Assigned workload as a percentage of maximum capacity</p>
          </div>
        </div>
        <div className="util-list">
          {state.employees.map((e) => {
            const w = workload(state, e);
            return (
              <Link to={`/employees/${e.id}`} className="util-row" key={e.id}>
                <span>{e.name}</span>
                <div className="bar">
                  <span style={{ width: `${Math.min(100, w.utilization)}%` }} />
                </div>
                <b>{w.utilization}%</b>
                <small>{w.remaining}% available</small>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SkillQuickEdit({ employee }) {
  const { updateEmployee } = useApp();
  const [name, setName] = useState(""),
    [level, setLevel] = useState("Intermediate");
  const save = (skills) => updateEmployee(employee.id, { ...employee, skills });
  return (
    <div className="skill-quick-edit">
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const normalized = name.trim().toLowerCase();
          if (!normalized) return;
          if (
            employee.skills.some(
              (s) => s.name.trim().toLowerCase() === normalized,
            )
          )
            return;
          save([...employee.skills, { name: name.trim(), level }]);
          setName("");
        }}
      >
        <input
          aria-label="Add a personal skill"
          placeholder="Add a skill"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          aria-label="New skill proficiency"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          {levels.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button className="btn btn-light" type="submit">
          <Plus size={14} /> Add skill
        </button>
      </form>
      {employee.skills.map((s) => (
        <div className="skill-edit-row" key={s.name}>
          <span>{s.name}</span>
          <select
            aria-label={`${s.name} proficiency`}
            value={s.level}
            onChange={(e) =>
              save(
                employee.skills.map((x) =>
                  x.name === s.name ? { ...x, level: e.target.value } : x,
                ),
              )
            }
          >
            {levels.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button
            className="danger-text"
            onClick={() =>
              save(employee.skills.filter((x) => x.name !== s.name))
            }
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
export function Workspace() {
  const { state, setState } = useApp();
  const employee = state.employees.find(
    (e) => e.id === state.selectedEmployeeId,
  );
  if (!employee)
    return (
      <>
        <PageHead
          title="Employee workspace"
          sub="Your profile and current allocations."
        />
      </>
    );
  const w = workload(state, employee),
    projects = state.assignments.filter(
      (a) => a.employeeId === employee.id && a.status === "Active",
    );
  return (
    <>
      <PageHead
        title={`Welcome, ${employee.name.split(" ")[0]}`}
        sub="Your personal workspace"
      />
      <div className="profile-grid workspace-grid">
        <section className="panel profile-intro">
          <span className="profile-avatar">{initials(employee.name)}</span>
          <div>
            <h2>{employee.name}</h2>
            <p>
              {employee.role} · {employee.department}
            </p>
            <div className="badge-row">
              <Badge>{availability(state, employee)}</Badge>
              <Badge>{employee.status}</Badge>
            </div>
          </div>
        </section>
        <Stat
          label="Your utilization"
          value={`${w.utilization}%`}
          change={`${w.assigned}% workload allocated`}
          icon={ChartNoAxesCombined}
        />
        <Stat
          label="Available capacity"
          value={`${w.remaining}%`}
          change={`of ${w.capacity}% capacity`}
          icon={ArrowUpRight}
          tone="green"
        />
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Your skills</h3>
              <p>Add skills or update proficiency levels for your profile.</p>
            </div>
          </div>
          <SkillQuickEdit employee={employee} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Your projects</h3>
              <p>{projects.length} active allocations</p>
            </div>
          </div>
          {projects.length ? (
            projects.map((a) => {
              const p = state.projects.find((x) => x.id === a.projectId);
              return (
                <div className="assignment-line" key={a.id}>
                  <span>{p?.name || "Project"}</span>
                  <span>{a.commitment}% commitment</span>
                </div>
              );
            })
          ) : (
            <Empty title="No active project allocations" />
          )}
        </section>
        <section className="panel full-panel">
          <div className="panel-head">
            <div>
              <h3>Your allocation history</h3>
              <p>Recent changes to your project allocations</p>
            </div>
          </div>
          {state.history
            .filter((h) => h.employeeId === employee.id)
            .slice(0, 8)
            .map((h) => (
              <div className="activity-row" key={h.id}>
                <span className="activity-dot" />
                <div>
                  <b>{h.description}</b>
                  <small>{new Date(h.timestamp).toLocaleString()}</small>
                </div>
              </div>
            ))}
          {!state.history.some((h) => h.employeeId === employee.id) && (
            <Empty title="No history yet" />
          )}
        </section>
      </div>
    </>
  );
}
export function NotFound() {
  return (
    <div className="panel not-found">
      <div className="empty-icon">404</div>
      <h2>Page not found</h2>
      <p>The page you are looking for may have moved.</p>
      <Link className="btn btn-primary" to="/dashboard">
        Go to overview
      </Link>
    </div>
  );
}
