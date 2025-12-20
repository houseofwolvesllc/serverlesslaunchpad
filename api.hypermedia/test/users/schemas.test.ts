import { describe, expect, it } from "vitest";
import { UpdateUserSchema } from "../../src/users/schemas";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";

describe("UpdateUserSchema", () => {
    describe("Valid updates", () => {
        it("should accept valid firstName update", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { firstName: "Jane" },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.firstName).toBe("Jane");
            }
        });

        it("should accept valid lastName update", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { lastName: "Smith" },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.lastName).toBe("Smith");
            }
        });

        it("should accept both firstName and lastName", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { firstName: "Jane", lastName: "Smith" },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.firstName).toBe("Jane");
                expect(result.data.body.lastName).toBe("Smith");
            }
        });

        it("should accept valid role update", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { role: Role.Admin },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.role).toBe(Role.Admin);
            }
        });

        it("should accept valid features update", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { features: 7 }, // Contacts | Campaigns | Links
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.features).toBe(7);
            }
        });

        it("should accept all fields together", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: {
                    firstName: "Jane",
                    lastName: "Smith",
                    role: Role.Support,
                    features: 3,
                },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.firstName).toBe("Jane");
                expect(result.data.body.lastName).toBe("Smith");
                expect(result.data.body.role).toBe(Role.Support);
                expect(result.data.body.features).toBe(3);
            }
        });
    });

    describe("Validation errors", () => {
        it("should reject empty body", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: {},
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("At least one field must be provided for update");
            }
        });

        it("should reject empty firstName", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { firstName: "" },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("First name is required");
            }
        });

        it("should reject empty lastName", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { lastName: "" },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("Last name is required");
            }
        });

        it("should reject firstName longer than 100 characters", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { firstName: "a".repeat(101) },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("First name must be less than 100 characters");
            }
        });

        it("should reject lastName longer than 100 characters", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { lastName: "a".repeat(101) },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("Last name must be less than 100 characters");
            }
        });

        it("should reject invalid role value", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { role: 999 },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("Invalid role value");
            }
        });

        it("should reject negative features value", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { features: -1 },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("Features cannot be negative");
            }
        });

        it("should reject features value greater than 15", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { features: 16 },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("Invalid feature flags");
            }
        });

        it("should reject non-integer features value", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { features: 3.5 },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("Features must be an integer");
            }
        });

        it("should reject missing userId in params", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "" },
                body: { firstName: "Jane" },
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.issues.map((issue) => issue.message);
                expect(errorMessages).toContain("User ID is required");
            }
        });
    });

    describe("Edge cases", () => {
        it("should accept firstName at exactly 100 characters", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { firstName: "a".repeat(100) },
            });

            expect(result.success).toBe(true);
        });

        it("should accept lastName at exactly 100 characters", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { lastName: "a".repeat(100) },
            });

            expect(result.success).toBe(true);
        });

        it("should accept features value of 0", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { features: 0 },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.features).toBe(0);
            }
        });

        it("should accept features value of 15 (max)", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { features: 15 },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.features).toBe(15);
            }
        });

        it("should accept role value of 0 (Base)", () => {
            const result = UpdateUserSchema.safeParse({
                params: { userId: "user-123" },
                body: { role: Role.Base },
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.body.role).toBe(Role.Base);
            }
        });
    });
});
