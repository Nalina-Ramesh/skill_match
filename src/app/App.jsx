import React, { useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronLeft,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import AuthPage from "./AuthPages.jsx";
import {
  Dashboard,
  Employees,
  EmployeeProfile,
  Projects,
  ProjectDetail,
  Assignments,
  Reports,
  Workspace,
  NotFound,
} from "./Pages.jsx";
const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/employees", "Employees", Users],
  ["/projects", "Projects", BriefcaseBusiness],
  ["/assignments", "Assignments", Activity],
  ["/reports", "Reports", ChartNoAxesCombined],
];
function ManagerRoute({ children }) {
  const { state } = useApp();
  return state.role === "Manager" ? (
    children
  ) : (
    <Navigate to="/my-workspace" replace />
  );
}
export default function App() {
  const { state, toast, user, authLoading, signOut, notify } = useApp(),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false);
  const loc = useLocation(),
    nav = useNavigate();
  if (authLoading) {
    return <div className="auth-loading">Opening your workspace…</div>;
  }
  if (!user) {
    return (
      <Routes>
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      nav("/login", { replace: true });
    } catch (error) {
      notify(error.message);
    }
  };
  const titles = {
    "/dashboard": "Overview",
    "/employees": "Employees",
    "/projects": "Projects",
    "/assignments": "Assignments",
    "/reports": "Reports",
    "/my-workspace": "My workspace",
  };
  let title =
    titles[loc.pathname] ||
    (loc.pathname.startsWith("/employees/")
      ? "Employee profile"
      : loc.pathname.startsWith("/projects/")
        ? "Project details"
        : "SkillMatch");
  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">S</div>
          <span>SkillMatch</span>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="help-card">
            <CircleHelp size={17} />
            <div>
              <b>Need a hand?</b>
              <small>Explore your workspace</small>
            </div>
          </div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
          >
            <ChevronLeft size={16} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Close navigation overlay"
          className="overlay"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            aria-label="Open menu"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div>
            <div className="crumb">
              Workspace <span>/</span> <b>{title}</b>
            </div>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <span className="account-name" title={user.email}>
              {user.name}
            </span>
            <button
              className="icon-btn signout-btn"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main>
          <Routes>
            <Route
              path="/login"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/signup"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    state.role === "Employee" ? "/my-workspace" : "/dashboard"
                  }
                  replace
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <ManagerRoute>
                  <Dashboard />
                </ManagerRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ManagerRoute>
                  <Employees />
                </ManagerRoute>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <ManagerRoute>
                  <EmployeeProfile />
                </ManagerRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ManagerRoute>
                  <Projects />
                </ManagerRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ManagerRoute>
                  <ProjectDetail />
                </ManagerRoute>
              }
            />
            <Route
              path="/assignments"
              element={
                <ManagerRoute>
                  <Assignments />
                </ManagerRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ManagerRoute>
                  <Reports />
                </ManagerRoute>
              }
            />
            <Route path="/my-workspace" element={<Workspace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer>
          SkillMatch <span>·</span> Employee & Project Allocation{" "}
          <span className="footer-note">Changes save to your account</span>
        </footer>
      </div>
      {toast && (
        <div role="status" className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
