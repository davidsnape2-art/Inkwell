# Inkwell Security Specification

## Data Invariants
1. **Ownership**: Every `Story` and `Chapter` must be linked to a valid `authorId` which matches the authenticated user's UID.
2. **Relational Integrity**: A `Chapter` must always reference a valid `Story` ID.
3. **Temporal Integrity**: `createdAt` and `updatedAt` must be strictly enforced via `request.time`.
4. **ID Poisoning**: Document IDs must be valid (regex `^[a-zA-Z0-9_\\-]+$`) and sized correctly.
5. **Private by Default**: All stories are private to their authors.

## The "Dirty Dozen" Payloads (Attacks)

### Attack 1: Identity Spoofing (Create Story for someone else)
```json
{
  "title": "Stolen Story",
  "authorId": "attacker_uid",
  "createdAt": "2026-05-18T20:55:00Z"
}
```
*Expected: PERMISSION_DENIED (authorId doesn't match request.auth.uid)*

### Attack 2: Resource Poisoning (Giant ID)
Path: `/stories/SUPER_LONG_ID_OR_JUNK_CHARACTERS_...`
*Expected: PERMISSION_DENIED (isValidId fails)*

### Attack 3: Shadow Field Injection
```json
{
  "title": "Nice Story",
  "authorId": "my_uid",
  "isAdmin": true,
  "createdAt": "2026-05-18T20:55:00Z"
}
```
*Expected: PERMISSION_DENIED (keys().size() != N or hasOnly() fails)*

### Attack 4: Unauthorized Access (Read other's story)
Operation: `get /stories/somebody_elses_story_id`
*Expected: PERMISSION_DENIED (resource.data.authorId != request.auth.uid)*

### Attack 5: Chapter Orphanage (Chapter for non-existent story)
Operation: `create /stories/fake_story_id/chapters/chapter_1`
*Expected: PERMISSION_DENIED (exists(/stories/fake_story_id) fails)*

### Attack 6: Chapter Theft (Chapter in someone else's story)
Operation: `create /stories/friends_story_id/chapters/chapter_1`
*Expected: PERMISSION_DENIED (author of story doesn't match request.auth.uid)*

### Attack 7: Immutable Field Bypass (Change createdAt)
Operation: `update /stories/my_id` with `{"createdAt": "2000-01-01T00:00:00Z"}`
*Expected: PERMISSION_DENIED (incoming().createdAt == existing().createdAt)*

### Attack 8: State Shortcut (Status skip - if we had status)
*N/A for basic Inkwell, but covered by isValidEntity.*

### Attack 9: Timeless Creation (Client provided timestamp)
```json
{
  "title": "Story",
  "authorId": "my_uid",
  "createdAt": "2026-05-18T00:00:00Z" 
}
```
*Expected: PERMISSION_DENIED (createdAt != request.time)*

### Attack 10: Value Poisoning (Invalid type)
```json
{
  "title": 12345,
  "authorId": "my_uid",
  "createdAt": "request.time"
}
```
*Expected: PERMISSION_DENIED (title is not string)*

### Attack 11: Denial of Wallet (Giant array/string)
```json
{
  "title": "A".repeat(1000000), 
  "authorId": "my_uid",
  "createdAt": "request.time"
}
```
*Expected: PERMISSION_DENIED (title.size() <= MAX)*

### Attack 12: Unauthorized List Scraper
Operation: `list /stories`
*Expected: PERMISSION_DENIED (unless query includes authorId constraint)*
