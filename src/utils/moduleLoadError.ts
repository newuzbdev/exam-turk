export function isModuleLoadError(error: unknown): boolean {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message)
    : String(error ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk [\s\S]*failed|Unable to preload CSS/i.test(message);
}
