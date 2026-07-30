# Data Model

## Ticket

```ts
type Ticket = {
  id: string;
  title: string;
  requester: string;
  assignee: string;
  status: "Open" | "In Progress" | "Waiting" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  createdAt: string;
  channel: "Email" | "Chat" | "Phone" | "Portal";
  customerTier?: "Standard" | "Growth" | "Enterprise";
  notes: string[];
};
```

## Status Meaning

- `Open`: Ticket is new and needs triage.
- `In Progress`: Someone is actively working on it.
- `Waiting`: Team is waiting on the customer or a third party.
- `Resolved`: Issue is solved but not fully closed.
- `Closed`: Ticket is complete and archived from active work.

## Priority Meaning

- `Low`: Minor issue or question.
- `Medium`: Normal support request.
- `High`: Important issue with customer impact.
- `Urgent`: Active blocker or severe impact.

## Future Data Considerations

- Split requester and assignee into user records.
- Add SLA due dates and breach tracking.
- Store public replies separately from internal notes.
- Track ticket history as an audit log.

