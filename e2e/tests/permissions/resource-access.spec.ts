import { test, expect } from "../../fixtures/test";
import { createDiagram, getDiagram } from "../../fixtures/api";

test.describe("Resource Access", () => {
  test("a user can read their own diagram", async ({ createUser }) => {
    const owner = await createUser("owner");
    const diagram = await createDiagram(owner.api, { title: "My Own Diagram" });

    expect((await owner.api.get(`/api/diagrams/${diagram.id}`)).ok()).toBeTruthy();
  });

  test("another user cannot read the diagram", async ({ createUser }) => {
    const owner = await createUser("owner");
    const outsider = await createUser("outsider");
    const diagram = await createDiagram(owner.api, { title: "Private Diagram" });

    expect((await outsider.api.get(`/api/diagrams/${diagram.id}`)).ok()).toBeFalsy();
  });

  test("another user cannot rename the diagram", async ({ createUser }) => {
    const owner = await createUser("owner");
    const outsider = await createUser("outsider");
    const diagram = await createDiagram(owner.api, { title: "Private Diagram" });

    const res = await outsider.api.patch(`/api/diagrams/${diagram.id}`, {
      data: { title: "Hacked" },
    });

    expect(res.ok()).toBeFalsy();
    expect((await getDiagram(owner.api, diagram.id)).title).toBe("Private Diagram");
  });

  test("another user cannot delete the diagram", async ({ createUser }) => {
    const owner = await createUser("owner");
    const outsider = await createUser("outsider");
    const diagram = await createDiagram(owner.api, { title: "Private Diagram" });

    const res = await outsider.api.delete(`/api/diagrams/${diagram.id}`);

    expect(res.ok()).toBeFalsy();
    expect((await owner.api.get(`/api/diagrams/${diagram.id}`)).ok()).toBeTruthy();
  });
});
