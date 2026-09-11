import type {
  CommentChanged,
  RealtimeNotifier,
  SceneReplaced,
  SnapshotCreated,
  SnapshotRestored,
} from "../../domain/ports/realtime-notifier";

export class FakeRealtimeNotifier implements RealtimeNotifier {
  readonly scenesReplaced: SceneReplaced[] = [];
  readonly snapshotsRestored: SnapshotRestored[] = [];
  readonly snapshotsCreated: SnapshotCreated[] = [];
  readonly commentsChanged: CommentChanged[] = [];

  sceneReplaced(event: SceneReplaced): void {
    this.scenesReplaced.push(event);
  }

  snapshotRestored(event: SnapshotRestored): void {
    this.snapshotsRestored.push(event);
  }

  snapshotCreated(event: SnapshotCreated): void {
    this.snapshotsCreated.push(event);
  }

  commentChanged(event: CommentChanged): void {
    this.commentsChanged.push(event);
  }
}
