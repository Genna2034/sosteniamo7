export class UnauthorizedError extends Error { code = "UNAUTHORIZED" as const; }
export class ForbiddenError extends Error { code = "FORBIDDEN" as const; }
export class NotFoundError extends Error { code = "NOT_FOUND" as const; }
