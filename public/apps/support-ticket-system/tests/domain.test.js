import test from "node:test";
import assert from "node:assert/strict";
import { tickets } from "../src/data.js";
import {
  createTicketId,
  filterTickets,
  getPriorityCounts,
  getStatusCounts,
  getTicketStats,
  validateTicket
} from "../src/domain.js";

test("filters tickets by status", () => {
  const openTickets = filterTickets(tickets, { status: "Open" });

  assert.equal(openTickets.length, 2);
  assert.equal(openTickets[0].id, "tic-2405");
});

test("filters tickets by priority", () => {
  const urgentTickets = filterTickets(tickets, { priority: "Urgent" });

  assert.equal(urgentTickets.length, 1);
  assert.equal(urgentTickets[0].title, "Billing export missing June invoices");
});

test("searches across common ticket fields", () => {
  const results = filterTickets(tickets, { query: "month-end" });

  assert.equal(results.length, 1);
  assert.equal(results[0].requester, "Priya Shah");
});

test("counts ticket statuses and priorities", () => {
  const statusCounts = getStatusCounts(tickets);
  const priorityCounts = getPriorityCounts(tickets);

  assert.equal(statusCounts.Open, 2);
  assert.equal(statusCounts.Resolved, 1);
  assert.equal(priorityCounts.High, 2);
  assert.equal(priorityCounts.Urgent, 1);
});

test("summarizes support queue stats", () => {
  const stats = getTicketStats(tickets);

  assert.deepEqual(stats, {
    open: 2,
    urgent: 1,
    waiting: 1,
    resolved: 1
  });
});

test("validates required ticket fields", () => {
  const errors = validateTicket({
    title: "",
    requester: "",
    status: "Open",
    priority: "Medium"
  });

  assert.deepEqual(errors, ["Title is required.", "Requester is required."]);
});

test("creates a predictable next ticket id", () => {
  assert.equal(createTicketId(tickets), "tic-2407");
});

