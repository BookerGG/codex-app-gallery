import test from "node:test";
import assert from "node:assert/strict";
import { applications } from "../src/data.js";
import {
  APPLICATION_STORAGE_KEY,
  clearSavedApplications,
  hasSavedApplications,
  loadApplications,
  saveApplications
} from "../src/storage.js";

test("loads fallback applications when no saved tracker exists", () => {
  const storage = createMemoryStorage();

  assert.deepEqual(loadApplications(storage, applications), applications);
});

test("saves and loads applications from storage", () => {
  const storage = createMemoryStorage();
  const customApplications = [
    {
      id: "app-2001",
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
    }
  ];

  assert.equal(saveApplications(storage, customApplications), true);
  assert.equal(hasSavedApplications(storage), true);
  assert.deepEqual(loadApplications(storage, applications), customApplications);
});

test("saves and loads an empty tracker", () => {
  const storage = createMemoryStorage();

  assert.equal(saveApplications(storage, []), true);
  assert.equal(hasSavedApplications(storage), true);
  assert.deepEqual(loadApplications(storage, applications), []);
});

test("falls back to sample applications when saved data is invalid", () => {
  const storage = createMemoryStorage();

  storage.setItem(APPLICATION_STORAGE_KEY, "{bad json");

  assert.deepEqual(loadApplications(storage, applications), applications);
});

test("clears saved applications", () => {
  const storage = createMemoryStorage();

  saveApplications(storage, applications);
  assert.equal(hasSavedApplications(storage), true);
  assert.equal(clearSavedApplications(storage), true);
  assert.equal(hasSavedApplications(storage), false);
});

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}
