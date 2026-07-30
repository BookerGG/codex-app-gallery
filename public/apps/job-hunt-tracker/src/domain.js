export const STATUS_OPTIONS = ["Saved", "Applied", "Interviewing", "Offer", "Rejected", "Withdrawn"];

const closedStatuses = new Set(["Rejected", "Withdrawn"]);

export function getStatusCounts(applications) {
  return STATUS_OPTIONS.reduce((counts, status) => {
    counts[status] = applications.filter((application) => application.status === status).length;
    return counts;
  }, {});
}

export function getApplicationStats(applications) {
  return {
    total: applications.length,
    interviewing: applications.filter((application) => application.status === "Interviewing").length,
    offers: applications.filter((application) => application.status === "Offer").length,
    nextActions: applications.filter((application) => {
      return application.nextStep && !closedStatuses.has(application.status);
    }).length
  };
}

export function filterApplications(applications, filters = {}) {
  const status = filters.status ?? "All";
  const query = normalize(filters.query ?? "");

  return applications
    .filter((application) => status === "All" || application.status === status)
    .filter((application) => {
      if (!query) {
        return true;
      }

      const searchableText = [
        application.company,
        application.role,
        application.location,
        application.contact,
        application.source,
        application.notes
      ].join(" ");

      return normalize(searchableText).includes(query);
    })
    .sort((a, b) => compareDatesDescending(a.dateApplied, b.dateApplied));
}

export function validateApplication(application) {
  const errors = [];

  if (!application.company?.trim()) {
    errors.push("Company is required.");
  }

  if (!application.role?.trim()) {
    errors.push("Role is required.");
  }

  if (!STATUS_OPTIONS.includes(application.status)) {
    errors.push("Choose a valid status.");
  }

  if (application.status !== "Saved" && !application.dateApplied) {
    errors.push("Date applied is required unless the role is saved.");
  }

  return errors;
}

export function createApplication(applications, application) {
  return [
    {
      ...application,
      id: createApplicationId(applications)
    },
    ...applications
  ];
}

export function updateApplication(applications, applicationId, updates) {
  return applications.map((application) => {
    if (application.id !== applicationId) {
      return application;
    }

    return {
      ...application,
      ...updates,
      id: application.id
    };
  });
}

export function removeApplication(applications, applicationId) {
  return applications.filter((application) => application.id !== applicationId);
}

export function createApplicationId(applications) {
  const largestIdNumber = applications.reduce((largest, application) => {
    const idNumber = Number.parseInt(application.id.replace(/\D/g, ""), 10);
    return Number.isFinite(idNumber) ? Math.max(largest, idNumber) : largest;
  }, 1000);

  return `app-${largestIdNumber + 1}`;
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function compareDatesDescending(a, b) {
  if (!a && !b) {
    return 0;
  }

  if (!a) {
    return 1;
  }

  if (!b) {
    return -1;
  }

  return new Date(b).getTime() - new Date(a).getTime();
}
