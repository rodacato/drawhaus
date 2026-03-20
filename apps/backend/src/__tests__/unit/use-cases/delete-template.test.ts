import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DeleteTemplateUseCase } from "../../../application/use-cases/templates/delete-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

describe("DeleteTemplateUseCase", () => {
  it("deletes template owned by user", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new DeleteTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "To Delete",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await useCase.execute(created.id, "user-1");
    assert.equal(templates.store.length, 0);
  });

  it("throws NotFoundError for non-existent template", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new DeleteTemplateUseCase(templates);

    await assert.rejects(
      () => useCase.execute("nonexistent", "user-1"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws ForbiddenError when user is not the creator", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new DeleteTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "Not yours",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await assert.rejects(
      () => useCase.execute(created.id, "user-2"),
      (err: unknown) => err instanceof ForbiddenError,
    );
    assert.equal(templates.store.length, 1);
  });

  it("throws ForbiddenError for built-in templates", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new DeleteTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "Built-in",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });
    // Manually mark as built-in
    created.isBuiltIn = true;

    await assert.rejects(
      () => useCase.execute(created.id, "user-1"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });
});
