# Security Specification

## Data Invariants
- An invite must have a unique ID.
- A guest should optionally belong to an invite.
- Only admins (defined in `/admins/{uid}`) can read/write everything.
- Public users can read a specific invite if they know the ID.
- Public users can read guests associated with that invite ID.
- Public users can only update the `is_coming` and `updated_at` fields of guests associated with their invite.

## The "Dirty Dozen" Payloads (Targets for Denial)
1. **Invite Spoofing**: Attempt to create an invite as a non-admin.
2. **Guest Identity Theft**: Attempt to update a guest's name as a non-admin.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a guest profile.
4. **Admin Escalation**: Attempt to add own email to `/admins/` collection.
5. **ID Poisoning**: Attempt to create an invite with a 2MB string ID.
6. **Cross-Invite Update**: Attempt to update a guest belonging to invite A using invite B's session.
7. **Resource Exhaustion**: Attempt to create 1000 guests in a single batch.
8. **PII Leak**: Attempt to list all guests without being an admin.
9. **Role Modification**: Attempt to change own 'role' field (e.g., to 'Groomsman') as a guest.
10. **Timestamp Fraud**: Attempt to set a past `updated_at` date.
11. **Bulk Scrape**: Attempt to `list` invites collection.
12. **Orphaned Guest**: Attempt to create a guest with a non-existent `invite_id`.

## Test Plan
- Run `firestore.rules.test.ts` to verify blockages.
