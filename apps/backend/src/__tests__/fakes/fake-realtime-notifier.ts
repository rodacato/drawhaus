import type {
  AccessRevoked,
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
  readonly accessesRevoked: AccessRevoked[] = [];

  /** `onAccessRevoked` lets a test look at the credential store at the moment of the revoke. */
  constructor(private readonly onAccessRevoked: (event: AccessRevoked) => void = () => {}) {}

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

  accessRevoked(event: AccessRevoked): void {
    this.onAccessRevoked(event);
    this.accessesRevoked.push(event);
  }
}
