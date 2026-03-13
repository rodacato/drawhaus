import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UpdateTemplateUseCase } from "../../../application/use-cases/templates/update-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

describe("UpdateTemplateUseCase", () => {
  it("renames a template owned by the user", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new UpdateTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "Old Name",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    const updated = await useCase.execute(created.id, "user-1", { title: "New Name" });
    assert.equal(updated.title, "New Name");
  });

  it("updates multiple fields at once", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new UpdateTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "Original",
      description: "Old desc",
      category: "general",
      elements: [],
      appState: {},
    });

    const updated = await useCase.execute(created.id, "user-1", {
      title: "Updated",
      description: "New desc",
      category: "architecture",
    });

    assert.equal(updated.title, "Updated");
    assert.equal(updated.description, "New desc");
    assert.equal(updated.category, "architecture");
  });

  it("throws NotFoundError for non-existent template", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new UpdateTemplateUseCase(templates);

    await assert.rejects(
      () => useCase.execute("nonexistent", "user-1", { title: "x" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws ForbiddenError when user is not the creator", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new UpdateTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "Mine",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await assert.rejects(
      () => useCase.execute(created.id, "user-2", { title: "Stolen" }),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("throws ForbiddenError for built-in templates", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new UpdateTemplateUseCase(templates);

    const created = await templates.create({
      creatorId: "user-1",
      title: "Built-in",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });
    created.isBuiltIn = true;

    await assert.rejects(
      () => useCase.execute(created.id, "user-1", { title: "Modified" }),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });
});
