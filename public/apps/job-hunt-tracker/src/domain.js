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

export function groupApplicationsByStatus(applications) {
  return STATUS_OPTIONS.reduce((groups, status) => {
    groups[status] = applications.filter((application) => application.status === status);
    return groups;
  }, {});
}

export function applicationsToPdf(applications, options = {}) {
  const generatedAt = options.generatedAt ?? new Date();
  const bodyLines = createReportLines(applications, options);
  const pages = paginateLines(bodyLines, 42);
  const fontObjectId = 3 + pages.length * 2;
  const objects = [
    { id: 1, value: "<< /Type /Catalog /Pages 2 0 R >>" },
    {
      id: 2,
      value: `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
    }
  ];

  pages.forEach((lines, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = createPdfPageContent(lines, {
      generatedAt,
      pageNumber: index + 1,
      pageCount: pages.length
    });

    objects.push({
      id: pageObjectId,
      value: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    });
    objects.push({
      id: contentObjectId,
      value: `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`
    });
  });

  objects.push({
    id: fontObjectId,
    value: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  });

  return buildPdf(objects);
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

function createReportLines(applications, options) {
  const lines = [
    `${applications.length} listing${applications.length === 1 ? "" : "s"} exported`,
    `Status filter: ${options.statusFilter ?? "All"}`,
    `Search: ${options.searchQuery ? options.searchQuery : "None"}`,
    ""
  ];

  applications.forEach((application, index) => {
    lines.push(`${index + 1}. ${application.company || "Untitled company"} - ${application.role || "Untitled role"}`);
    lines.push(`   Status: ${application.status || "Unknown"} | Applied: ${application.dateApplied || "Not applied"} | Location: ${application.location || "Not listed"}`);
    lines.push(`   Salary: ${application.salaryRange || "Not listed"} | Contact: ${application.contact || "No contact"} | Source: ${application.source || "Not listed"}`);
    wrapReportText(`   Next step: ${application.nextStep || "No next step"}`).forEach((line) => lines.push(line));
    wrapReportText(`   Notes: ${application.notes || "No notes"}`).forEach((line) => lines.push(line));
    lines.push("");
  });

  return lines;
}

function wrapReportText(text, maxLength = 92) {
  const words = sanitizePdfText(text).split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    if (!currentLine) {
      currentLine = word;
      return;
    }

    if (`${currentLine} ${word}`.length > maxLength) {
      lines.push(currentLine);
      currentLine = `      ${word}`;
      return;
    }

    currentLine = `${currentLine} ${word}`;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

function paginateLines(lines, maxLinesPerPage) {
  const pages = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  return pages.length ? pages : [[]];
}

function createPdfPageContent(lines, options) {
  const commands = [
    "BT",
    "/F1 18 Tf",
    "48 744 Td",
    `(${escapePdfText("Job Hunt Tracker Report")}) Tj`,
    "/F1 9 Tf",
    "0 -18 Td",
    `(${escapePdfText(`Generated ${formatReportDate(options.generatedAt)} | Page ${options.pageNumber} of ${options.pageCount}`)}) Tj`,
    "/F1 10 Tf"
  ];

  lines.forEach((line) => {
    commands.push("0 -14 Td");
    commands.push(`(${escapePdfText(line)}) Tj`);
  });

  commands.push("ET");

  return commands.join("\n");
}

function buildPdf(objects) {
  const orderedObjects = [...objects].sort((a, b) => a.id - b.id);
  const offsets = [0];
  let pdf = "%PDF-1.4\n";

  orderedObjects.forEach((object) => {
    offsets[object.id] = byteLength(pdf);
    pdf += `${object.id} 0 obj\n${object.value}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  const size = orderedObjects.length + 1;
  pdf += `xref\n0 ${size}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id < size; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function escapePdfText(value) {
  return sanitizePdfText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function sanitizePdfText(value) {
  return String(value).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function formatReportDate(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}
