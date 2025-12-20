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
        expect(json._templates?.default).toBeDefined();
        expect(json._templates?.default.title).toBe("Create API Key");
        expect(json._templates?.default.method).toBe("POST");
        expect(json._templates?.default.contentType).toBe("application/json");
    });

    it("should include required property metadata for create template", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const template = adapter._templates?.default;

        expect(template?.properties).toBeDefined();
        expect(template?.properties?.length).toBe(1);

        const labelField = template?.properties?.find(p => p.name === "label");
        expect(labelField).toBeDefined();
        expect(labelField?.required).toBe(true);
        expect(labelField?.type).toBe("text");
        expect(labelField?.prompt).toBe("API Key Label");
    });

    it("should include delete template on each embedded API key", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const json = adapter.toJSON();

        const embeddedKeys = json._embedded?.apiKeys;
        expect(embeddedKeys).toBeDefined();
        expect(embeddedKeys?.length).toBe(2);

        embeddedKeys?.forEach((key: any) => {
            expect(key._templates).toBeDefined();
            expect(key._templates.delete).toBeDefined();
            expect(key._templates.delete.title).toBe("Delete API Key");
            expect(key._templates.delete.method).toBe("DELETE");

            const properties = key._templates.delete.properties;
            expect(properties).toBeDefined();
            expect(properties.length).toBe(1);
            expect(properties[0].name).toBe("apiKeyIds");
            expect(properties[0].value).toBe(key.apiKeyId);
        });
    });

    it("should include create template target URL using router", () => {
        const adapter = new ApiKeyCollectionAdapter(userId, apiKeys, pagingData, mockRouter);
        const template = adapter._templates?.default;

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
});
