import { describe, it, expect, beforeEach } from "vitest";
import { User, Role, Features } from "@houseofwolves/serverlesslaunchpad.core";
import { UserAdapter } from "../../src/users/user_adapter";

describe("UserAdapter - HAL+JSON Format", () => {
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
            }
        };

        user = {
            userId: "user-123",
            email: "john.doe@example.com",
            firstName: "John",
            lastName: "Doe",
            role: Role.AccountManager,
            features: Features.Contacts | Features.Campaigns,
            dateCreated: new Date("2024-01-15T10:30:00.000Z"),
            dateModified: new Date("2024-11-10T14:22:00.000Z")
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
        expect(json.features).toBe(user.features);
        expect(json.dateCreated).toBe("2024-01-15T10:30:00.000Z");
        expect(json.dateModified).toBe("2024-11-10T14:22:00.000Z");
    });

    it("should include self link with correct href", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const links = adapter._links;

        expect(links.self).toBeDefined();
        expect(links.self.href).toBe(`/users/${user.userId}`);
        // Note: title is optional in the createLink method
    });

    it("should include self link in toJSON output", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(json._links.self).toBeDefined();
        expect(json._links.self.href).toBe(`/users/${user.userId}`);
    });

    it("should include base navigation links (home, sitemap)", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(json._links.home).toBeDefined();
        expect(json._links.home.href).toBe("/");
        expect(json._links.sitemap).toBeDefined();
        expect(json._links.sitemap.href).toBe("/sitemap");
    });

    it("should include sessions template", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        expect(templates.sessions).toBeDefined();
        expect(templates.sessions.title).toBe("Sessions");
        expect(templates.sessions.method).toBe("POST");
        expect(templates.sessions.target).toBe(`/users/${user.userId}/sessions/list`);
        expect(templates.sessions.contentType).toBe("application/json");
    });

    it("should include api-keys template with kebab-case", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        expect(templates["api-keys"]).toBeDefined();
        expect(templates["api-keys"].title).toBe("API Keys");
        expect(templates["api-keys"].method).toBe("POST");
        expect(templates["api-keys"].target).toBe(`/users/${user.userId}/api-keys/list`);
        expect(templates["api-keys"].contentType).toBe("application/json");
    });

    it("should include pagingInstruction property in sessions template", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        const pagingProp = templates.sessions.properties.find((p: any) => p.name === "pagingInstruction");
        expect(pagingProp).toBeDefined();
        expect(pagingProp.prompt).toBe("Paging Instruction");
        expect(pagingProp.required).toBe(false);
        expect(pagingProp.type).toBe("hidden");
    });

    it("should include pagingInstruction property in api-keys template", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const templates = adapter._templates;

        const pagingProp = templates["api-keys"].properties.find((p: any) => p.name === "pagingInstruction");
        expect(pagingProp).toBeDefined();
        expect(pagingProp.prompt).toBe("Paging Instruction");
        expect(pagingProp.required).toBe(false);
        expect(pagingProp.type).toBe("hidden");
    });

    it("should serialize templates in toJSON output", () => {
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(json._templates).toBeDefined();
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
        user.features = Features.Links | Features.Apps;
        const adapter = new UserAdapter(user, currentUser, mockRouter);
        const json = adapter.toJSON();

        expect(json.features).toBe(Features.Links | Features.Apps);
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

                expect(templates.edit).toBeDefined();
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

                expect(templates.edit).toBeDefined();
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

                expect(templates.edit).toBeUndefined();
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

                expect(templates.edit).toBeUndefined();
            });
        });

        describe("Template Properties - Regular User", () => {
            it("should include firstName and lastName for regular user editing own profile", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                expect(editTemplate).toBeDefined();
                expect(editTemplate.properties).toHaveLength(2);

                const firstNameProp = editTemplate.properties.find((p: any) => p.name === "firstName");
                expect(firstNameProp).toBeDefined();
                expect(firstNameProp.prompt).toBe("First Name");
                expect(firstNameProp.required).toBe(true);
                expect(firstNameProp.type).toBe("text");
                expect(firstNameProp.value).toBe(user.firstName);
                expect(firstNameProp.maxLength).toBe(100);

                const lastNameProp = editTemplate.properties.find((p: any) => p.name === "lastName");
                expect(lastNameProp).toBeDefined();
                expect(lastNameProp.prompt).toBe("Last Name");
                expect(lastNameProp.required).toBe(true);
                expect(lastNameProp.type).toBe("text");
                expect(lastNameProp.value).toBe(user.lastName);
                expect(lastNameProp.maxLength).toBe(100);
            });

            it("should NOT include role and features for regular user", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                expect(editTemplate).toBeDefined();
                const roleProp = editTemplate.properties.find((p: any) => p.name === "role");
                const featuresProp = editTemplate.properties.find((p: any) => p.name === "enabled_features");

                expect(roleProp).toBeUndefined();
                expect(featuresProp).toBeUndefined();
            });

            it("should use 'Edit Profile' title for regular user", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates.edit;

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
                const editTemplate = adapter._templates.edit;

                expect(editTemplate).toBeDefined();
                expect(editTemplate.properties).toHaveLength(4);

                const propertyNames = editTemplate.properties.map((p: any) => p.name);
                expect(propertyNames).toContain("firstName");
                expect(propertyNames).toContain("lastName");
                expect(propertyNames).toContain("role");
                expect(propertyNames).toContain("enabled_features");
            });

            it("should include role property with correct configuration", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                const roleProp = editTemplate.properties.find((p: any) => p.name === "role");
                expect(roleProp).toBeDefined();
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

            it("should include enabled_features property with correct configuration", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                const featuresProp = editTemplate.properties.find((p: any) => p.name === "enabled_features");
                expect(featuresProp).toBeDefined();
                expect(featuresProp.prompt).toBe("Features");
                expect(featuresProp.required).toBe(false);
                expect(featuresProp.type).toBe("checkbox");
                expect(featuresProp.value).toEqual(["contact", "campaign"]); // user.features has Contacts | Campaigns
                expect(featuresProp.options).toHaveLength(4); // Excludes "none" (filtered for checkboxes)
                expect(featuresProp.options[0]).toEqual({ value: "contact", prompt: "Contact Management" });
            });

            it("should use 'Edit User' title for admin viewing other user", () => {
                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                expect(editTemplate.title).toBe("Edit User");
            });

            it("should use 'Edit Profile' title for admin editing own profile", () => {
                const adapter = new UserAdapter(adminUser, adminUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                // Admin editing themselves sees "Edit Profile" title
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
                    features: Features.Contacts | Features.Campaigns,
                    dateCreated: new Date("2024-01-01T00:00:00.000Z"),
                    dateModified: new Date("2024-01-01T00:00:00.000Z"),
                };

                const adapter = new UserAdapter(user, adminUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                const firstNameProp = editTemplate.properties.find((p: any) => p.name === "firstName");
                const lastNameProp = editTemplate.properties.find((p: any) => p.name === "lastName");
                const roleProp = editTemplate.properties.find((p: any) => p.name === "role");
                const featuresProp = editTemplate.properties.find((p: any) => p.name === "enabled_features");

                expect(firstNameProp.value).toBe(user.firstName);
                expect(lastNameProp.value).toBe(user.lastName);
                expect(roleProp.value).toBe(user.role);
                expect(featuresProp.value).toEqual(["contact", "campaign"]); // Bitfield converted to array
            });

            it("should reflect updated user values", () => {
                const updatedUser: User = {
                    ...user,
                    firstName: "Updated",
                    lastName: "Name",
                    role: Role.Support,
                    features: Features.Links,
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
                const editTemplate = adapter._templates.edit;

                const firstNameProp = editTemplate.properties.find((p: any) => p.name === "firstName");
                const lastNameProp = editTemplate.properties.find((p: any) => p.name === "lastName");
                const roleProp = editTemplate.properties.find((p: any) => p.name === "role");
                const featuresProp = editTemplate.properties.find((p: any) => p.name === "enabled_features");

                expect(firstNameProp.value).toBe("Updated");
                expect(lastNameProp.value).toBe("Name");
                expect(roleProp.value).toBe(Role.Support);
                expect(featuresProp.value).toEqual(["link"]); // Bitfield converted to array
            });
        });

        describe("Template Target URL", () => {
            it("should target correct updateUser endpoint", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                expect(editTemplate.target).toBe(`/users/${user.userId}`);
            });

            it("should use PUT method", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                expect(editTemplate.method).toBe("PUT");
            });

            it("should use application/json content type", () => {
                const adapter = new UserAdapter(user, currentUser, mockRouter);
                const editTemplate = adapter._templates.edit;

                expect(editTemplate.contentType).toBe("application/json");
            });
        });
    });
});
