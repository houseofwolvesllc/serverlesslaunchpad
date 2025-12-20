import { describe, it, expect, beforeEach } from "vitest";
import { ApiKey } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
import { ApiKeyCollectionAdapter } from "../../src/api_keys/api_key_collection_adapter";

describe("ApiKeyCollectionAdapter - HAL-FORMS Templates", () => {
    let mockRouter: any;
    let apiKeys: ApiKey[];
    let pagingData: PagingInstructions;
    const userId = "user-123";

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

        apiKeys = [
            {
                apiKeyId: "key-1",
                userId: "user-123",
                label: "Test Key 1",
                apiKey: "sk_test_12345678901234567890",
                dateCreated: new Date("2024-01-01"),
                dateLastAccessed: new Date("2024-01-02")
            },
            {
                apiKeyId: "key-2",
                userId: "user-123",
                label: "Test Key 2",
                apiKey: "sk_test_abcdefghijklmnopqrst",
                dateCreated: new Date("2024-01-03"),
                dateLastAccessed: new Date("2024-01-04")
            }
        ];

        pagingData = {
            next: undefined,
            previous: undefined
        };
    });

    it("should include create template in _templates", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const json = adapter.toJSON();

        expect(json._templates).toBeDefined();
        expect(json._templates?.create).toBeDefined();
        expect(json._templates?.create.title).toBe("Create API Key");
        expect(json._templates?.create.method).toBe("POST");
        expect(json._templates?.create.contentType).toBe("application/json");
    });

    it("should include required property metadata for create template", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const template = adapter._templates?.create;

        expect(template?.properties).toBeDefined();
        expect(template?.properties?.length).toBe(1);

        const labelField = template?.properties?.find(p => p.name === "label");
        expect(labelField).toBeDefined();
        expect(labelField?.required).toBe(true);
        expect(labelField?.type).toBe("text");
        expect(labelField?.prompt).toBe("API Key Label");
    });

    it("should not include individual delete templates on embedded API keys (bulk delete only)", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const json = adapter.toJSON();

        const embeddedKeys = json._embedded?.apiKeys;
        expect(embeddedKeys).toBeDefined();
        expect(embeddedKeys?.length).toBe(2);

        // Individual items should NOT have _templates - only collection has bulk-delete
        embeddedKeys?.forEach((key: any) => {
            expect(key._templates).toBeUndefined();
        });

        // Collection should have bulk-delete template instead
        expect(json._templates?.['bulk-delete']).toBeDefined();
    });

    it("should include create template target URL using router", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const template = adapter._templates?.create;

        expect(template?.target).toBeDefined();
        expect(template?.target).toContain(userId);
        expect(template?.target).toContain("/users/");
        expect(template?.target).toContain("/api-keys");
    });

    it("should serialize _templates in toJSON output", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const json = adapter.toJSON();

        expect(json).toHaveProperty("_templates");
        expect(json).toHaveProperty("_links");
        expect(json).toHaveProperty("_embedded");
        expect(json).toHaveProperty("count");
        expect(json).toHaveProperty("paging");
    });

    it("should include bulk-delete template in collection", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const templates = adapter._templates;

        expect(templates['bulk-delete']).toBeDefined();
        expect(templates['bulk-delete'].title).toBe("Delete Selected API Keys");
        expect(templates['bulk-delete'].method).toBe("DELETE");
    });

    it("should include next template when pagination has next cursor", () => {
        const pagingWithNext = {
            next: { cursor: "next-cursor-123", limit: 10 },
            previous: undefined
        };
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingWithNext, mockRouter);
        const templates = adapter._templates;

        expect(templates.next).toBeDefined();
        expect(templates.next.title).toBe("Next Page");
        expect(templates.next.method).toBe("POST");
        expect(templates.next.properties).toBeDefined();

        const pagingProperty = templates.next.properties.find((p: any) => p.name === "pagingInstruction");
        expect(pagingProperty).toBeDefined();
        expect(pagingProperty.type).toBe("hidden");
        expect(JSON.parse(pagingProperty.value)).toEqual(pagingWithNext.next);
    });

    it("should include prev template when pagination has previous cursor", () => {
        const pagingWithPrev = {
            next: undefined,
            previous: { cursor: "prev-cursor-456", limit: 10 }
        };
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingWithPrev, mockRouter);
        const templates = adapter._templates;

        expect(templates.prev).toBeDefined();
        expect(templates.prev.title).toBe("Previous Page");
        expect(templates.prev.method).toBe("POST");
        expect(templates.prev.properties).toBeDefined();

        const pagingProperty = templates.prev.properties.find((p: any) => p.name === "pagingInstruction");
        expect(pagingProperty).toBeDefined();
        expect(pagingProperty.type).toBe("hidden");
        expect(JSON.parse(pagingProperty.value)).toEqual(pagingWithPrev.previous);
    });

    it("should not include next/prev templates when pagination cursors are undefined", () => {
        const pagingNoCursors = {
            next: undefined,
            previous: undefined
        };
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingNoCursors, mockRouter);
        const templates = adapter._templates;

        expect(templates.next).toBeUndefined();
        expect(templates.prev).toBeUndefined();
        expect(templates.create).toBeDefined(); // Should still have create template
        expect(templates['bulk-delete']).toBeDefined(); // Should still have bulk-delete template
    });
});
