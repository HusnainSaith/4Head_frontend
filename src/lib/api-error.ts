export function getApiErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Something went wrong. Please try again.";
  }

  const result = error as Record<string, unknown>;
  if (result.status === 401) return "Invalid email or password.";

  if (typeof result.data === "object" && result.data !== null) {
    const data = result.data as Record<string, unknown>;
    if (Array.isArray(data.details) && data.details.length > 0) {
      return (data.details as string[]).join(", ");
    }
    if (typeof data.message === "string") return data.message;
  }

  return "Something went wrong. Please try again.";
}
