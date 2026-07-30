import test from "node:test";
import assert from "node:assert/strict";
import { applications } from "../src/data.js";
import {
  createApplication,
  createApplicationId,
  filterApplications,
  getApplicationStats,
  getStatusCounts,
  removeApplication,
  updateApplication,
  validateApplication
} from "../src/domain.js";

test("filters applications by status", () => {
  const interviewing = filterApplications(applications, { status: "Interviewing" });

  assert.equal(interviewing.length, 1);
  assert.equal(interviewing[0].company, "BrightForge Labs");
});

test("searches across common application fields", () => {
  const results = filterApplications(applications, { query: "referral" });

  assert.equal(results.length, 1);
  assert.equal(results[0].company, "Northstar Studio");
});

test("counts statuses for dashboard filters", () => {
  const counts = getStatusCounts(applications);

  assert.equal(counts.Applied, 1);
  assert.equal(counts.Offer, 1);
  assert.equal(counts.Withdrawn, 1);
});

test("summarizes core application stats", () => {
  const stats = getApplicationStats(applications);

  assert.equal(stats.total, 6);
  assert.equal(stats.interviewing, 1);
  assert.equal(stats.offers, 1);
  assert.equal(stats.nextActions, 4);
});

test("validates required application fields", () => {
  const errors = validateApplication({
    company: "",
    role: "",
    status: "Applied",
    dateApplied: ""
  });

  assert.deepEqual(errors, [
    "Company is required.",
    "Role is required.",
    "Date applied is required unless the role is saved."
  ]);
});

test("creates a predictable next application id", () => {
  assert.equal(createApplicationId(applications), "app-1007");
});

test("creates a new application at the top of the list", () => {
  const updatedApplications = createApplication(applications, {
    company: "SignalWorks",
    role: "Frontend Developer",
    location: "Remote",
    status: "Applied",
    dateApplied: "2026-07-29",
    salaryRange: "$70k-$84k",
    contact: "",
    nextStep: "Follow up Friday",
    source: "Referral",
    notes: ""
  });

  assert.equal(updatedApplications.length, 7);
  assert.equal(updatedApplications[0].id, "app-1007");
  assert.equal(updatedApplications[0].company, "SignalWorks");
});

test("updates an existing application without changing its id", () => {
  const updatedApplications = updateApplication(applications, "app-1002", {
    company: "CivicTrail",
    role: "Associate Software Engineer",
    location: "Seattle, WA",
    status: "Interviewing",
    dateApplied: "2026-07-21",
    salaryRange: "$78k-$92k",
    contact: "Recruiting Team",
    nextStep: "Prepare take-home exercise",
    source: "Company site",
    notes: "Moved to interview stage."
  });
  const updatedApplication = updatedApplications.find((application) => application.id === "app-1002");

  assert.equal(updatedApplication.status, "Interviewing");
  assert.equal(updatedApplication.nextStep, "Prepare take-home exercise");
  assert.equal(updatedApplication.id, "app-1002");
});

test("removes an application by id", () => {
  const updatedApplications = removeApplication(applications, "app-1004");

  assert.equal(updatedApplications.length, 5);
  assert.equal(updatedApplications.some((application) => application.id === "app-1004"), false);
});
