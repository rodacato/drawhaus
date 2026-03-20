import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ListTemplatesUseCase } from "../../../application/use-cases/templates/list-templates";
import { InMemoryTemplateRepository } from "../../fakes/in-memory-template-repository";

describe("ListTemplatesUseCase", () => {
  it("executeMine returns all templates by a user regardless of workspace", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new ListTemplatesUseCase(templates);

    await templates.create({
      creatorId: "user-1",
      title: "Personal Template",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await templates.create({
      creatorId: "user-1",
      workspaceId: "ws-1",
      title: "Workspace Template",
      description: "",
      category: "architecture",
      elements: [],
      appState: {},
    });

    await templates.create({
      creatorId: "user-2",
      title: "Other User Template",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    const mine = await useCase.executeMine("user-1");
    assert.equal(mine.length, 2);
    assert.ok(mine.some((t) => t.title === "Personal Template"));
    assert.ok(mine.some((t) => t.title === "Workspace Template"));
  });

  it("executeByWorkspace returns only workspace templates", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new ListTemplatesUseCase(templates);

    await templates.create({
      creatorId: "user-1",
      workspaceId: "ws-1",
      title: "WS Template",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await templates.create({
      creatorId: "user-1",
      title: "Personal",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    const ws = await useCase.executeByWorkspace("ws-1");
    assert.equal(ws.length, 1);
    assert.equal(ws[0].title, "WS Template");
  });

  it("executeAll returns everything", async () => {
    const templates = new InMemoryTemplateRepository();
    const useCase = new ListTemplatesUseCase(templates);

    await templates.create({
      creatorId: "user-1",
      title: "A",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    await templates.create({
      creatorId: "user-2",
      workspaceId: "ws-1",
      title: "B",
      description: "",
      category: "general",
      elements: [],
      appState: {},
    });

    const all = await useCase.executeAll();
    assert.equal(all.length, 2);
  });
});
