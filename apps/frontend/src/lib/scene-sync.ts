import type { ElementDelta, ExcalidrawElement } from "@drawhaus/helpers";

type Versioned = { id?: string; version: number };

/**
 * What this client shares with the room, element by element: the version it last sent or
 * received, and which local edits no save has carried yet. It compares version numbers rather
 * than element objects because Excalidraw mutates elements in place while they are dragged.
 */
export class SceneSync {
  private readonly shared = new Map<string, number>();
  private readonly unsaved = new Set<string>();
  // Until the server's scene arrives there is no baseline, so nothing counts as a local edit.
  private ready = false;

  get sharedCount(): number {
    return this.shared.size;
  }

  /** The server's full scene becomes the baseline. */
  reset(elements: readonly unknown[]): void {
    this.shared.clear();
    this.unsaved.clear();
    this.ready = true;
    this.markShared(elements);
  }

  /** Elements the room already has, such as a teammate's change that was just applied. */
  markShared(elements: readonly unknown[]): void {
    for (const el of elements as Versioned[]) {
      if (el.id) this.shared.set(el.id, el.version);
    }
  }

  forget(ids: readonly string[]): void {
    for (const id of ids) {
      this.shared.delete(id);
      this.unsaved.delete(id);
    }
  }

  /** Ids with local edits that the room or the server has not seen yet. */
  editedIds(elements: readonly unknown[]): Set<string> {
    if (!this.ready) return new Set();
    const ids = new Set(this.unsaved);
    for (const el of elements as Versioned[]) {
      if (el.id && this.shared.get(el.id) !== el.version) ids.add(el.id);
    }
    return ids;
  }

  /** The elements that carry such edits. */
  localEdits<T>(elements: readonly T[]): T[] {
    const edited = this.editedIds(elements);
    return elements.filter((el) => edited.has((el as Versioned).id ?? ""));
  }

  hasChanges(elements: readonly unknown[]): boolean {
    if (!this.ready) return false;
    let known = 0;
    for (const el of elements as Versioned[]) {
      if (!el.id) continue;
      if (this.shared.get(el.id) !== el.version) return true;
      known += 1;
    }
    return known !== this.shared.size;
  }

  /** Local changes since the last call. From now on they count as shared, and wait for a save. */
  takeChanges(elements: readonly unknown[]): ElementDelta {
    if (!this.ready) return { changed: [], removedIds: [] };
    const changed: ExcalidrawElement[] = [];
    const present = new Set<string>();
    for (const el of elements as Versioned[]) {
      if (!el.id) continue;
      present.add(el.id);
      if (this.shared.get(el.id) === el.version) continue;
      changed.push(el as ExcalidrawElement);
      this.shared.set(el.id, el.version);
      this.unsaved.add(el.id);
    }
    const removedIds = [...this.shared.keys()].filter((id) => !present.has(id));
    for (const id of removedIds) {
      this.shared.delete(id);
      this.unsaved.add(id);
    }
    return { changed, removedIds };
  }

  hasUnsaved(): boolean {
    return this.unsaved.size > 0;
  }

  /** A save carrying the whole current scene is on its way. */
  markSaved(): void {
    this.unsaved.clear();
  }
}
