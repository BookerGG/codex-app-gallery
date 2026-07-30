import { applications as sampleApplications } from "./data.js";
import {
  STATUS_OPTIONS,
  applicationsToPdf,
  createApplication,
  filterApplications,
  getApplicationStats,
  getStatusCounts,
  groupApplicationsByStatus,
  removeApplication,
  updateApplication,
  validateApplication
} from "./domain.js";
import {
  clearSavedApplications,
  hasSavedApplications,
  loadApplications,
  saveApplications
} from "./storage.js";

const browserStorage = getBrowserStorage();

const state = {
  applications: loadApplications(browserStorage, sampleApplications),
  status: "All",
  query: "",
  view: "table",
  editingId: null
};

const editorElement = document.querySelector("#application-editor");
const statsElement = document.querySelector("#stats");
const filtersElement = document.querySelector("#status-filters");
const listElement = document.querySelector("#application-list");
const searchElement = document.querySelector("#application-search");
const viewToggleElement = document.querySelector(".view-toggle");
const formElement = document.querySelector("#application-form");
const formMessageElement = document.querySelector("#form-message");
const statusSelectElement = document.querySelector("#status-select");
const dateAppliedElement = document.querySelector("#date-applied");
const newApplicationButton = document.querySelector("#new-application-button");
const resetSampleDataButton = document.querySelector("#reset-sample-data-button");
const startBlankTrackerButton = document.querySelector("#start-blank-tracker-button");
const exportPdfButton = document.querySelector("#export-pdf-button");
const saveApplicationButton = document.querySelector("#save-application-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const formEyebrowElement = document.querySelector("#form-eyebrow");
const formTitleElement = document.querySelector("#form-title");
const saveStatusElement = document.querySelector("#save-status");

function render() {
  renderStats();
  renderFilters();
  renderViewToggle();
  renderApplications();
}

function renderStats() {
  const stats = getApplicationStats(state.applications);

  statsElement.innerHTML = [
    createStatCard("Total Applications", stats.total, "Tracked in this search"),
    createStatCard("Interviewing", stats.interviewing, "Active conversations"),
    createStatCard("Offers", stats.offers, "Ready for comparison"),
    createStatCard("Next Actions", stats.nextActions, "Open next steps")
  ].join("");
}

function renderFilters() {
  const counts = getStatusCounts(state.applications);
  const filters = ["All", ...STATUS_OPTIONS];

  filtersElement.innerHTML = filters
    .map((status) => {
      const count = status === "All" ? state.applications.length : counts[status];
      const isPressed = status === state.status;

      return `
        <button type="button" data-status="${status}" aria-pressed="${isPressed}">
          ${status} ${count}
        </button>
      `;
    })
    .join("");
}

function renderViewToggle() {
  viewToggleElement.querySelectorAll("button[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
  });
}

function renderApplications() {
  if (state.applications.length === 0) {
    listElement.className = "table-wrap";
    listElement.innerHTML = `<div class="empty-state">No applications yet. Create your first listing to start a new tracker.</div>`;
    return;
  }

  const visibleApplications = getVisibleApplications();

  if (visibleApplications.length === 0) {
    listElement.className = "table-wrap";
    listElement.innerHTML = `<div class="empty-state">No applications match the current filters.</div>`;
    return;
  }

  if (state.view === "board") {
    renderBoard(visibleApplications);
    return;
  }

  renderTable(visibleApplications);
}

