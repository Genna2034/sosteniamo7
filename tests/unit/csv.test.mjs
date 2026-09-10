import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../../src/lib/csv.ts";

test("csv con BOM, separatore ; e decimali italiani", () => {
  const out = toCsv(["a", "b", "c"], [{ a: "x", b: 1.5, c: null }, { a: 'con "virgolette"; e punto e virgola', b: 2, c: "riga\nnuova" }]);
  const lines = out.split("\r\n");
  assert.ok(out.startsWith("\uFEFF"));
  assert.equal(lines[0], "\uFEFFa;b;c");
  assert.equal(lines[1], "x;1,5;");
  assert.equal(lines[2], '"con ""virgolette""; e punto e virgola";2;"riga\nnuova"');
});
