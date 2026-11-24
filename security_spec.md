# Security Specification — PATOFOOT 2026 (`TrainerProfile`, `CloudSaveHeader`, `CloudSaveSegment`)

## 1. Data Invariants
1. **Strict Ownership (`/users/{userId}`)**: A trainer profile document at `/users/{userId}` can ONLY be read (`get`), created (`create`), or updated (`update`) by the exact authenticated owner (`request.auth != null && request.auth.uid == userId`).
2. **Master Gate on Cloud Saves (`/users/{userId}/cloudSaves/{slotId}`)**: Every single-document operation validates that `/users/{userId}` exists and belongs to `request.auth.uid`, that `slotId` is strictly one of `['autosave', 'slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5']`, and that `uid == userId == request.auth.uid`.
3. **Subcollection Gate & Atomicity on Segments (`/users/{userId}/cloudSaves/{slotId}/segments/{segmentId}`)**: Segment writes require parent header ownership verification via `existsAfter`/`getAfter` during atomic batches or `exists`/`get` on deletion, strictly native Firestore `map`/`list` payloads (`payload is map`), and bounded `segmentIds.size() <= 200`.
4. **No Cross-User List / Query Delegation**: `list` on `/users` is `false`; `list` on `cloudSaves` and `segments` strictly enforces `resource.data.uid == request.auth.uid` on the server side without any `get()`/`exists()` inside `allow list`.
5. **Exact Schema & No Ghost Fields**: Every write runs through `isValidTrainerProfile`, `isValidCloudSaveHeader`, or `isValidCloudSaveSegment` with `hasAll` + `hasOnly` on creation and `affectedKeys().hasOnly(...)` on updates.
6. **Temporal Integrity & Immutability**: `createdAt == request.time` on `create` (`incoming().createdAt == existing().createdAt` on `update`), `updatedAt == request.time` on all writes, and `uid`/`slotId`/`segmentId` remain immutable.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Identity Spoofing on Profile/Save Create**: Authenticated as `user_A`, writing to `/users/user_B/cloudSaves/slot_1` with `{ uid: "user_B", ... }`.
2. **Mismatched Body UID**: Authenticated as `user_A`, writing to `/users/user_A/cloudSaves/slot_1` with `{ uid: "user_B", ... }`.
3. **Invalid Slot ID Injection**: Attempting to write `/users/user_A/cloudSaves/slot_99` (outside allowed enum).
4. **Shadow/Ghost Field Injection on Save Header Update**: Adding `{ isAdmin: true }` or `{ unlimitedMoney: 9999999 }`.
5. **Value Poisoning on Save Header**: Setting `clubName` to a 5,000-character string (`> 80`) or negative `partCount`.
6. **Immutable Field Tampering (`slotId` / `createdAt`)**: Updating `slotId` or `createdAt` during header update.
7. **Forged Client Timestamp**: Passing a client `Timestamp` instead of `serverTimestamp()` (`request.time`) on `updatedAt`.
8. **ID Poisoning**: Creating segment with `/segments/bad$id!spaces` (`!isValidId(segmentId)`).
9. **Unbounded Array / List Poisoning**: Submitting `segmentIds` with `> 200` items or non-string first item.
10. **Non-Map Payload on Segment**: Sending `payload: "json_string_here"` instead of a native Firestore `map`.
11. **Cross-User Cloud Save Enumeration (`list`)**: Authenticated as `user_A`, querying `/users/user_B/cloudSaves`.
12. **Unauthenticated Access**: `request.auth == null` reading or writing any profile, save header, or save segment.
