import { describe, it, expect, beforeEach } from "vitest";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
import { ApiKeyCollectionAdapter } from "../../src/api_keys/api_key_collection_adapter";

describe("ApiKeyCollectionAdapter - Empty Collection", () => {
    let mockRouter: any;
    const userId = "user-123";
    const emptyApiKeys: any[] = [];
    const emptyPaging: PagingInstructions = {
        next: undefined,
        previous: undefined
    };

    beforeEach(() => {
        mockRouter = {
            buildHref: (controller: any, method: string, params: any) => {
                if (method === "getApiKeys") {
                    return `/users/${params.userId}/api-keys/list`;
                }
                if (method === "createApiKey") {
                    return `/users/${params.userId}/api-keys/create`;
                }
                if (method === "deleteApiKeys") {
                    return `/users/${params.userId}/api-keys/delete`;
                }
                return "/";
            }
        };
    });

    it("should include default (create) template even when collection is empty", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, emptyApiKeys, emptyPaging, mockRouter);
        const templates = adapter._templates;

        expect(templates).toBeDefined();
        expect(templates.create).toBeDefined();
        expect(templates.create.title).toBe("Create API Key");
        expect(templates.create.method).toBe("POST");
        expect(templates.create.target).toBe("/users/user-123/api-keys/create");
    });

    it("should include bulk-delete template even when collection is empty", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, emptyApiKeys, emptyPaging, mockRouter);
        const templates = adapter._templates;

        expect(templates).toBeDefined();
        expect(templates['bulk-delete']).toBeDefined();
        expect(templates['bulk-delete'].title).toBe("Delete Selected API Keys");
    });

    it("should serialize templates in toJSON even when collection is empty", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, emptyApiKeys, emptyPaging, mockRouter);
        const json = adapter.toJSON();

        expect(json._templates).toBeDefined();
        expect(json._templates.create).toBeDefined();
        expect(json._templates['bulk-delete']).toBeDefined();
        expect(json.count).toBe(0);
        expect(json._embedded.apiKeys).toHaveLength(0);
    });

    it("should have properly formatted create template for forms", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, emptyApiKeys, emptyPaging, mockRouter);
        const createTemplate = adapter._templates.create;

        expect(createTemplate.contentType).toBe("application/json");
        expect(createTemplate.properties).toBeDefined();
        expect(createTemplate.properties.length).toBe(1);

        const labelField = createTemplate.properties[0];
        expect(labelField.name).toBe("label");
        expect(labelField.prompt).toBe("API Key Label");
        expect(labelField.required).toBe(true);
        expect(labelField.type).toBe("text");
    });
});
