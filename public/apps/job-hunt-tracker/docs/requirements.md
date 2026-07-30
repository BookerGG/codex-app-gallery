# Requirements

## Product Brief

The Job Hunt Tracker helps a job seeker organize applications, monitor their pipeline, and focus on the next useful action.

## Target User

A junior developer, career changer, student, or early-career professional applying to multiple roles at once.

## User Stories

- As a job seeker, I want to add a job application so I can track each opportunity.
- As a job seeker, I want to update or view the status of an application so I know where it stands.
- As a job seeker, I want to edit an application so I can keep company details, contacts, and next steps accurate.
- As a job seeker, I want to delete applications so my tracker stays clean.
- As a job seeker, I want to archive jobs that become unpursuable so my active tracker stays focused.
- As a job seeker, I want to restore archived jobs so I can pursue them again if circumstances change.
- As a job seeker, I want my tracker changes saved locally so my list survives a page refresh.
- As a job seeker, I want to reset to sample data so I can recover the original demo state.
- As a job seeker, I want to delete all listings so I can start a new tracker from scratch.
- As a job seeker, I want to filter applications by status so I can focus on relevant next steps.
- As a job seeker, I want a board view so I can scan my pipeline by status.
- As a job seeker, I want to export listings to PDF so I can save or share a readable report.
- As a job seeker, I want to search applications so I can quickly find a company or role.
- As a job seeker, I want dashboard metrics so I can understand my search activity.

## MVP Scope

Included:

- Application list
- Status filter
- Search
- Create and edit application form
- Delete application action
- Archive and restore actions for unpursuable jobs
- Browser-local save and load behavior
- Reset sample data action
- Start blank tracker action
- Table and board views
- PDF export for filtered listings
- Summary cards
- Mock data
- Tests for filtering, summary, create, update, delete, archive, restore, save, load, and reset helper logic

Not included yet:

- Login
- Database persistence
- Calendar integration
- Email reminders

## Acceptance Criteria

- Users can see realistic application records when the app loads.
- Users can filter by every supported status.
- Users can search text across common application fields.
- Users can add a new application and immediately see it in the list.
- Users can edit an existing application and see the customized listing in the table.
- Users can delete an application from the table.
- Users can archive an unpursuable application and remove it from active views.
- Users can open the archive and restore an archived application.
- Users can refresh the page and keep locally saved changes.
- Users can reset the tracker back to the original sample applications.
- Users can delete all listings and keep the blank tracker after refresh.
- Users can switch between table and board views.
- Users can export the current filtered listings to a PDF file.
- Summary metrics update when a new application is added.
