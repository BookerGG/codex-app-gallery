import { applications as sampleApplications } from "./data.js";
import {
  STATUS_OPTIONS,
  archiveApplication,
  applicationsToPdf,
  createApplication,
  filterApplications,
  getActiveApplications,
  getApplicationStats,
  getArchivedApplications,
  getStatusCounts,
  groupApplicationsByStatus,
  removeApplication,
  restoreApplication,
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
  mode: "active",
  editingId: null
};

const editorElement = document.querySelector("#application-editor");
const statsElement = document.querySelector("#stats");
const filtersElement = document.querySelector("#status-filters");
const listElement = document.querySelector("#application-list");
const searchElement = document.querySelector("#application-search");
const archiveToggleElement = document.querySelector(".archive-toggle");
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
  renderModeToggle();
  renderViewToggle();
  renderApplications();
}

function renderStats() {
  const activeApplications = getActiveApplications(state.applications);
  const archivedApplications = getArchivedApplications(state.applications);
  const stats = getApplicationStats(activeApplications);

  statsElement.innerHTML = [
    createStatCard("Active Applications", stats.total, "Pursuable listings"),
    createStatCard("Interviewing", stats.interviewing, "Active conversations"),
    createStatCard("Offers", stats.offers, "Ready for comparison"),
    createStatCard("Archived", archivedApplications.length, "Unpursuable listings")
  ].join("");
}

function renderFilters() {
  const currentApplications = getCurrentApplications();
  const counts = getStatusCounts(currentApplications);
  const filters = ["All", ...STATUS_OPTIONS];

  filtersElement.innerHTML = filters
    .map((status) => {
      const count = status === "All" ? currentApplications.length : counts[status];
      const isPressed = status === state.status;

      return `
        <button type="button" data-status="${status}" aria-pressed="${isPressed}">
          ${status} ${count}
        </button>
      `;
    })
    .join("");
}

function renderModeToggle() {
  const archivedCount = getArchivedApplications(state.applications).length;

  archiveToggleElement.querySelector("[data-mode='active']").setAttribute("aria-pressed", String(state.mode === "active"));
  archiveToggleElement.querySelector("[data-mode='archive']").setAttribute("aria-pressed", String(state.mode === "archive"));
  archiveToggleElement.querySelector("[data-mode='archive']").textContent = `Archive ${archivedCount}`;
}

function renderViewToggle() {
  viewToggleElement.querySelectorAll("button[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
  });
}

