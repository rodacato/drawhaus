# ADR-027: Acknowledged Saves over Fire-and-Forget

**Status:** accepted
**Date:** 2026-09-11
**Refines:** ADR-007 (socket protocol design), ADR-026 (scene revisions)

## Context

`save-scene` was fire-and-forget in both directions.

The client emitted it, set the badge to `Saving...` and resolved its `flushSave()` promise with
`true` on the spot. Ctrl+S therefore toasted "Diagrama guardado" the moment the frame left the
browser — before the server had received it, let alone written it. An E2E test that dropped every
edit frame and then pressed Ctrl+S still got the success toast.

The server had four paths that returned without telling anyone: the socket was not in the room,
the sender could not edit, no scene id could be resolved, and ADR-026's stale save. Only
`scene-saved` ever cleared the badge, so each of those left the board reading `Saving...` forever.
A thrown error was worse: the handler answered `room-error`, which the client treats as a failed
connection — it flipped the board to the connection-lost state and started the offline snapshot
timer over what was really one rejected write. ADR-026 made that visible: a stale or foreign
`sceneId` began surfacing as "Save failed" on a board that was perfectly connected.

## Decision

**A save reports its outcome on a Socket.IO acknowledgement, and save failures never travel as
`room-error`.**

- `onEvent` forwards the trailing ack callback to the handler when the client sends one. It is
  optional: handlers that do not take it, and clients that do not send one, are unaffected. The
  wrapper answers `{ ok: false, reason: "invalid-payload" }` for a payload the schema rejects and
  `{ ok: false, reason: "server-error" }` when a handler throws, and it answers at most once.
- `save-scene` answers every path: `{ ok: true, sceneId }` once the write is committed, or
  `{ ok: false, reason }` with `not-in-room`, `forbidden`, `no-scene`, `stale` or `server-error`.
  The success ack is sent before the interval snapshot and the Drive sync, which are
  fire-and-forget and must not hold the client's save open.
- The client emits with `socket.timeout(SAVE_ACK_TIMEOUT_MS)`. It reports `saved` only on
  `{ ok: true }`; a refusal and a timeout both map to `error` and make `flushSave()` resolve
  `false`, so the Ctrl+S toast and the `onBeforeLeave` guard follow the server, not the wire.
- `scene-saved` stays as it was. It is the compatibility path for a tab older than this change,
  and the client keeps listening to it, so a current client against an older server still shows a
  correct badge.

## Alternatives Considered

- **A dedicated `scene-save-error` event.** Symmetric with `scene-saved` and needs no ack support
  in `onEvent`, but it cannot be correlated with the save that caused it, and it says nothing when
  the frame never arrives — which is the failure the E2E test pins. The timeout is only available
  on an ack.
- **Keep `room-error` and teach the client to tell save failures apart.** The message string would
  become the contract, and a save failure would still ride the channel whose meaning is "this
  session is broken".
- **No timeout, wait for the ack forever.** Leaves the current client stuck against a server that
  never acknowledges — the exact bug, moved one layer down. The timeout is also what keeps
  `onBeforeLeave` from hanging when navigating away.

## Consequences

- The saved toast, the save badge and the leave-the-board guard now mean the server wrote it.
- `room-error` is emitted only by the room join handlers, so the client treating it as a lost
  connection is finally correct.
- A save that is refused now surfaces as `Error` where it used to hang on `Saving...`. A stale
  save (ADR-026) is one of these: the canvas is replaced with the server's scene and the save is
  reported as failed, because it was.
- A client older than this change sends no callback and keeps working off `scene-saved`; a client
  newer than the server it talks to falls back to the timeout and reports an error for a save that
  may have succeeded. Both are deploy-window states.
- The timeout is 5 s: comfortably above a save round trip, below Socket.IO's own ~25 s heartbeat
  detection so a dead connection surfaces as a failed save rather than a hang, and low enough to
  bound the wait when leaving a board.
