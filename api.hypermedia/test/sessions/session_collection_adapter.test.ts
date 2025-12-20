import { describe, it, expect, beforeEach } from "vitest";
import { Session } from "@houseofwolves/serverlesslaunchpad.core";
import { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.commons";
import { SessionCollectionAdapter } from "../../src/sessions/session_collection_adapter";

describe("SessionCollectionAdapter - HAL-FORMS Templates", () => {
    let mockRouter: any;
    let sessions: Session[];
    let pagingData: PagingInstructions;
    const userId = "user-123";

    beforeEach(() => {
        mockRouter = {
            buildHref: (controller: any, method: string, params: any) => {
                if (method === "getSessions") {
                    return `/users/${params.userId}/sessions/list`;
                }
                if (method === "deleteSessions") {
                    return `/users/${params.userId}/sessions/delete`;
                }
                return "/";
            }
        };

        sessions = [
            {
                sessionId: "session-1",
                userId: "user-123",
                ipAddress: "192.168.1.1",
                userAgent: "Mozilla/5.0",
                dateCreated: new Date("2024-01-01"),
                dateExpires: new Date("2024-01-08"),
                dateLastAccessed: new Date("2024-01-02")
            },
            {
                sessionId: "session-2",
                userId: "user-123",
                ipAddress: "192.168.1.2",
                userAgent: "Chrome/120.0",
                dateCreated: new Date("2024-01-03"),
                dateExpires: new Date("2024-01-10"),
                dateLastAccessed: new Date("2024-01-04")
            }
        ];

        pagingData = {
            next: undefined,
            previous: undefined
        };
    });

    it("should return undefined for collection _templates (read-only)", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const templates = adapter._templates;

        expect(templates).toBeUndefined();
    });

    it("should include undefined _templates in toJSON output", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        expect(json).toHaveProperty("_templates");
        expect(json._templates).toBeUndefined();
    });

    it("should include delete template on each embedded session", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        const embeddedSessions = json._embedded?.sessions;
        expect(embeddedSessions).toBeDefined();
        expect(embeddedSessions?.length).toBe(2);

        embeddedSessions?.forEach((session: any) => {
            expect(session._templates).toBeDefined();
            expect(session._templates.delete).toBeDefined();
            expect(session._templates.delete.title).toBe("Delete Session");
            expect(session._templates.delete.method).toBe("DELETE");
            expect(session._templates.delete.contentType).toBe("application/json");

            const properties = session._templates.delete.properties;
            expect(properties).toBeDefined();
            expect(properties.length).toBe(1);
            expect(properties[0].name).toBe("sessionIds");
            expect(properties[0].required).toBe(true);
            expect(properties[0].type).toBe("text");
            expect(properties[0].value).toBe(session.sessionId);
        });
    });

    it("should include delete template target URL using mockRouter", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        const firstSession = json._embedded?.sessions?.[0];
        const deleteTemplate = firstSession?._templates?.delete;

        expect(deleteTemplate?.target).toBeDefined();
        expect(deleteTemplate?.target).toContain(userId);
        expect(deleteTemplate?.target).toContain("/users/");
        expect(deleteTemplate?.target).toContain("/sessions");
    });

    it("should serialize complete structure with _templates", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        expect(json).toHaveProperty("_templates");
        expect(json).toHaveProperty("_links");
        expect(json).toHaveProperty("_embedded");
        expect(json).toHaveProperty("count");
        expect(json).toHaveProperty("paging");

        // Verify sessions collection has no create template (read-only)
        expect(json._templates).toBeUndefined();

        // But embedded items have delete templates
        expect(json._embedded?.sessions?.[0]._templates?.delete).toBeDefined();
    });
});
