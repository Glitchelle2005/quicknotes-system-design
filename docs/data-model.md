# QuickNotes data model

QuickNotes uses PostgreSQL as its primary relational store. IDs are UUIDs, timestamps are stored as `TIMESTAMPTZ` in UTC, and the authenticated user owns notes and tags. The schema keeps the user-facing tag association explicit and enforces referential integrity.

## Entities and relationships

- **users**: one row per account; `id` is the primary key.
- **notes**: one user can own many notes (one-to-many). Each note has exactly one owner through `notes.user_id`.
- **tags**: one user can define many tags (one-to-many). Tag names are unique per user.
- **note_tags**: a note can have many tags and a tag can be attached to many notes (many-to-many), represented by a join table whose composite primary key prevents duplicate associations.

Foreign keys cascade when an account, note, or tag is deleted so that no orphaned notes or associations remain. The `note_tags` constraints also prevent connecting one user's note to another user's tag at the database level.

## PostgreSQL DDL

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notes_id_user_unique UNIQUE (id, user_id)
);

CREATE TABLE tags (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tags_user_name_unique UNIQUE (user_id, name),
    CONSTRAINT tags_id_user_unique UNIQUE (id, user_id)
);

CREATE TABLE note_tags (
    note_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id, user_id) REFERENCES notes(id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id, user_id) REFERENCES tags(id, user_id) ON DELETE CASCADE
);

CREATE INDEX notes_user_updated_idx ON notes (user_id, updated_at DESC, id DESC);
CREATE INDEX note_tags_tag_idx ON note_tags (tag_id, note_id);
```

The `notes_user_updated_idx` supports the common per-user, most-recently-updated listing and keyset pagination. `note_tags_tag_idx` supports looking up notes by a selected tag.

## Example queries

List a user's newest notes with a stable cursor:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = :user_id
  AND (updated_at, id) < (:cursor_updated_at, :cursor_id)
ORDER BY updated_at DESC, id DESC
LIMIT 50;
```

Find notes carrying a particular tag (JOIN):

```sql
SELECT n.id, n.title, n.body, n.updated_at
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id AND nt.user_id = n.user_id
JOIN tags AS t ON t.id = nt.tag_id AND t.user_id = nt.user_id
WHERE n.user_id = :user_id
  AND t.name = :tag_name
ORDER BY n.updated_at DESC, n.id DESC;
```

Create an association without duplicating an existing one:

```sql
INSERT INTO note_tags (note_id, tag_id, user_id)
VALUES (:note_id, :tag_id, :user_id)
ON CONFLICT (note_id, tag_id) DO NOTHING;
```

Count notes per user, including users with no notes:

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

## SQL versus NoSQL

A relational database is the better fit because accounts, notes, tags, ownership, and note-tag associations have clear relationships and integrity rules. Transactions make multi-step note/tag updates reliable, while indexes support predictable user-scoped queries. PostgreSQL also allows the service to add JSONB fields later for genuinely flexible attributes without giving up foreign keys and transactional consistency. A document store could simplify some denormalized reads, but would shift consistency and relationship enforcement into application code without a compelling need here.
