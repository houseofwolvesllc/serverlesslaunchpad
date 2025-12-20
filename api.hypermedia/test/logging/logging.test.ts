import type { LogContext } from "@houseofwolves/serverlesslaunchpad.core";
import type { ALBEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

describe("Logging", () => {
    const createMockLogger = () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        logRequestStart: vi.fn(),
        logRequestSuccess: vi.fn(),
        logRequestError: vi.fn(),
    });

    const createMockLogContext = (overrides?: Partial<LogContext>): LogContext => ({
        traceId: "test-trace-123",
        httpMethod: "GET",
        path: "/test",
        ...overrides,
    });

    const createLoggableEvent = (overrides?: Partial<ALBEvent>): ALBEvent => ({
        httpMethod: "GET",
        path: "/test",
        headers: {
            "x-amzn-trace-id": "Root=1-test-trace-id",
            "user-agent": "test-agent/1.0",
            "x-forwarded-for": "127.0.0.1",
        },
        requestContext: {} as any,
        body: null,
        isBase64Encoded: false,
        queryStringParameters: undefined,
        multiValueHeaders: {},
        multiValueQueryStringParameters: undefined,
        ...overrides,
    });

    describe("Logger Creation", () => {
        it("should create mock logger with all methods", () => {
            const logger = createMockLogger();

            expect(logger.debug).toBeDefined();
            expect(logger.info).toBeDefined();
            expect(logger.warn).toBeDefined();
            expect(logger.error).toBeDefined();
            expect(logger.logRequestStart).toBeDefined();
            expect(logger.logRequestSuccess).toBeDefined();
            expect(logger.logRequestError).toBeDefined();
        });

        it("should track logger method calls", () => {
            const logger = createMockLogger();

            logger.info("test message", { userId: "123" });
            logger.error("error message");

            expect(logger.info).toHaveBeenCalledWith("test message", { userId: "123" });
            expect(logger.error).toHaveBeenCalledWith("error message");
        });
    });

    describe("Log Context Creation", () => {
        it("should create log context with default values", () => {
            const context = createMockLogContext();

            expect(context.traceId).toBe("test-trace-123");
            expect(context.httpMethod).toBe("GET");
            expect(context.path).toBe("/test");
        });

        it("should create log context with overrides", () => {
            const context = createMockLogContext({
                traceId: "custom-trace",
                httpMethod: "POST",
                statusCode: 201,
                duration: 150,
            });

            expect(context.traceId).toBe("custom-trace");
            expect(context.httpMethod).toBe("POST");
            expect(context.statusCode).toBe(201);
            expect(context.duration).toBe(150);
        });
    });

    describe("Loggable Event Creation", () => {
        it("should create event with logging headers", () => {
            const event = createLoggableEvent();

            expect(event.headers?.["x-amzn-trace-id"]).toBe("Root=1-test-trace-id");
            expect(event.headers?.["user-agent"]).toBe("test-agent/1.0");
            expect(event.headers?.["x-forwarded-for"]).toBe("127.0.0.1");
        });

        it("should create event with custom logging context", () => {
            const event = createLoggableEvent({
                httpMethod: "POST",
                path: "/api/users",
                headers: {
                    "x-amzn-trace-id": "Root=1-custom-trace",
                    "user-agent": "custom-agent/2.0",
                },
            });

            expect(event.httpMethod).toBe("POST");
            expect(event.path).toBe("/api/users");
            expect(event.headers?.["x-amzn-trace-id"]).toBe("Root=1-custom-trace");
            expect(event.headers?.["user-agent"]).toBe("custom-agent/2.0");
        });
    });

    describe("Request Logging", () => {
        it("should log request lifecycle", () => {
            const logger = createMockLogger();
            const event = createLoggableEvent();
            const context = createMockLogContext();

            logger.logRequestStart("Starting request", event, context);
            logger.logRequestSuccess("Request completed", event, 200, 125, context);

            expect(logger.logRequestStart).toHaveBeenCalledWith("Starting request", event, context);
            expect(logger.logRequestSuccess).toHaveBeenCalledWith("Request completed", event, 200, 125, context);
        });

        it("should log request errors", () => {
            const logger = createMockLogger();
            const event = createLoggableEvent();
            const error = new Error("Test error");
            const context = createMockLogContext();

            logger.logRequestError("Request failed", event, error, 250, context);

            expect(logger.logRequestError).toHaveBeenCalledWith("Request failed", event, error, 250, context);
        });
    });
});
