import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeElements } from "../../infrastructure/http/public-api/sanitize-elements";

const sanitize = (text: string) =>
  (sanitizeElements([{ type: "text", text }])[0] as Record<string, unknown>).text as string;

const LIVE_TAG = /<[^<>]*>/;

function fixedPointReference(value: string): string {
  let previous: string;
  let current = value;
  do {
    previous = current;
    current = current.replace(/<[^<>]*>/g, "");
  } while (current !== previous);
  return current;
}

function* stringsOver(alphabet: string[], maxLength: number): Generator<string> {
  let layer = [""];
  for (let length = 0; length <= maxLength; length++) {
    yield* layer;
    layer = layer.flatMap((prefix) => alphabet.map((ch) => prefix + ch));
  }
}

function elapsedMs(run: () => void): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

describe("sanitizeElements", () => {
  it("strips a plain tag", () => {
    assert.equal(sanitize("<b>hi</b>"), "hi");
  });

  it("strips nested markup that a single pass would reassemble", () => {
    assert.equal(sanitize("<<a>script>alert(1)<</a>script>"), "alert(1)");
    assert.equal(sanitize("<<<a>b>script>x"), "x");
    assert.equal(sanitize("<scr<b>ipt>x</scr<i>ipt>"), "x");
  });

  it("leaves an unpaired angle bracket untouched", () => {
    assert.equal(sanitize("a < b"), "a < b");
    assert.equal(sanitize("x > 3"), "x > 3");
    assert.equal(sanitize("3 > 2 < 5"), "3 > 2 < 5");
  });

  it("strips tags that follow a bracket which never closes", () => {
    assert.equal(sanitize("1 < 2 <i>x</i> <<b>i>y"), "1 < 2 x y");
  });

  it("returns text without angle brackets byte-identical", () => {
    const text = '  Plan Q3 — café 🎉\n\ttabs & "quotes"  ';
    assert.equal(sanitize(text), text);
  });

  it("matches stripping tags to a fixed point on every short bracket string", () => {
    for (const text of stringsOver(["<", ">", "a", "/"], 8)) {
      assert.equal(sanitize(text), fixedPointReference(text), JSON.stringify(text));
    }
  });

  it("never leaves a live tag in its output", () => {
    for (const text of stringsOver(["<", ">", "s", " "], 8)) {
      const output = sanitize(text);
      assert.ok(!LIVE_TAG.test(output), `${JSON.stringify(text)} -> ${JSON.stringify(output)}`);
    }
  });

  it("stays linear in the input length", () => {
    const depth = 40_000;
    const inputs = [
      "<".repeat(depth) + "x" + ">".repeat(depth),
      "<" + "<".repeat(depth) + "x" + ">".repeat(depth),
      "<a>".repeat(depth) + "<".repeat(depth) + "script" + ">".repeat(depth),
    ];
    for (const text of inputs) {
      assert.ok(elapsedMs(() => sanitize(text)) < 500, `${text.length} chars took too long`);
    }
  });

  it("ignores elements without a string text", () => {
    const input = [{ type: "rectangle", x: 0 }, null, "raw"];
    assert.deepEqual(sanitizeElements(input), input);
  });
});
