import { tickets } from "./data.js";
import {
  PRIORITIES,
  TICKET_STATUSES,
  createTicketId,
  filterTickets,
  getPriorityCounts,
  getStatusCounts,
  getTicketStats,
  validateTicket
} from "./domain.js";

const state = {
  tickets: [...tickets],
  status: "All",
  priority: "All",
  query: ""
};

const statsElement = document.querySelector("#stats");
const statusFiltersElement = document.querySelector("#status-filters");
const priorityFiltersElement = document.querySelector("#priority-filters");
const listElement = document.querySelector("#ticket-list");
const searchElement = document.querySelector("#ticket-search");
const formElement = document.querySelector("#ticket-form");
const formMessageElement = document.querySelector("#form-message");
const statusSelectElement = document.querySelector("#status-select");
const prioritySelectElement = document.querySelector("#priority-select");

function render() {
  renderStats();
  renderStatusFilters();
  renderPriorityFilters();
  renderTickets();
}

function renderStats() {
  const stats = getTicketStats(state.tickets);

  statsElement.innerHTML = [
    createStatCard("Open", stats.open, "New requests to triage"),
    createStatCard("Urgent", stats.urgent, "Active severe issues"),
    createStatCard("Waiting", stats.waiting, "Needs outside response"),
    createStatCard("Resolved", stats.resolved, "Solved this cycle")
  ].join("");
}

function renderStatusFilters() {
  const counts = getStatusCounts(state.tickets);
  const filters = ["All", ...TICKET_STATUSES];

  statusFiltersElement.innerHTML = filters
    .map((status) => {
      const count = status === "All" ? state.tickets.length : counts[status];
      const isPressed = status === state.status;

      return `
        <button type="button" data-status="${status}" aria-pressed="${isPressed}">
          ${status} ${count}
        </button>
      `;
    })
    .join("");
}

function renderPriorityFilters() {
  const counts = getPriorityCounts(state.tickets);
  const filters = ["All", ...PRIORITIES];

  priorityFiltersElement.innerHTML = filters
    .map((priority) => {
      const count = priority === "All" ? state.tickets.length : counts[priority];
      const isPressed = priority === state.priority;

      return `
        <button type="button" data-priority="${priority}" aria-pressed="${isPressed}">
          ${priority} ${count}
        </button>
      `;
    })
    .join("");
}

function renderTickets() {
  const visibleTickets = filterTickets(state.tickets, {
    status: state.status,
    priority: state.priority,
    query: state.query
  });

  if (visibleTickets.length === 0) {
    listElement.innerHTML = `<div class="empty-state">No tickets match the current filters.</div>`;
    return;
  }

  const rows = visibleTickets
    .map((ticket) => {
      const statusClass = `status-${ticket.status.toLowerCase().replaceAll(" ", "-")}`;
      const priorityClass = `priority-${ticket.priority.toLowerCase()}`;
      const notePreview = ticket.notes[0] ?? "No internal notes yet.";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(ticket.title)}</strong>
            <small>${escapeHtml(notePreview)}</small>
          </td>
          <td>
            <strong>${escapeHtml(ticket.requester)}</strong>
            <small>${escapeHtml(ticket.customerTier)} via ${escapeHtml(ticket.channel)}</small>
          </td>
          <td>${escapeHtml(ticket.assignee || "Unassigned")}</td>
          <td><span class="status-pill ${statusClass}">${ticket.status}</span></td>
          <td><span class="priority-pill ${priorityClass}">${ticket.priority}</span></td>
          <td>${formatDate(ticket.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  listElement.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Requester</th>
          <th>Assignee</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function createStatCard(label, value, description) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${description}</small>
    </article>
  `;
}

function populateSelects() {
  statusSelectElement.innerHTML = TICKET_STATUSES.map((status) => {
    return `<option value="${status}">${status}</option>`;
  }).join("");

  prioritySelectElement.innerHTML = PRIORITIES.map((priority) => {
    return `<option value="${priority}">${priority}</option>`;
  }).join("");

  statusSelectElement.value = "Open";
  prioritySelectElement.value = "Medium";
}

statusFiltersElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");

  if (!button) {
    return;
  }

  state.status = button.dataset.status;
  render();
});

priorityFiltersElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-priority]");

  if (!button) {
    return;
  }

  state.priority = button.dataset.priority;
  render();
});

searchElement.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTickets();
});

formElement.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = Object.fromEntries(new FormData(formElement).entries());
  const errors = validateTicket(formData);

  if (errors.length > 0) {
    formMessageElement.textContent = errors.join(" ");
    formMessageElement.classList.add("error");
    return;
  }

  state.tickets = [
    {
      id: createTicketId(state.tickets),
      title: formData.title.trim(),
      requester: formData.requester.trim(),
      assignee: formData.assignee.trim() || "Unassigned",
      status: formData.status,
      priority: formData.priority,
      createdAt: new Date().toISOString().slice(0, 10),
      channel: formData.channel,
      customerTier: formData.customerTier,
      notes: formData.note.trim() ? [formData.note.trim()] : []
    },
    ...state.tickets
  ];

  formElement.reset();
  statusSelectElement.value = "Open";
  prioritySelectElement.value = "Medium";
  formMessageElement.textContent = "Ticket created.";
  formMessageElement.classList.remove("error");
  render();
});

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

populateSelects();
render();

