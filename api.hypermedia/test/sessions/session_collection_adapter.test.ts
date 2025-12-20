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

    it("should include bulkDelete template in collection _templates", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const templates = adapter._templates;

        expect(templates).toBeDefined();
        expect(templates.bulkDelete).toBeDefined();
        expect(templates.bulkDelete.title).toBe("Delete Selected Sessions");
        expect(templates.bulkDelete.method).toBe("DELETE");
    });

    it("should include _templates with bulkDelete in toJSON output", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        expect(json).toHaveProperty("_templates");
        expect(json._templates).toBeDefined();
        expect(json._templates.bulkDelete).toBeDefined();
    });

    it("should not include individual delete templates on embedded sessions (bulk delete only)", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        const embeddedSessions = json._embedded?.sessions;
        expect(embeddedSessions).toBeDefined();
        expect(embeddedSessions?.length).toBe(2);

        // Individual items should NOT have _templates - only collection has bulkDelete
        embeddedSessions?.forEach((session: any) => {
            expect(session._templates).toBeUndefined();
        });

        // Collection should have bulkDelete template instead
        expect(json._templates?.bulkDelete).toBeDefined();
    });

    it("should include bulkDelete template target URL using mockRouter", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        const bulkDeleteTemplate = json._templates?.bulkDelete;

        expect(bulkDeleteTemplate?.target).toBeDefined();
        expect(bulkDeleteTemplate?.target).toContain(userId);
        expect(bulkDeleteTemplate?.target).toContain("/users/");
        expect(bulkDeleteTemplate?.target).toContain("/sessions");
    });

    it("should serialize complete structure with _templates", () => {
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingData, mockRouter);
        const json = adapter.toJSON();

        expect(json).toHaveProperty("_templates");
        expect(json).toHaveProperty("_links");
        expect(json).toHaveProperty("_embedded");
        expect(json).toHaveProperty("count");
        expect(json).toHaveProperty("paging");

        // Verify sessions collection has bulkDelete template
        expect(json._templates).toBeDefined();
        expect(json._templates.bulkDelete).toBeDefined();

        // Embedded items should NOT have individual delete templates (bulk delete only)
        expect(json._embedded?.sessions?.[0]._templates).toBeUndefined();
    });

    it("should include next template when pagination has next cursor", () => {
        const pagingWithNext = {
            next: { cursor: "next-cursor-123", limit: 10 },
            previous: undefined
        };
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingWithNext, mockRouter);
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
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingWithPrev, mockRouter);
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
        const adapter = new SessionCollectionAdapter(userId, sessions, pagingNoCursors, mockRouter);
        const templates = adapter._templates;

        expect(templates.next).toBeUndefined();
        expect(templates.prev).toBeUndefined();
        expect(templates.bulkDelete).toBeDefined(); // Should still have bulkDelete
    });
});
