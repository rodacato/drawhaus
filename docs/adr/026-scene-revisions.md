# ADR-026: Scene Revisions so Replaces Win over Earlier Saves

**Status:** accepted
**Date:** 2026-09-11
**Refines:** ADR-022 (concurrent editing), ADR-025 (first scene as the single write path)

## Context

Two kinds of write reach a scene, and they disagree about what "the scene" is.

`save-scene` **merges**: `updateSceneMerged` takes the union of the stored elements and the
client's, keeping the higher version of each (ADR-022). It has no tombstones for elements the
client dropped, because a client's copy is authoritative only for what it still holds.

A snapshot restore and an API content `PATCH` (ADR-025) **replace**: the stored elements become
exactly what was sent.

A client computes a save from the scene as it knew it, 1.2 s of debounce earlier. When a replace
lands in between, that save arrives describing a world the server has left. The union then puts
the removed elements back, on the server, permanently — the restore looks like it worked on every
canvas, and the next reload brings the old content back. The same holds for a `scene-delta`
already in flight to a peer: the peer merges an element the restore had removed, and its own next
save persists it.

Nothing on the wire said which version of the scene a save was computed against, so the server
could not tell a current save from a stale one.

## Decision

**Every scene carries a `revision`, and only replaces bump it.**

- `scenes.revision` (integer, default 0) is incremented by `updateScene` (restore) and by
  ADR-025's first-scene content write. A merged save never moves it.
- `scene-from-db` carries the revision. Clients tag `save-scene`, `scene-delta` and
  `scene-update` with the revision their copy is based on.
- The server checks the revision inside the same `SELECT ... FOR UPDATE` transaction that merges,
  so a save that waited on a replace's row lock is checked against what that replace committed. A
  save on an older revision writes nothing and the saver receives `scene-from-db` with the current
  scene, which makes it resync.
- Receivers drop a relayed delta tagged with a revision older than their own.
- On `scene-from-db`, a client whose revision changed drops its unsaved local edits: the replace
  wins over anything computed before it. On the same revision — a plain reconnect — it keeps them
  and merges them back on top.
- A payload without a revision is merged unchecked, so a tab open since before this change keeps
  saving until it reloads.

## Alternatives Considered

- **Client-side only: drop pending saves on `scene-from-db`.** Simple and worth doing anyway, but
  it cannot catch the save already emitted before the broadcast arrived, which is exactly the race
  that loses data.
- **Tombstones in the stored scene.** A replace would mark removed elements deleted rather than
  dropping them. The tombstone's version has to outrank the stale save's copy, and a client that
  edited an element before the replace can hold any version, so the tombstone has no safe version
  to claim.
- **Timestamps instead of a counter.** Needs trustworthy client clocks.
- **Merge the PATCH by element version too.** Rejected in ADR-025: API and MCP callers replace the
  whole diagram, and merging resurrects what they deleted.

## Consequences

- A restore, and an API or MCP content write, survive a save computed before it, wherever that
  save was in flight.
- ADR-025's open end narrows: a board that was open during an API write learns about it on its
  next save, which is refused and answered with the current scene, instead of silently putting the
  removed elements back. Broadcasting those writes to live rooms is still the next step, and until
  it exists such a board loses the edits it had not saved when the write landed.
- The REST save fallback (socket down) goes through the same PATCH, so it bumps a revision the
  client never sees. The client forgets its revision after that save and rebases on reconnect
  rather than discarding its work.
- One migration adds a column with a default; nothing needs backfilling, because 0 is a correct
  starting revision for every existing scene.
