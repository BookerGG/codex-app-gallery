# Data Model

## JobApplication

```ts
type JobApplication = {
  id: string;
  company: string;
  role: string;
  location: string;
  status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Withdrawn";
  dateApplied: string;
  salaryRange?: string;
  contact?: string;
  nextStep?: string;
  source?: string;
  notes?: string;
};
```

## Status Meaning

- `Saved`: Interesting role that has not been applied to yet.
- `Applied`: Application was submitted and is waiting for a response.
- `Interviewing`: One or more interview steps are active.
- `Offer`: Offer received.
- `Rejected`: Company declined or role closed.
- `Withdrawn`: Candidate chose to stop pursuing the role.

## Future Data Considerations

- Split contacts into their own table.
- Add follow-up tasks with due dates.
- Track interviews as separate events.
- Store application documents, links, and salary details.
- Move from browser-local storage to a database when multi-device sync or accounts are added.
