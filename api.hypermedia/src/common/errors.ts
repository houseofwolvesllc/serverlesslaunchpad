import { ZodError } from "zod";

/**
 * Base error classes that map to HTTP status codes.
 * These errors are thrown by controllers and decorators,
 * then handled by the global error handler to produce
 * appropriate HTTP responses.
 */

export class HttpError extends Error {
    constructor(
        public readonly status: number,
        public readonly title: string,
        message?: string
    ) {
        super(message || title);
        this.name = this.constructor.name;
    }
}

export class ValidationError extends HttpError {
    constructor(
        message: string,
        public readonly zodError?: ZodError
    ) {
        super(400, "Bad Request", message);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message?: string) {
        super(401, "Unauthorized", message);
    }
}

export class ForbiddenError extends HttpError {
    constructor(message?: string) {
        super(403, "Forbidden", message);
    }
}

export class NotFoundError extends HttpError {
    constructor(message?: string) {
        super(404, "Not Found", message);
    }
}

export class ConflictError extends HttpError {
    constructor(message?: string) {
        super(409, "Conflict", message);
    }
}

export class UnprocessableEntityError extends HttpError {
    constructor(message?: string) {
        super(422, "Unprocessable Entity", message);
    }
}

export class InternalServerError extends HttpError {
    constructor(message?: string) {
        super(500, "Internal Server Error", message);
    }
}