import { Features, Role, User } from "@houseofwolves/serverlesslaunchpad.core";
import { assert, beforeEach, describe, expect, it } from "vitest";
import { HalLink } from "../../src/content_types/hal_adapter";
import { UserAdapter } from "../../src/users/user_adapter";

describe("UserAdapter - HAL_JSON Format", () => {
    let mockRouter: any;
    let user: User;
    let currentUser: User;

    beforeEach(() => {
        mockRouter = {
            buildHref: (controller: any, method: string, params: any) => {
                if (method === "getUser") {
                    return `/users/${params.userId}`;
                }
                if (method === "getSessions") {
                    return `/users/${params.userId}/sessions/list`;
                }
                if (method === "getApiKeys") {
                    return `/users/${params.userId}/api-keys/list`;
                }
                if (method === "updateUser") {
                    return `/users/${params.userId}`;
                }
                return "/";
            },
        };

        user = {
            userId: "user-123",
            email: "john.doe@example.com",
            firstName: "John",
            lastName: "Doe",
            role: Role.AccountManager,
            features: Features.FeatureA | Features.FeatureB,
            dateCreated: new Date("2024-01-15T10:30:00.000Z"),
            dateModified: new Date("2024-11-10T14:22:00.000Z"),
        };

        // Default: currentUser is the same as user (self-viewing)
        currentUser = { ...user };
    });

    it("should include all user fields in JSON", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(json.userId).toBe(user.userId);
        expect(json.email).toBe(user.email);
        expect(json.firstName).toBe(user.firstName);
        expect(json.lastName).toBe(user.lastName);
        expect(json.role).toBe(user.role);
        // Features are converted to human-readable array in toJSON
        expect(json.features).toEqual(["feature_a", "feature_b"]);
        expect(json.dateCreated).toBe("2024-01-15T10:30:00.000Z");
        expect(json.dateModified).toBe("2024-11-10T14:22:00.000Z");
    });

    it("should include self link with correct href", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const links = adapter._links;

        assert(links, "links is undefined");
        expect((links.self as HalLink).href).toBe(`/users/${user.userId}`);
        // Note: title is optional in the createLink method
    });

    it("should include self link in toJSON output", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        assert(json._links, "json._links is undefined");
        expect((json._links.self as HalLink).href).toBe(`/users/${user.userId}`);
    });

    it("should include base navigation links (home, sitemap)", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        assert(json._links, "json._links is undefined");
        expect((json._links.home as HalLink).href).toBe("/");
        expect(json._links.sitemap).toBeDefined();
        expect((json._links.sitemap as HalLink).href).toBe("/sitemap");
    });

    it("should include sessions template", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        assert(templates, "templates is undefined");
        expect(templates.sessions.title).toBe("Sessions");
        expect(templates.sessions.method).toBe("POST");
        expect(templates.sessions.target).toBe(`/users/${user.userId}/sessions/list`);
        expect(templates.sessions.contentType).toBe("application/json");
    });

    it("should include api-keys template with kebab-case", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        assert(templates, "templates is undefined");
        expect(templates["api-keys"].title).toBe("API Keys");
        expect(templates["api-keys"].method).toBe("POST");
        expect(templates["api-keys"].target).toBe(`/users/${user.userId}/api-keys/list`);
        expect(templates["api-keys"].contentType).toBe("application/json");
    });

    it("should include pagingInstruction property in sessions template", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;
        const pagingProp = templates?.sessions?.properties?.find((p: any) => p.name === "pagingInstruction");

        assert(pagingProp, "pagingProp is undefined");
        expect(pagingProp.prompt).toBe("Paging Instruction");
        expect(pagingProp.required).toBe(false);
        expect(pagingProp.type).toBe("hidden");
    });

    it("should include pagingInstruction property in api-keys template", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        assert(templates?.["api-keys"], "api-keys is undefined");
        const pagingProp = templates?.["api-keys"]?.properties?.find((p: any) => p.name === "pagingInstruction");

        assert(pagingProp, "pagingProp is undefined");
        expect(pagingProp.prompt).toBe("Paging Instruction");
        expect(pagingProp.required).toBe(false);
        expect(pagingProp.type).toBe("hidden");
    });

    it("should serialize templates in toJSON output", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        assert(json._templates, "json._templates is undefined");
        expect(json._templates.sessions).toBeDefined();
        expect(json._templates["api-keys"]).toBeDefined();
    });

    it("should handle different roles correctly", () => {
        user.role = Role.Base;
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(json.role).toBe(Role.Base);
    });

    it("should handle different feature flags correctly", () => {
        user.features = Features.FeatureA | Features.FeatureB;
        currentUser = { ...user }; // Update currentUser to match
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        // Features are converted to human-readable array in toJSON
        expect(json.features).toEqual(["feature_a", "feature_b"]);
    });

    it("should format dates as ISO strings in toJSON", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(typeof json.dateCreated).toBe("string");
        expect(typeof json.dateModified).toBe("string");
        expect(json.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(json.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    describe("Edit Template", () => {
        describe("Template Visibility", () => {
            it("should include edit template when user views own profile", () => {
                // currentUser is same as user (self-viewing)
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const templates = adapter._templates;

                assert(templates?.edit, "edit is undefined");
                expect(templates.edit.title).toBe("Edit Profile");
                expect(templates.edit.method).toBe("PUT");
                expect(templates.edit.target).toBe(`/users/${user.userId}`);
            });

            it("should include edit template when admin views other user", () => {
                // Admin user viewing another user
                const adminUser: User = {
                    userId: "admin-456",
                    email: "admin@example.com",
                    firstName: "Admin",
                    lastName: "User",
                    role: Role.Admin,
                    features: Features.None,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };

                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const templates = adapter._templates;

                assert(templates?.edit, "edit is undefined");
                expect(templates.edit.title).toBe("Edit User");
            });

            it("should NOT include edit template when non-owner non-admin views profile", () => {
                // Different Base user viewing another user's profile
                const otherUser: User = {
                    userId: "user-789",
                    email: "other@example.com",
                    firstName: "Other",
                    lastName: "User",
                    role: Role.Base,
                    features: Features.None,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };

                const adapter = new UserAdapter(user, otherUser, mockRouter);
                const templates = adapter._templates;

                expect(templates?.edit).toBeUndefined();
            });

            it("should NOT include edit template when Support views other user", () => {
                const supportUser: User = {
                    userId: "support-999",
                    email: "support@example.com",
                    firstName: "Support",
                    lastName: "User",
                    role: Role.Support,
                    features: Features.None,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };

                const adapter = new UserAdapter(user, supportUser, mockRouter);
                const templates = adapter._templates;

                expect(templates?.edit).toBeUndefined();
            });
        });

        describe("Template Properties - Regular User", () => {
            it("should include all properties with readOnly flags for regular user editing own profile", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates?.edit;

                assert(editTemplate, "editTemplate is undefined");
                // All 4 properties are shown, with role/features marked readOnly for non-admins
                expect(editTemplate.properties).toHaveLength(4);

                const firstNameProp = editTemplate?.properties?.find((p: any) => p.name === "firstName");
                assert(firstNameProp, "firstNameProp is undefined");
                expect(firstNameProp.prompt).toBe("First Name");
                expect(firstNameProp.required).toBe(true);
                expect(firstNameProp.type).toBe("text");
                expect(firstNameProp.value).toBe(user.firstName);
                expect(firstNameProp.maxLength).toBe(100);

                const lastNameProp = editTemplate?.properties?.find((p: any) => p.name === "lastName");
                assert(lastNameProp, "lastNameProp is undefined");
                expect(lastNameProp.prompt).toBe("Last Name");
                expect(lastNameProp.required).toBe(true);
                expect(lastNameProp.type).toBe("text");
                expect(lastNameProp.value).toBe(user.lastName);
                expect(lastNameProp.maxLength).toBe(100);
            });

            it("should include role and features as readOnly for regular user", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");

                const roleProp = editTemplate?.properties?.find((p: any) => p.name === "role");
                assert(roleProp, "roleProp is undefined");

                const featuresProp = editTemplate?.properties?.find((p: any) => p.name === "features");
                assert(featuresProp, "featuresProp is undefined");

                // Both are included but marked as readOnly
                expect(roleProp).toBeDefined();
                expect(roleProp.readOnly).toBe(true);
                expect(featuresProp).toBeDefined();
                expect(featuresProp.readOnly).toBe(true);
            });

            it("should use 'Edit Profile' title for regular user", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates?.edit;

                assert(editTemplate, "editTemplate is undefined");
                expect(editTemplate.title).toBe("Edit Profile");
            });
        });

        describe("Template Properties - Admin User", () => {
            let adminUser: User;

            beforeEach(() => {
                adminUser = {
                    userId: "admin-456",
                    email: "admin@example.com",
                    firstName: "Admin",
                    lastName: "User",
                    role: Role.Admin,
                    features: Features.None,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };
            });

            it("should include all four properties for admin", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");

                expect(editTemplate).toBeDefined();
                expect(editTemplate.properties).toHaveLength(4);

                const propertyNames = editTemplate?.properties?.map((p: any) => p.name);
                expect(propertyNames).toContain("firstName");
                expect(propertyNames).toContain("lastName");
                expect(propertyNames).toContain("role");
                expect(propertyNames).toContain("features");
            });

            it("should include role property with correct configuration", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");

                const roleProp = editTemplate?.properties?.find((p: any) => p.name === "role");
                assert(roleProp, "roleProp is undefined");
                expect(roleProp.prompt).toBe("User Role");
                expect(roleProp.required).toBe(true);
                expect(roleProp.type).toBe("select");
                expect(roleProp.value).toBe(user.role);
                expect(roleProp.options).toHaveLength(4);

                // Verify all role options
                expect(roleProp.options).toContainEqual({ value: Role.Base, prompt: "Base" });
                expect(roleProp.options).toContainEqual({ value: Role.Support, prompt: "Support" });
                expect(roleProp.options).toContainEqual({ value: Role.AccountManager, prompt: "Account Manager" });
                expect(roleProp.options).toContainEqual({ value: Role.Admin, prompt: "Admin" });
            });

            it("should include features property with correct configuration", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");

                const featuresProp = editTemplate.properties?.find((p: any) => p.name === "features");
                assert(featuresProp, "featuresProp is undefined");
                expect(featuresProp.prompt).toBe("Features");
                expect(featuresProp.required).toBe(false);
                expect(featuresProp.type).toBe("checkbox");
                expect(featuresProp.value).toEqual(["feature_a", "feature_b"]); // user.features has FeatureA | FeatureB
                expect(featuresProp.options).toHaveLength(4); // Excludes "none" (filtered for checkboxes)
                expect(featuresProp.options?.[0]).toEqual({ value: "feature_a", prompt: "Feature A" });
                expect(featuresProp.options?.[1]).toEqual({ value: "feature_b", prompt: "Feature B" });
            });

            it("should use 'Edit User' title for admin viewing other user", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");
                expect(editTemplate.title).toBe("Edit User");
            });

            it("should use 'Edit Profile' title for admin editing own profile", () => {
                const adapter = new UserAdapter(adminUser, adminUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");
                expect(editTemplate.title).toBe("Edit Profile");
            });
        });

        describe("Template Values Pre-Population", () => {
            it("should pre-fill all field values with current user data", () => {
                const adminUser: User = {
                    userId: "admin-456",
                    email: "admin@example.com",
                    firstName: "Admin",
                    lastName: "User",
                    role: Role.Admin,
                    features: Features.FeatureA | Features.FeatureB,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };

                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");

                const firstNameProp = editTemplate.properties?.find((p: any) => p.name === "firstName");
                const lastNameProp = editTemplate.properties?.find((p: any) => p.name === "lastName");
                const roleProp = editTemplate.properties?.find((p: any) => p.name === "role");
                const featuresProp = editTemplate.properties?.find((p: any) => p.name === "features");

                expect(firstNameProp?.value).toBe(user.firstName);
                expect(lastNameProp?.value).toBe(user.lastName);
                expect(roleProp?.value).toBe(user.role);
                expect(featuresProp?.value).toEqual(["feature_a", "feature_b"]); // Bitfield converted to array
            });

            it("should reflect updated user values", () => {
                const updatedUser: User = {
                    ...user,
                    firstName: "Updated",
                    lastName: "Name",
                    role: Role.Support,
                    features: Features.FeatureC,
                };

                const adminUser: User = {
                    userId: "admin-456",
                    email: "admin@example.com",
                    firstName: "Admin",
                    lastName: "User",
                    role: Role.Admin,
                    features: Features.None,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };

                const adapter = new UserAdapter(updatedUser, adminUser, mockRouter);
                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");

                const firstNameProp = editTemplate.properties?.find((p: any) => p.name === "firstName");
                const lastNameProp = editTemplate.properties?.find((p: any) => p.name === "lastName");
                const roleProp = editTemplate.properties?.find((p: any) => p.name === "role");
                const featuresProp = editTemplate.properties?.find((p: any) => p.name === "features");

                expect(firstNameProp?.value).toBe("Updated");
                expect(lastNameProp?.value).toBe("Name");
                expect(roleProp?.value).toBe(Role.Support);
                expect(featuresProp?.value).toEqual(["feature_c"]); // Bitfield converted to array
            });
        });

        describe("Template Target URL", () => {
            it("should target correct updateUser endpoint", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");
                expect(editTemplate.target).toBe(`/users/${user.userId}`);
            });

            it("should use PUT method", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");
                expect(editTemplate.method).toBe("PUT");
            });

            it("should use application/json content type", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);

                const editTemplate = adapter._templates?.edit;
                assert(editTemplate, "editTemplate is undefined");
                expect(editTemplate.contentType).toBe("application/json");
            });
        });
    });
});
