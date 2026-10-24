# Security Specification — Home of Emotions Therapy Platform

## 1. Data Invariants

1. **PII Isolation Invariant (Pillar 6)**: User Personally Identifiable Information (`email`, `phone`, `emergencyContact`) is strictly isolated in `/users/{userId}/private/{docId}` and never stored in `/users/{userId}` or `/appointments/{appointmentId}`. Only the owner (`request.auth.uid == userId`) or a verified platform admin can read or write `/users/{userId}/private/{docId}`.
2. **Master Gate & Relational Sync (Pillar 1)**: A private profile document `/users/{userId}/private/{docId}` cannot exist or be accessed unless the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`).
3. **Appointment Ownership & Terminal State Locking (Pillar 4 & Phase 4.6)**:
   - An appointment can only be created by a verified authenticated client where `incoming().clientId == request.auth.uid`.
   - Once an appointment reaches terminal state `status == 'completed'` or `status == 'cancelled'`, no further updates are permitted (except by `isAdmin()`).
   - Updates are strictly partitioned into named actions (`isRescheduleAction`, `isCompleteOrCancelAction`, `isReminderToggleAction`) with explicit `affectedKeys().hasOnly(...)` guards.
4. **Encrypted Patient Records Confidentiality**: Every document in `/encryptedRecords/{recordId}` must enforce `encryptionAlgorithm == 'AES-256-GCM'`, valid `cipherText` (12..8192 chars), `iv` (8..64 chars), and `salt` (8..64 chars). Only `ownerId` or assigned `therapistId` can read or list records.
5. **Query Enforcer (Pillar 8)**: Every `allow list` rule explicitly constrains `resource.data` against `request.auth.uid` (or unbooked slot status for `/therapistAvailability`) without delegating filtering to the client and without invoking `get()`/`exists()` inside `list`.
6. **Temporal & Identity Immutability**: All `createdAt` fields must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on every update.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Identity Spoofing on Appointment Create**: Authenticated user `user_A` attempts to create `/appointments/apt_1` with `clientId: "user_B"`.
   - *Expected*: `PERMISSION_DENIED` (`incoming().clientId == request.auth.uid` fails).
2. **Payload 2 — Shadow Field Injection on Appointment Create**: User sends all required fields plus `"isFreeSession": true`.
   - *Expected*: `PERMISSION_DENIED` (`data.keys().hasOnly(...)` rejects shadow fields).
3. **Payload 3 — Unverified Email Write**: Authenticated user with `email_verified: false` attempts to book an appointment or write an encrypted record.
   - *Expected*: `PERMISSION_DENIED` (`isVerifiedUser()` requires `request.auth.token.email_verified == true`).
4. **Payload 4 — PII Blanket Read Attack**: Authenticated user `user_B` attempts `get` on `/users/user_A/private/info`.
   - *Expected*: `PERMISSION_DENIED` (`request.auth.uid == userId` fails).
5. **Payload 5 — Orphaned Subcollection Write**: User `user_A` attempts to create `/users/user_A/private/info` before `/users/user_A` exists.
   - *Expected*: `PERMISSION_DENIED` (Master Gate `exists(/databases/$(database)/documents/users/$(userId))` fails).
6. **Payload 6 — Terminal State Mutation**: User `user_A` attempts to update `sessionTime` on `/appointments/apt_1` when `existing().status == 'completed'`.
   - *Expected*: `PERMISSION_DENIED` (Terminal State Lock blocks updates when `existing().status in ['completed', 'cancelled']`).
7. **Payload 7 — Value Poisoning on Update**: User `user_A` updates whitelisted key `sessionTime` on `/appointments/apt_1` with a 10,000-character string or integer `12345`.
   - *Expected*: `PERMISSION_DENIED` (`isValidAppointment(incoming())` wraps the entire `allow update` block and enforces `sessionTime is string && sessionTime.size() <= 32`).
8. **Payload 8 — Immortal Field Tampering**: User `user_A` attempts to modify `createdAt` or `amountInr` during an appointment reschedule update.
   - *Expected*: `PERMISSION_DENIED` (`affectedKeys().hasOnly(['sessionDate', 'sessionTime', 'status', 'updatedAt'])` and immutable checks reject it).
9. **Payload 9 — Forged Client Timestamp**: User `user_A` creates an encrypted record with `createdAt` set to a past timestamp instead of `request.time`.
   - *Expected*: `PERMISSION_DENIED` (`incoming().createdAt == request.time` fails).
10. **Payload 10 — ID Poisoning Attack**: User attempts to create a document with a 300-character ID or special characters `apt_$!@#`.
    - *Expected*: `PERMISSION_DENIED` (`isValidId()` enforces `id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
11. **Payload 11 — Unauthorized List Scraping**: Authenticated user `user_B` runs an unconstrained `list` query on `/encryptedRecords` or `/appointments`.
    - *Expected*: `PERMISSION_DENIED` (`allow list` requires `resource.data.ownerId == request.auth.uid` / `resource.data.clientId == request.auth.uid`).
12. **Payload 12 — Self-Assigned Admin Escalation**: Regular user attempts to create `/admins/user_A` to grant themselves admin rights.
    - *Expected*: `PERMISSION_DENIED` (`/admins` write is strictly restricted to bootstrapped admin).
