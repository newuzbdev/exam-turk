export const AGE_DECLARATION_VERSION = "adult-self-declaration-2026-10-10-v2";

export type StudentAgeDeclaration = {
  ageStatus?: "UNKNOWN" | "ADULT_DECLARED" | "INELIGIBLE";
  ageDeclaredAt?: string | null;
  ageDeclarationVersion?: string | null;
};

export function hasAdultDeclaration(user: StudentAgeDeclaration | null | undefined) {
  return user?.ageStatus === "ADULT_DECLARED" && Boolean(user.ageDeclaredAt) &&
    user.ageDeclarationVersion === AGE_DECLARATION_VERSION;
}
