export const APPLICATION_STORAGE_KEY = "job-hunt-tracker.applications.v1";

export function loadApplications(storage, fallbackApplications = []) {
  try {
    const savedValue = storage?.getItem(APPLICATION_STORAGE_KEY);

    if (!savedValue) {
      return [...fallbackApplications];
    }

    const parsedApplications = JSON.parse(savedValue);

    if (!Array.isArray(parsedApplications)) {
      return [...fallbackApplications];
    }

    const hasOnlyValidRecords = parsedApplications.every(isApplicationRecord);

    return hasOnlyValidRecords ? parsedApplications : [...fallbackApplications];
  } catch {
    return [...fallbackApplications];
  }
}

export function saveApplications(storage, applications) {
  try {
    storage?.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(applications));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedApplications(storage) {
  try {
    storage?.removeItem(APPLICATION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasSavedApplications(storage) {
  try {
    return Boolean(storage?.getItem(APPLICATION_STORAGE_KEY));
  } catch {
    return false;
  }
}

function isApplicationRecord(application) {
  return Boolean(
    application &&
      typeof application.id === "string" &&
      typeof application.company === "string" &&
      typeof application.role === "string" &&
      typeof application.status === "string"
  );
}
