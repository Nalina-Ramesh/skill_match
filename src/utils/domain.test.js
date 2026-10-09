/*import { describe, expect, it } from "vitest";
import {
  csv,
  matchSkills,
  recommendations,
  workload,
  availability,
} from "./domain.js";
const emp = (id, skills = [], extra = {}) => ({
  id,
  name: id,
  email: `${id}@test.com`,
  status: "Active",
  explicitAvailability: "Available",
  capacity: 100,
  experience: 3,
  skills,
  ...extra,
});
const project = {
  id: "p1",
  status: "Active",
  commitment: 25,
  requiredSkills: [
    { name: "React", level: "Advanced" },
    { name: "SQL", level: "Intermediate" },
  ],
};
describe("skill matching", () => {
  it("scores exact and above-level proficiency as a full match", () => {
    expect(
      matchSkills(
        [{ name: "React", level: "Advanced" }],
        [{ name: "React", level: "Advanced" }],
      ).score,
    ).toBe(100);
    expect(
      matchSkills(
        [{ name: "React", level: "Advanced" }],
        [{ name: "React", level: "Expert" }],
      ).score,
    ).toBe(100);
  });
  it("scores below-level skills fractionally and missing skills as zero", () => {
    expect(
      matchSkills(project.requiredSkills, [
        { name: "React", level: "Intermediate" },
      ]).score,
    ).toBe(33.3);
    expect(
      matchSkills(project.requiredSkills, [
        { name: "React", level: "Advanced" },
      ]),
    ).toMatchObject({ score: 50, matched: ["React"], missing: ["SQL"] });
  });
  it("supports weights, no requirements, and one-decimal rounding", () => {
    expect(
      matchSkills(
        [
          { name: "A", level: "Expert", weight: 3 },
          { name: "B", level: "Beginner", weight: 1 },
        ],
        [
          { name: "A", level: "Beginner" },
          { name: "B", level: "Beginner" },
        ],
      ).score,
    ).toBe(43.8);
    expect(matchSkills([], []).score).toBeNull();
    expect(
      matchSkills(
        [{ name: "a", level: "Expert" }],
        [{ name: "a", level: "Beginner" }],
      ).score,
    ).toBe(25);
  });
});
describe("workload and recommendations", () => {
  const state = (employee, assignments = [], projects = [project]) => ({
    employees: [employee],
    projects,
    assignments,
  });
  it("calculates empty, partial, full, zero-capacity workloads consistently", () => {
    let e = emp("a");
    expect(workload(state(e), e)).toMatchObject({
      assigned: 0,
      remaining: 100,
      utilization: 0,
    });
    let s = state(e, [
      { employeeId: "a", projectId: "p1", commitment: 40, status: "Active" },
    ]);
    expect(workload(s, e)).toMatchObject({
      assigned: 40,
      remaining: 60,
      utilization: 40,
    });
    s.assignments[0].commitment = 100;
    expect(workload(s, e).utilization).toBe(100);
    e.capacity = 0;
    expect(workload(s, e).utilization).toBe(0);
    expect(availability(s, e)).toBe("Unavailable");
  });
  it("returns safe zeroed workload for a missing or malformed employee", () => {
    expect(
      workload({ assignments: [], projects: [] }, undefined),
    ).toMatchObject({ assigned: 0, capacity: 0, remaining: 0, utilization: 0 });
    expect(workload({}, {}).utilization).toBe(0);
  });
  it("filters assignment eligibility and ranks deterministically", () => {
    const strong = emp(
        "Strong",
        [
          { name: "React", level: "Expert" },
          { name: "SQL", level: "Expert" },
        ],
        { experience: 4 },
      ),
      weak = emp("Weak", [{ name: "React", level: "Beginner" }], {
        experience: 8,
      }),
      inactive = emp("Inactive", [], { status: "Inactive" }),
      busy = emp("Busy", [], { capacity: 20 }),
      already = emp("Already");
    const st = {
      employees: [weak, strong, inactive, busy, already],
      projects: [project],
      assignments: [
        {
          employeeId: "Busy",
          projectId: "p1",
          commitment: 20,
          status: "Active",
        },
        {
          employeeId: "Already",
          projectId: "p1",
          commitment: 25,
          status: "Active",
        },
      ],
    };
    expect(recommendations(st, project).map((c) => c.employee.id)).toEqual([
      "Strong",
      "Weak",
    ]);
  });
  it("escapes quotes and neutralizes formula-prefixed cells", () => {
    expect(
      csv([
        ["a", "b"],
        ["=1+1", 'say "hi", ok'],
      ]),
    ).toBe('"a","b"\r\n"\'=1+1","say ""hi"", ok"');
  });
});*/