function renderApplications() {
  const currentApplications = getCurrentApplications();

  if (state.applications.length === 0) {
    listElement.className = "table-wrap";
    listElement.innerHTML = `<div class="empty-state">No applications yet. Create your first listing to start a new tracker.</div>`;
    return;
  }

  if (currentApplications.length === 0) {
    listElement.className = "table-wrap";
    listElement.innerHTML = state.mode === "archive"
      ? `<div class="empty-state">No archived listings yet. Archive unpursuable jobs from the active tracker.</div>`
      : `<div class="empty-state">No active applications yet. Check the archive or create a new listing.</div>`;
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
      const dateValue = state.mode === "archive" && application.archivedAt ? formatDate(application.archivedAt) : appliedDate;

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
          <td>${dateValue}</td>
          <td>
            <strong>${escapeHtml(application.contact || "No contact yet")}</strong>
            <small>${escapeHtml(application.source || "Source not listed")}</small>
          </td>
          <td>${createNextStepCell(application)}</td>
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
          <th>${state.mode === "archive" ? "Archived" : "Date"}</th>
          <th>Contact</th>
          <th>${state.mode === "archive" ? "Archive Reason" : "Next Step"}</th>
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
  const timelineText = state.mode === "archive" && application.archivedAt
    ? `Archived ${formatDate(application.archivedAt)}`
    : appliedDate;

  return `
    <article class="board-card ${isEditing ? "is-editing" : ""}">
      <strong>${escapeHtml(application.company)}</strong>
      <span>${escapeHtml(application.role)}</span>
      <small>${escapeHtml(application.location || "Location not listed")} - ${timelineText}</small>
      <p>${state.mode === "archive" ? "Unpursuable" : escapeHtml(application.nextStep || "No next step")}</p>
      ${createActionButtons(application)}
    </article>
  `;
}

function createNextStepCell(application) {
  if (state.mode !== "archive") {
    return escapeHtml(application.nextStep || "No next step");
  }

  return `
    <strong>${escapeHtml(application.archiveReason || "Unpursuable")}</strong>
    <small>${escapeHtml(application.nextStep || "No next step was saved")}</small>
  `;
}

function createActionButtons(application) {
  if (state.mode === "archive") {
    return `
      <div class="action-group" aria-label="Actions for ${escapeHtml(application.company)}">
        <button class="text-action" type="button" data-action="restore" data-id="${application.id}">Restore</button>
        <button class="text-action danger" type="button" data-action="remove" data-id="${application.id}">Delete</button>
      </div>
    `;
  }

  return `
    <div class="action-group" aria-label="Actions for ${escapeHtml(application.company)}">
      <button class="text-action" type="button" data-action="edit" data-id="${application.id}">Edit</button>
      <button class="text-action" type="button" data-action="archive" data-id="${application.id}">Archive</button>
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
  return filterApplications(getCurrentApplications(), {
    status: state.status,
    query: state.query
  });
}

function getCurrentApplications() {
  return state.mode === "archive"
    ? getArchivedApplications(state.applications)
    : getActiveApplications(state.applications);
}

function exportVisibleApplications() {
  const visibleApplications = getVisibleApplications();

  if (visibleApplications.length === 0) {
    window.alert("There are no listings to export with the current filters.");
    return;
  }

  const pdf = applicationsToPdf(visibleApplications, {
    generatedAt: new Date(),
    viewLabel: state.mode === "archive" ? "Archive - unpursuable listings" : "Active tracker",
    statusFilter: state.status,
    searchQuery: state.query
  });
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileSuffix = state.mode === "archive" ? "archive" : "tracker";
  link.download = `job-hunt-${fileSuffix}-${new Date().toISOString().slice(0, 10)}.pdf`;
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

archiveToggleElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");

  if (!button) {
    return;
  }

  state.mode = button.dataset.mode;
  state.editingId = null;
  resetFilters();
  resetFormMode();
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

  if (button.dataset.action === "archive") {
    const application = state.applications.find((item) => item.id === applicationId);
    const shouldArchive = window.confirm(`Archive ${application?.company ?? "this application"} as unpursuable? You can restore it later.`);

    if (!shouldArchive) {
      return;
    }

    state.applications = archiveApplication(state.applications, applicationId);
    persistApplications("Archived locally");

    if (state.editingId === applicationId) {
      state.editingId = null;
      resetFormMode();
      formMessageElement.textContent = "Application archived as unpursuable.";
      return;
    }

    formMessageElement.textContent = "Application archived as unpursuable.";
    formMessageElement.classList.remove("error");
    render();
    return;
  }

  if (button.dataset.action === "restore") {
    const application = state.applications.find((item) => item.id === applicationId);
    const shouldRestore = window.confirm(`Restore ${application?.company ?? "this application"} to the active tracker?`);

    if (!shouldRestore) {
      return;
    }

    state.applications = restoreApplication(state.applications, applicationId);
    persistApplications("Restored locally");
    formMessageElement.textContent = "Application restored to the active tracker.";
    formMessageElement.classList.remove("error");
    render();
    return;
  }

  if (button.dataset.action === "remove") {
    const application = state.applications.find((item) => item.id === applicationId);
    const shouldRemove = window.confirm(`Delete ${application?.company ?? "this application"} from the ${state.mode === "archive" ? "archive" : "tracker"}?`);

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
  state.mode = "active";
  resetFilters();
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
  state.mode = "active";
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
  state.mode = "active";
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
  const date = dateString.includes("T")
    ? new Date(dateString)
    : new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
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
