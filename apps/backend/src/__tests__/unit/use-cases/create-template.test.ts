import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateTemplateUseCase } from "../../../application/use-cases/templates/create-template";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";

describe("CreateTemplateUseCase", () => {
  it("creates template with given data", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new CreateTemplateUseCase(templates);

    const result = await useCase.execute({
      creatorId: "user-1",
      title: "My Template",
      elements: [{ type: "rectangle" }],
      appState: { zoom: 1 },
      category: "architecture",
      description: "A test template",
    });

    assert.equal(result.title, "My Template");
    assert.equal(result.creatorId, "user-1");
    assert.equal(result.category, "architecture");
    assert.equal(result.description, "A test template");
    assert.deepEqual(result.elements, [{ type: "rectangle" }]);
    assert.equal(templates.store.length, 1);
  });

  it("defaults category to general and description to empty", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new CreateTemplateUseCase(templates);

    const result = await useCase.execute({
      creatorId: "user-1",
      title: "Minimal",
      elements: [],
      appState: {},
    });

    assert.equal(result.category, "general");
    assert.equal(result.description, "");
  });

  it("stores workspaceId when provided", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new CreateTemplateUseCase(templates);

    const result = await useCase.execute({
      creatorId: "user-1",
      workspaceId: "ws-1",
      title: "Workspace Template",
      elements: [],
      appState: {},
    });

    assert.equal(result.workspaceId, "ws-1");
  });
});
