import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsoleLogger } from "../../src/logging/console_logger";
import { LogLevel } from "../../src/logging/logger";

describe("ConsoleLogger", () => {
    let consoleSpy: {
        log: ReturnType<typeof vi.spyOn>;
        warn: ReturnType<typeof vi.spyOn>;
        error: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
        // Mock console methods
        consoleSpy = {
            log: vi.spyOn(console, "log").mockImplementation(() => undefined),
            warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
            error: vi.spyOn(console, "error").mockImplementation(() => undefined),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Constructor", () => {
        it("should default to INFO log level", () => {
            // Arrange & Act
            const logger = new ConsoleLogger();

            // Assert - debug should be filtered out, info should pass through
            logger.debug("debug message");
            logger.info("info message");

            expect(consoleSpy.log).toHaveBeenCalledTimes(1);
            expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
        });

        it("should accept custom log level", () => {
            // Arrange & Act
            const logger = new ConsoleLogger(LogLevel.ERROR);

            // Assert - only error should pass through
            logger.debug("debug message");
            logger.info("info message");
            logger.warn("warn message");
            logger.error("error message");

            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        });
    });

    describe("Log Level Filtering", () => {
        it("should log DEBUG and above when level is DEBUG", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.debug("debug message");
            logger.info("info message");
            logger.warn("warn message");
            logger.error("error message");

            // Assert
            expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug + info
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        });

        it("should log INFO and above when level is INFO", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.INFO);

            // Act
            logger.debug("debug message");
            logger.info("info message");
            logger.warn("warn message");
            logger.error("error message");

            // Assert
            expect(consoleSpy.log).toHaveBeenCalledTimes(1); // info only
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        });

        it("should log WARN and above when level is WARN", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.WARN);

            // Act
            logger.debug("debug message");
            logger.info("info message");
            logger.warn("warn message");
            logger.error("error message");

            // Assert
            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        });

        it("should log ERROR only when level is ERROR", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.ERROR);

            // Act
            logger.debug("debug message");
            logger.info("info message");
            logger.warn("warn message");
            logger.error("error message");

            // Assert
            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        });
    });

    describe("JSON Formatting", () => {
        it("should format log entries with timestamp, level, and message", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.info("test message");

            // Assert
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringMatching(/^\{"timestamp":"[\d-]+T[\d:.]+Z","level":"INFO","message":"test message"\}$/)
            );
        });

        it("should include context data in formatted output", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);
            const context = {
                traceId: "trace-123",
                userId: "user-456",
                operation: "login",
            };

            // Act
            logger.info("test message", context);

            // Assert
            const logCall = consoleSpy.log.mock.calls[0][0] as string;
            const logEntry = JSON.parse(logCall);

            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.level).toBe("INFO");
            expect(logEntry.message).toBe("test message");
            expect(logEntry.traceId).toBe("trace-123");
            expect(logEntry.userId).toBe("user-456");
            expect(logEntry.operation).toBe("login");
        });

        it("should handle missing context gracefully", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.info("test message");

            // Assert
            const logCall = consoleSpy.log.mock.calls[0][0] as string;
            const logEntry = JSON.parse(logCall);

            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.level).toBe("INFO");
            expect(logEntry.message).toBe("test message");
            expect(Object.keys(logEntry)).toEqual(["timestamp", "level", "message"]);
        });

        it("should handle empty context object", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.info("test message", {});

            // Assert
            const logCall = consoleSpy.log.mock.calls[0][0] as string;
            const logEntry = JSON.parse(logCall);

            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.level).toBe("INFO");
            expect(logEntry.message).toBe("test message");
        });

        it("should include ISO timestamp in correct format", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);
            const beforeTime = new Date().getTime();

            // Act
            logger.info("test message");

            // Assert
            const logCall = consoleSpy.log.mock.calls[0][0] as string;
            const logEntry = JSON.parse(logCall);
            const afterTime = new Date().getTime();

            expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(new Date(logEntry.timestamp).getTime()).toBeGreaterThanOrEqual(beforeTime);
            expect(new Date(logEntry.timestamp).getTime()).toBeLessThanOrEqual(afterTime);
        });
    });

    describe("Console Output Routing", () => {
        it("should route debug messages to console.log", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.debug("debug message");

            // Assert
            expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"DEBUG"'));
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).not.toHaveBeenCalled();
        });

        it("should route info messages to console.log", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.INFO);

            // Act
            logger.info("info message");

            // Assert
            expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).not.toHaveBeenCalled();
        });

        it("should route warn messages to console.warn", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.WARN);

            // Act
            logger.warn("warn message");

            // Assert
            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('"level":"WARN"'));
            expect(consoleSpy.error).not.toHaveBeenCalled();
        });

        it("should route error messages to console.error", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.ERROR);

            // Act
            logger.error("error message");

            // Assert
            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('"level":"ERROR"'));
        });
    });

    describe("Integration Scenarios", () => {
        it("should handle complex context objects", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);
            const context = {
                traceId: "trace-123",
                request: {
                    method: "POST",
                    path: "/api/users",
                    headers: { "content-type": "application/json" },
                },
                response: {
                    statusCode: 201,
                    duration: 150,
                },
                error: null,
            };

            // Act
            logger.info("Request completed", context);

            // Assert
            const logCall = consoleSpy.log.mock.calls[0][0] as string;
            const logEntry = JSON.parse(logCall);

            expect(logEntry.traceId).toBe("trace-123");
            expect(logEntry.request.method).toBe("POST");
            expect(logEntry.response.statusCode).toBe(201);
            expect(logEntry.error).toBeNull();
        });

        it("should handle multiple log calls in sequence", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.debug("Starting operation", { traceId: "trace-1" });
            logger.info("Operation in progress", { traceId: "trace-1", step: 1 });
            logger.warn("Minor issue detected", { traceId: "trace-1", issue: "timeout" });
            logger.error("Operation failed", { traceId: "trace-1", error: "connection lost" });

            // Assert
            expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug + info
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);

            // Verify trace ID is preserved across all calls
            const debugCall = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
            const infoCall = JSON.parse(consoleSpy.log.mock.calls[1][0] as string);
            const warnCall = JSON.parse(consoleSpy.warn.mock.calls[0][0] as string);
            const errorCall = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);

            expect(debugCall.traceId).toBe("trace-1");
            expect(infoCall.traceId).toBe("trace-1");
            expect(warnCall.traceId).toBe("trace-1");
            expect(errorCall.traceId).toBe("trace-1");
        });

        it("should handle special characters in messages and context", () => {
            // Arrange
            const logger = new ConsoleLogger(LogLevel.DEBUG);

            // Act
            logger.info('Message with "quotes" and \n newlines', {
                specialChars: 'Value with "quotes" and \t tabs',
                unicode: "Hello 🌍 World",
            });

            // Assert
            expect(() => {
                const logCall = consoleSpy.log.mock.calls[0][0] as string;
                JSON.parse(logCall); // Should not throw
            }).not.toThrow();
        });
    });
});
