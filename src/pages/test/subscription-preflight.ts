import type { SubscriptionStatus } from "../../services/subscription.service";

type SubscriptionStartIssue =
  | { kind: "inactive"; needed: number }
  | { kind: "insufficient"; skill: "writing" | "speaking"; needed: number; remaining: number };

export function getSubscriptionStartIssue(
  selectedSkills: readonly string[],
  status: Pick<SubscriptionStatus, "isActive" | "writingMockRemaining" | "speakingMockRemaining">,
): SubscriptionStartIssue | null {
  const needed = Number(selectedSkills.includes("writing")) + Number(selectedSkills.includes("speaking"));
  if (!status.isActive) return { kind: "inactive", needed };
  for (const skill of ["writing", "speaking"] as const) {
    const remaining = skill === "writing" ? status.writingMockRemaining : status.speakingMockRemaining;
    if (selectedSkills.includes(skill) && remaining < 1) return { kind: "insufficient", skill, needed: 1, remaining };
  }
  return null;
}

// Content mode checks the exact selected server targets; paid legacy mode above is unchanged.
export { getContentStartIssue } from "../../utils/content-access.ts";
