import assert from "node:assert/strict";
import test from "node:test";

import { getSubscriptionStartIssue } from "../src/pages/test/subscription-preflight.ts";

test("reading and listening do not spend writing/speaking rights", () => {
  assert.equal(
    getSubscriptionStartIssue(["reading", "listening"], {
      isActive: true,
      writingMockRemaining: 0, speakingMockRemaining: 0,
    }),
    null,
  );
});

test("a full mock requires each independent writing and speaking pool", () => {
  assert.deepEqual(
    getSubscriptionStartIssue(["reading", "writing", "speaking"], {
      isActive: true,
      writingMockRemaining: 0, speakingMockRemaining: 10,
    }),
    { kind: "insufficient", skill: "writing", needed: 1, remaining: 0 },
  );
  assert.equal(
    getSubscriptionStartIssue(["reading", "writing", "speaking"], {
      isActive: true,
      writingMockRemaining: 1, speakingMockRemaining: 1,
    }),
    null,
  );
});

test("an inactive subscription cannot spend frozen add-on rights", () => {
  assert.deepEqual(
    getSubscriptionStartIssue(["speaking"], {
      isActive: false,
      writingMockRemaining: 0, speakingMockRemaining: 0,
    }),
    { kind: "inactive", needed: 1 },
  );
});
