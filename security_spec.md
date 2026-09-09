# Security Specification

## Data Invariants
1. Users can only read/write their own profiles.
2. Projects can only be read/written by users in their `memberIds` list.
3. Tasks, Comments, ActivityLogs can only be read/written if the user is a member of the parent Project.
4. Notifications can only be read/updated by the recipient (`userId`).
5. Invitations can only be read/created by members of the project or the invitee.

## Dirty Dozen Payloads
1. User creates profile with someone else's ID.
2. User updates another user's profile.
3. User accesses a project they are not a member of.
4. User modifies a project they are not a member of.
5. User adds a task to a project they are not a member of.
6. User modifies a task in a project they are not a member of.
7. User creates a comment on a project they are not a member of.
8. User creates an activity log for a project they are not a member of.
9. User reads notifications for another user.
10. User creates an invitation for a project they are not a member of.
11. User updates an invitation for another invitee.
12. User deletes a project they do not own.
