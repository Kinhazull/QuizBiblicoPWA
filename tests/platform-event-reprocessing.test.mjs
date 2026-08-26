import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../scripts/reprocess-event-consumer.mjs", import.meta.url), "utf8");
test("dead-letter reprocessing is bounded to the known achievement receipt and defaults to dry-run", () => {
  assert.match(source, /"platform-achievements"/);
  assert.match(source, /expectedErrorCode: "achievement_catalog_conflict"/);
  assert.match(source, /apply = false/);
  assert.match(source, /REPROCESS_SINGLE_DEAD_LETTER/);
  assert.match(source, /state='dead_letter' AND attempt_count=5/);
  assert.match(source, /other_consumers_not_completed/);
  assert.doesNotMatch(source, /platform-statistics.*retryable_failed|reward-progress.*retryable_failed|platform-missions.*retryable_failed/);
});
