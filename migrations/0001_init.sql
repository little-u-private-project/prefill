-- A preset is identified by what the user called it, so saving upserts by name.
CREATE TABLE presets (
  name       TEXT PRIMARY KEY,
  form_id    TEXT NOT NULL,
  form_title TEXT NOT NULL DEFAULT '',
  answers    TEXT NOT NULL CHECK (json_valid(answers)),
  updated    TEXT NOT NULL
);

-- Newest first is ORDER BY id DESC, which needs no extra index. `preset` is a
-- name snapshot, not a foreign key, so history survives a preset being deleted.
-- `vals` because `values` is an SQL keyword.
CREATE TABLE history (
  id         INTEGER PRIMARY KEY,
  at         TEXT NOT NULL,
  form_id    TEXT NOT NULL,
  form_title TEXT NOT NULL DEFAULT '',
  preset     TEXT NOT NULL DEFAULT '',
  vals       TEXT NOT NULL CHECK (json_valid(vals)),
  url        TEXT NOT NULL
);
