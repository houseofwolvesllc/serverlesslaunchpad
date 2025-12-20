import { ALBEvent, ALBResult } from "aws-lambda";
import { HttpError, ValidationError } from "./errors";
import { ResponseBuilder } from "./response_builder";

/**
 * Global error handling utilities for converting errors to HTTP responses
 */
export class ErrorHandler {
    /**
     * Converts errors to appropriate HTTP responses based on content negotiation
     */
    static handleError(error: unknown, event: ALBEvent): ALBResult {
        // Handle known HTTP errors
        if (error instanceof HttpError) {
            return ResponseBuilder.create(event)
                .status(error.status)
                .body(this.formatErrorBody(error))
                .build();
        }

        // Handle validation errors specially
        if (error instanceof ValidationError) {
            return ResponseBuilder.create(event)
                .status(400)
                .body(this.formatValidationError(error))
                .build();
        }

        // Handle unknown errors as internal server errors
        console.error("Unhandled error:", error);
        return ResponseBuilder.create(event)
            .status(500)
            .body({
                error: "Internal Server Error",
                message: "An unexpected error occurred"
            })
            .build();
    }

    private static formatErrorBody(error: HttpError): object {
        return {
            error: error.title,
            message: error.message,
            status: error.status
        };
    }

    private static formatValidationError(error: ValidationError): object {
        const body: { error: string; message: string; details?: unknown } = {
            error: error.title,
            message: error.message
        };

        if (error.zodError) {
            body.details = error.zodError.errors;
        }

        return body;
    }
}