import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JoinRoomUseCase } from "../../../application/use-cases/realtime/join-room";
import { JoinRoomGuestUseCase } from "../../../application/use-cases/realtime/join-room-guest";
import { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import { CreateShareLinkUseCase } from "../../../application/use-cases/share/create-link";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { UnauthorizedError, NotFoundError } from "../../../domain/errors";

describe("JoinRoomUseCase", () => {
  it("authenticated user can join own room", async () => {
    const users = new InMemoryUserRepository();
    const sessions = new InMemorySessionRepository(() => users.store);
    const diagrams = new InMemoryDiagramRepository();
    const joinRoom = new JoinRoomUseCase(sessions, diagrams);
    const createDiagram = new CreateDiagramUseCase(diagrams);

    const user = await users.create({ email: "a@b.com", name: "A", passwordHash: "h" });
    const session = await sessions.create(user.id);
    const diagram = await createDiagram.execute({ ownerId: user.id });

    const result = await joinRoom.execute(session.token, diagram.id);
    assert.equal(result.role, "owner");
    assert.equal(result.user.id, user.id);
  });

  it("rejects without session", async () => {
    const users = new InMemoryUserRepository();
    const sessions = new InMemorySessionRepository(() => users.store);
    const diagrams = new InMemoryDiagramRepository();
    const joinRoom = new JoinRoomUseCase(sessions, diagrams);

    await assert.rejects(
      () => joinRoom.execute(null, "some-room"),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("rejects if no access to diagram", async () => {
    const users = new InMemoryUserRepository();
    const sessions = new InMemorySessionRepository(() => users.store);
    const diagrams = new InMemoryDiagramRepository();
    const joinRoom = new JoinRoomUseCase(sessions, diagrams);
    const createDiagram = new CreateDiagramUseCase(diagrams);

    const owner = await users.create({ email: "owner@b.com", name: "O", passwordHash: "h" });
    const stranger = await users.create({ email: "stranger@b.com", name: "S", passwordHash: "h" });
    const session = await sessions.create(stranger.id);
    await createDiagram.execute({ ownerId: owner.id });

    const diagram = diagrams.store[0];
    await assert.rejects(
      () => joinRoom.execute(session.token, diagram.id),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});

describe("JoinRoomGuestUseCase", () => {
  it("guest can join via valid share link", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const joinGuest = new JoinRoomGuestUseCase(shares, diagrams);
    const createDiagram = new CreateDiagramUseCase(diagrams);
    const createLink = new CreateShareLinkUseCase(shares, diagrams);

    const diagram = await createDiagram.execute({ ownerId: "user-1", title: "Shared" });
    const link = await createLink.execute({ diagramId: diagram.id, userId: "user-1", role: "editor" });

    const result = await joinGuest.execute(link.token);
    assert.equal(result.role, "editor");
    assert.equal(result.diagramId, diagram.id);
  });

  it("rejects invalid share token", async () => {
    const diagrams = new InMemoryDiagramRepository();
    const shares = new InMemoryShareRepository();
    const joinGuest = new JoinRoomGuestUseCase(shares, diagrams);

    await assert.rejects(
      () => joinGuest.execute("bad-token"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});