function renderTable(visibleApplications) {
  listElement.className = "table-wrap";

  const rows = visibleApplications
    .map((application) => {
      const appliedDate = application.dateApplied ? formatDate(application.dateApplied) : "Not applied";
      const statusClass = `status-${application.status.toLowerCase().replaceAll(" ", "-")}`;
      const isEditing = application.id === state.editingId;

      return `
        <tr class="${isEditing ? "is-editing" : ""}">
          <td>
            <strong>${escapeHtml(application.company)}</strong>
            <small>${escapeHtml(application.location || "Location not listed")}</small>
          </td>
          <td>
            <strong>${escapeHtml(application.role)}</strong>
            <small>${escapeHtml(application.salaryRange || "Salary not listed")}</small>
          </td>
          <td><span class="status-pill ${statusClass}">${application.status}</span></td>
          <td>${appliedDate}</td>
          <td>
            <strong>${escapeHtml(application.contact || "No contact yet")}</strong>
            <small>${escapeHtml(application.source || "Source not listed")}</small>
          </td>
          <td>${escapeHtml(application.nextStep || "No next step")}</td>
          <td>${createActionButtons(application)}</td>
        </tr>
      `;
    })
    .join("");

  listElement.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Role</th>
          <th>Status</th>
          <th>Date</th>
          <th>Contact</th>
          <th>Next Step</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBoard(visibleApplications) {
  listElement.className = "board-wrap";

  const groups = groupApplicationsByStatus(visibleApplications);
  const statuses = state.status === "All" ? STATUS_OPTIONS : [state.status];

  listElement.innerHTML = `
    <div class="kanban-board">
      ${statuses.map((status) => createBoardColumn(status, groups[status] ?? [])).join("")}
    </div>
  `;
}

function createBoardColumn(status, applications) {
  const statusClass = `status-${status.toLowerCase().replaceAll(" ", "-")}`;
  const cards = applications.length
    ? applications.map((application) => createBoardCard(application)).join("")
    : `<div class="board-empty">No listings</div>`;

  return `
    <section class="board-column" aria-label="${status} applications">
      <div class="board-column-header">
        <span class="status-pill ${statusClass}">${status}</span>
        <strong>${applications.length}</strong>
      </div>
      <div class="board-card-list">${cards}</div>
    </section>
  `;
}

function createBoardCard(application) {
  const isEditing = application.id === state.editingId;
  const appliedDate = application.dateApplied ? formatDate(application.dateApplied) : "Not applied";

  return `
    <article class="board-card ${isEditing ? "is-editing" : ""}">
      <strong>${escapeHtml(application.company)}</strong>
      <span>${escapeHtml(application.role)}</span>
      <small>${escapeHtml(application.location || "Location not listed")} - ${appliedDate}</small>
      <p>${escapeHtml(application.nextStep || "No next step")}</p>
      ${createActionButtons(application)}
    </article>
  `;
}

function createActionButtons(application) {
  return `
    <div class="action-group" aria-label="Actions for ${escapeHtml(application.company)}">
      <button class="text-action" type="button" data-action="edit" data-id="${application.id}">Edit</button>
      <button class="text-action danger" type="button" data-action="remove" data-id="${application.id}">Delete</button>
    </div>
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

function populateStatusSelect() {
  statusSelectElement.innerHTML = STATUS_OPTIONS.map((status) => {
    return `<option value="${status}">${status}</option>`;
  }).join("");

  statusSelectElement.value = "Applied";
}

function setDefaultDate() {
  dateAppliedElement.value = new Date().toISOString().slice(0, 10);
}

function setSaveStatus(message, type = "neutral") {
  saveStatusElement.textContent = message;
  saveStatusElement.dataset.status = type;
}

function persistApplications(successMessage = "Saved locally") {
  const didSave = saveApplications(browserStorage, state.applications);

  if (didSave) {
    setSaveStatus(successMessage, "saved");
    return;
  }

  setSaveStatus("Changes are not saved in this browser", "warning");
}

function resetFormMode() {
  state.editingId = null;
  formElement.reset();
  formElement.elements.id.value = "";
  statusSelectElement.value = "Applied";
  setDefaultDate();
  formEyebrowElement.textContent = "New listing";
  formTitleElement.textContent = "Create Application";
  saveApplicationButton.textContent = "Create listing";
  cancelEditButton.classList.add("is-hidden");
  formMessageElement.textContent = "";
  formMessageElement.classList.remove("error");
  render();
}

function resetFilters() {
  state.status = "All";
  state.query = "";
  searchElement.value = "";
}

function startEditMode(applicationId) {
  const application = state.applications.find((item) => item.id === applicationId);

  if (!application) {
    return;
  }

  state.editingId = applicationId;
  fillForm(application);
  formEyebrowElement.textContent = "Customize listing";
  formTitleElement.textContent = "Edit Application";
  saveApplicationButton.textContent = "Save changes";
  cancelEditButton.classList.remove("is-hidden");
  formMessageElement.textContent = `Editing ${application.company}.`;
  formMessageElement.classList.remove("error");
  render();
  focusEditor();
}

function fillForm(application) {
  formElement.elements.id.value = application.id ?? "";
  formElement.elements.company.value = application.company ?? "";
  formElement.elements.role.value = application.role ?? "";
  formElement.elements.location.value = application.location ?? "";
  formElement.elements.status.value = application.status ?? "Applied";
  formElement.elements.dateApplied.value = application.dateApplied ?? "";
  formElement.elements.salaryRange.value = application.salaryRange ?? "";
  formElement.elements.contact.value = application.contact ?? "";
  formElement.elements.nextStep.value = application.nextStep ?? "";
  formElement.elements.source.value = application.source ?? "";
  formElement.elements.notes.value = application.notes ?? "";
}

function focusEditor() {
  editorElement.scrollIntoView({ behavior: "smooth", block: "start" });
  formElement.elements.company.focus({ preventScroll: true });
}

function getApplicationFromForm(formData) {
  return {
    company: formData.company.trim(),
    role: formData.role.trim(),
    location: formData.location.trim(),
    status: formData.status,
    dateApplied: formData.dateApplied,
    salaryRange: formData.salaryRange.trim(),
    contact: formData.contact.trim(),
    nextStep: formData.nextStep.trim(),
    source: formData.source.trim(),
    notes: formData.notes.trim()
  };
}

function getVisibleApplications() {
  return filterApplications(state.applications, {
    status: state.status,
    query: state.query
  });
}

function exportVisibleApplications() {
  const visibleApplications = getVisibleApplications();

  if (visibleApplications.length === 0) {
    window.alert("There are no listings to export with the current filters.");
    return;
  }

  const pdf = applicationsToPdf(visibleApplications, {
    generatedAt: new Date(),
    statusFilter: state.status,
    searchQuery: state.query
  });
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `job-hunt-tracker-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setSaveStatus("PDF exported", "saved");
}

filtersElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");

  if (!button) {
    return;
  }

  state.status = button.dataset.status;
  render();
});

viewToggleElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");

  if (!button) {
    return;
  }

  state.view = button.dataset.view;
  renderViewToggle();
  renderApplications();
});

searchElement.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderApplications();
});

listElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const applicationId = button.dataset.id;

  if (button.dataset.action === "edit") {
    startEditMode(applicationId);
    return;
  }

  if (button.dataset.action === "remove") {
    const application = state.applications.find((item) => item.id === applicationId);
    const shouldRemove = window.confirm(`Delete ${application?.company ?? "this application"} from the tracker?`);

    if (!shouldRemove) {
      return;
    }

    state.applications = removeApplication(state.applications, applicationId);
    persistApplications("Changes saved locally");

    if (state.editingId === applicationId) {
      state.editingId = null;
      resetFormMode();
      formMessageElement.textContent = "Application deleted.";
      return;
    }

    formMessageElement.textContent = "Application deleted.";
    formMessageElement.classList.remove("error");
    render();
  }
});

newApplicationButton.addEventListener("click", () => {
  resetFormMode();
  focusEditor();
});

resetSampleDataButton.addEventListener("click", () => {
  const shouldReset = window.confirm("Reset your tracker to the original sample applications?");

  if (!shouldReset) {
    return;
  }

  clearSavedApplications(browserStorage);
  state.applications = [...sampleApplications];
  state.editingId = null;
  resetFilters();
  resetFormMode();
  setSaveStatus("Sample data restored", "saved");
});

startBlankTrackerButton.addEventListener("click", () => {
  const shouldStartBlank = window.confirm("Delete every listing and start with a blank tracker?");

  if (!shouldStartBlank) {
    return;
  }

  state.applications = [];
  state.editingId = null;
  resetFilters();
  persistApplications("Blank tracker saved locally");
  resetFormMode();
  formMessageElement.textContent = "Blank tracker ready. Create your first listing.";
});

exportPdfButton.addEventListener("click", () => {
  exportVisibleApplications();
});

cancelEditButton.addEventListener("click", () => {
  resetFormMode();
});

formElement.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = Object.fromEntries(new FormData(formElement).entries());
  const errors = validateApplication(formData);

  if (errors.length > 0) {
    formMessageElement.textContent = errors.join(" ");
    formMessageElement.classList.add("error");
    return;
  }

  const application = getApplicationFromForm(formData);
  const existingId = formData.id || state.editingId;
  const isEditing = Boolean(existingId);

  state.applications = isEditing
    ? updateApplication(state.applications, existingId, application)
    : createApplication(state.applications, application);
  persistApplications("Changes saved locally");

  formElement.reset();
  state.editingId = null;
  formElement.elements.id.value = "";
  statusSelectElement.value = "Applied";
  setDefaultDate();
  formEyebrowElement.textContent = "New listing";
  formTitleElement.textContent = "Create Application";
  saveApplicationButton.textContent = "Create listing";
  cancelEditButton.classList.add("is-hidden");
  formMessageElement.textContent = isEditing ? "Application updated." : "Application added.";
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

populateStatusSelect();
setDefaultDate();
setSaveStatus(hasSavedApplications(browserStorage) ? "Loaded saved tracker" : "Using sample data");
render();

function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
