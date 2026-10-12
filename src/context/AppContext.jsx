import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  id,
  workload,
  validateEmployee,
  validateProject,
} from "../utils/domain.js";

const Ctx = createContext(null);

function emptyState() {
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

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(result?.error || "The request could not be completed.");
  }
  return result;
}

function discardLegacyWorkspace() {
  try {
    localStorage.removeItem("skillmatch-data-v1");
  } catch {}
}

export function AppProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const notify = (message) => setToast(message);

  useEffect(() => {
    discardLegacyWorkspace();
    let active = true;
    api("/auth/me")
      .then(({ user: signedInUser, workspace }) => {
        if (!active) return;
        if (signedInUser) {
          setUser(signedInUser);
          setState(workspace);
          setWorkspaceReady(true);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !workspaceReady) return undefined;
    let active = true;
    const timeout = setTimeout(() => {
      api("/workspace", {
        method: "PUT",
        body: JSON.stringify(state),
      }).catch((error) => {
        if (active) notify(error.message);
      });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [state, user, workspaceReady]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const acceptSession = ({ user: signedInUser, workspace }) => {
    setUser(signedInUser);
    setState({
      ...workspace,
      role: signedInUser.accountRole,
      selectedEmployeeId:
        signedInUser.employeeId ?? workspace.selectedEmployeeId,
    });
    setWorkspaceReady(true);
  };

  const signUp = async (name, email, password, accountRole, managerEmail) => {
    const result = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, accountRole, managerEmail }),
    });
    acceptSession(result);
  };

  const signIn = async (email, password, accountRole) => {
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, accountRole }),
    });
    acceptSession(result);
  };

  const signOut = async () => {
    if (workspaceReady) {
      await api("/workspace", {
        method: "PUT",
        body: JSON.stringify(state),
      });
    }
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setState(emptyState());
    setWorkspaceReady(false);
  };

  const event = (description, employeeId, projectId, type = "management") => ({
    id: id(),
    type,
    description,
    employeeId,
    projectId,
    timestamp: new Date().toISOString(),
  });

  const addEmployee = (form) => {
    const errors = validateEmployee(form, state.employees);
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0]);
      return false;
    }
    const employee = {
      ...form,
      id: id(),
      experience: Number(form.experience),
      capacity: Number(form.capacity),
      skills: form.skills || [],
      status: form.status || "Active",
      explicitAvailability: form.explicitAvailability || "Available",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      employees: [...current.employees, employee],
      history: [
        event(`Added employee ${employee.name}`, employee.id),
        ...current.history,
      ],
    }));
    notify("Employee added");
    return true;
  };

  const updateEmployee = (employeeId, form) => {
    const oldEmployee = state.employees.find(
      (employee) => employee.id === employeeId,
    );
    if (!oldEmployee) {
      notify("Employee record not found");
      return false;
    }
    const errors = validateEmployee(form, state.employees, employeeId);
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0]);
      return false;
    }
    const nextEmployee = {
      ...oldEmployee,
      ...form,
      experience: Number(form.experience),
      capacity: Number(form.capacity),
      skills: form.skills || oldEmployee.skills,
      updatedAt: new Date().toISOString(),
    };
    if (workload(state, oldEmployee).assigned > nextEmployee.capacity) {
      notify(
        "Capacity is below assigned workload. Remove assignments or deactivate the employee first.",
      );
      return false;
    }
    setState((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === employeeId ? nextEmployee : employee,
      ),
      history: [
        event(`Updated employee ${nextEmployee.name}`, employeeId),
        ...current.history,
      ],
    }));
    notify("Employee updated");
    return true;
  };

  const deleteEmployee = (employeeId) => {
    const employee = state.employees.find((item) => item.id === employeeId);
    if (!employee) return;
    setState((current) => ({
      ...current,
      employees: current.employees.filter((item) => item.id !== employeeId),
      assignments: current.assignments.filter(
        (assignment) => assignment.employeeId !== employeeId,
      ),
      history: [
        event(
          `Removed employee ${employee.name} and their active assignments`,
          employeeId,
        ),
        ...current.history,
      ],
    }));
    notify("Employee and related assignments removed");
  };

  const addProject = (form) => {
    const errors = validateProject(form);
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0]);
      return false;
    }
    const project = {
      ...form,
      id: id(),
      teamSize: Number(form.teamSize),
      commitment: Number(form.commitment),
      requiredSkills: form.requiredSkills || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      projects: [...current.projects, project],
      history: [
        event(`Created project ${project.name}`, null, project.id),
        ...current.history,
      ],
    }));
    notify("Project created");
    return true;
  };

  const updateProject = (projectId, form) => {
    const errors = validateProject(form);
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0]);
      return false;
    }
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              ...form,
              teamSize: Number(form.teamSize),
              commitment: Number(form.commitment),
              updatedAt: new Date().toISOString(),
            }
          : project,
      ),
      history: [
        event(`Updated project ${form.name}`, null, projectId),
        ...current.history,
      ],
    }));
    notify("Project updated");
    return true;
  };

  const deleteProject = (projectId) => {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    setState((current) => ({
      ...current,
      projects: current.projects.filter((item) => item.id !== projectId),
      assignments: current.assignments.filter(
        (assignment) => assignment.projectId !== projectId,
      ),
      history: [
        event(
          `Deleted project ${project.name} and closed its assignments`,
          null,
          projectId,
        ),
        ...current.history,
      ],
    }));
    notify("Project and related assignments removed");
  };

  const assign = (employeeId, projectId) => {
    const employee = state.employees.find((item) => item.id === employeeId);
    const project = state.projects.find((item) => item.id === projectId);
    if (!employee || !project) {
      notify("Employee or project no longer exists");
      return false;
    }
    const currentWorkload = workload(state, employee);
    if (
      project.status === "Completed" ||
      employee.status !== "Active" ||
      employee.explicitAvailability === "Unavailable" ||
      currentWorkload.assigned + project.commitment >
        currentWorkload.capacity ||
      state.assignments.some(
        (assignment) =>
          assignment.employeeId === employeeId &&
          assignment.projectId === projectId &&
          assignment.status === "Active",
      )
    ) {
      notify("Assignment is no longer eligible; refresh recommendations");
      return false;
    }
    const assignment = {
      id: id(),
      employeeId,
      projectId,
      commitment: Number(project.commitment || 25),
      status: "Active",
      assignedAt: new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      assignments: [...current.assignments, assignment],
      history: [
        event(
          `${employee.name} assigned to ${project.name}`,
          employeeId,
          projectId,
          "allocation",
        ),
        ...current.history,
      ],
    }));
    notify(`${employee.name} assigned to ${project.name}`);
    return true;
  };

  const unassign = (assignmentId) => {
    const assignment = state.assignments.find(
      (item) => item.id === assignmentId,
    );
    if (!assignment) return;
    const employee = state.employees.find(
      (item) => item.id === assignment.employeeId,
    );
    const project = state.projects.find(
      (item) => item.id === assignment.projectId,
    );
    setState((current) => ({
      ...current,
      assignments: current.assignments.map((item) =>
        item.id === assignmentId
          ? { ...item, status: "Removed", removedAt: new Date().toISOString() }
          : item,
      ),
      history: [
        event(
          `Removed ${employee?.name || "employee"} from ${project?.name || "project"}`,
          assignment.employeeId,
          assignment.projectId,
          "allocation",
        ),
        ...current.history,
      ],
    }));
    notify("Assignment removed; capacity released");
  };

  const reset = () => {
    setState(emptyState());
    notify("Workspace data cleared");
  };

  const value = useMemo(
    () => ({
      state,
      setState,
      toast,
      notify,
      user,
      authLoading,
      signUp,
      signIn,
      signOut,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addProject,
      updateProject,
      deleteProject,
      assign,
      unassign,
      reset,
    }),
    [state, toast, user, authLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
