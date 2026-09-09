import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeElements } from "../../infrastructure/http/public-api/sanitize-elements";

const textOf = (elements: unknown[]) =>
  (elements[0] as Record<string, unknown>).text as string;

describe("sanitizeElements", () => {
  it("strips a plain tag", () => {
    assert.equal(textOf(sanitizeElements([{ type: "text", text: "<b>hi</b>" }])), "hi");
  });

  it("strips nested markup that a single pass would reassemble", () => {
    const payload = "<<a>script>alert(1)<</a>script>";
    assert.equal(textOf(sanitizeElements([{ type: "text", text: payload }])), "alert(1)");
  });

  it("leaves an unpaired angle bracket untouched", () => {
    assert.equal(textOf(sanitizeElements([{ type: "text", text: "a < b" }])), "a < b");
  });

  it("ignores elements without a string text", () => {
    const input = [{ type: "rectangle", x: 0 }, null, "raw"];
    assert.deepEqual(sanitizeElements(input), input);
  });
});
