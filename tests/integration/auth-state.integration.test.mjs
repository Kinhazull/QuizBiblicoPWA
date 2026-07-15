import test from "node:test";
import assert from "node:assert/strict";
import { createSingleFlight } from "../../app/auth-single-flight.ts";

test("multiple auth consumers share one in-flight request", async () => {
  const singleFlight = createSingleFlight();
  let requests = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const task = async () => { requests += 1; await gate; };
  const consumers = Array.from({ length: 8 }, () => singleFlight.run(task));
  assert.equal(requests, 1);
  release();
  await Promise.all(consumers);
  await singleFlight.run(async () => { requests += 1; });
  assert.equal(requests, 2, "a later explicit refresh may issue one new request");
});
