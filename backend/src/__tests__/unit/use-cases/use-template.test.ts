import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UseTemplateUseCase } from "../../../application/use-cases/templates/use-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";
import { InMemoryDiagramRepository } from "../../fakes/in-memory-diagram-repository";
import { NotFoundError } from "../../../domain/errors";

describe("UseTemplateUseCase", () => {
  it("creates a diagram from a template", async () => {
    const templates = new InMemoryTemplateRepository();
    const diagrams = new InMemoryDiagramRepository();
    const useCase = new UseTemplateUseCase(templates, diagrams);

    const template = await templates.create({
      creatorId: "author",
      title: "Architecture",
      description: "Arch template",
      category: "architecture",
      elements: [{ type: "rectangle", id: "r1" }],
      appState: { zoom: 1.5 },
    });

    const diagram = await useCase.execute({
      templateId: template.id,
      userId: "user-1",
    });

    assert.equal(diagram.ownerId, "user-1");
    assert.equal(diagram.title, "Architecture");
    assert.deepEqual(diagram.elements, [{ type: "rectangle", id: "r1" }]);
    assert.equal(diagrams.store.length, 1);
  });

  it("uses custom title when provided", async () => {
    const templates = new InMemoryTemplateRepository();
    const diagrams = new InMemoryDiagramRepository();
    const useCase = new UseTemplateUseCase(templates, diagrams);

    const template = await templates.create({
      creatorId: "author",
      title: "Default Name",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    const diagram = await useCase.execute({
      templateId: template.id,
      userId: "user-1",
      title: "My Custom Board",
    });

    assert.equal(diagram.title, "My Custom Board");
  });

  it("throws NotFoundError for non-existent template", async () => {
    const templates = new InMemoryTemplateRepository();
    const diagrams = new InMemoryDiagramRepository();
    const useCase = new UseTemplateUseCase(templates, diagrams);

    await assert.rejects(
      () => useCase.execute({ templateId: "nonexistent", userId: "user-1" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("increments usage count after creating diagram", async () => {
    const templates = new InMemoryTemplateRepository();
    const diagrams = new InMemoryDiagramRepository();
    const useCase = new UseTemplateUseCase(templates, diagrams);

    const template = await templates.create({
      creatorId: "author",
      title: "Popular",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await useCase.execute({ templateId: template.id, userId: "user-1" });
    // Wait a tick for the fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 10));

    const updated = await templates.findById(template.id);
    assert.equal(updated!.usageCount, 1);
  });
});
