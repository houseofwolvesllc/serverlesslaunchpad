import { describe, it, expect, beforeAll } from 'vitest';
import { SessionsController } from '../../src/sessions/sessions_controller';
import { SessionRepository, Session, Role } from '@houseofwolves/serverlesslaunchpad.core';
import { Router } from '../../src/router';
import { AuthenticatedALBEvent } from '../../src/extended_alb_event';

/**
 * Integration tests for Sessions controller XHTML responses
 *
 * These tests verify that the Sessions controller correctly supports
 * content negotiation and returns valid XHTML when Accept: text/html
 */
describe('SessionsController XHTML Integration', () => {
    let controller: SessionsController;
    let mockSessionRepository: SessionRepository;
    let router: Router;

    beforeAll(() => {
        // Mock session repository
        mockSessionRepository = {
            getSessions: async ({ userId, pagingInstruction }) => {
                return {
                    items: [
                        {
                            sessionId: 'session_1',
                            userId: userId,
                            sessionToken: 'token_1',
                            createdAt: '2025-10-29T10:00:00Z',
                            expiresAt: '2025-10-30T10:00:00Z',
                            ipAddress: '192.168.1.1',
                            userAgent: 'Mozilla/5.0'
                        } as Session,
                        {
                            sessionId: 'session_2',
                            userId: userId,
                            sessionToken: 'token_2',
                            createdAt: '2025-10-29T11:00:00Z',
                            expiresAt: '2025-10-30T11:00:00Z',
                            ipAddress: '192.168.1.2',
                            userAgent: 'Chrome/120.0'
                        } as Session
                    ],
                    pagingInstructions: pagingInstruction
                };
            },
            deleteSessions: async () => {}
        } as SessionRepository;

        // Create router
        router = new Router({
            apiBaseUrl: 'http://localhost:3001',
            webBaseUrl: 'http://localhost:3000'
        });

        // Create controller
        controller = new SessionsController(mockSessionRepository, router);
    });

    // Helper to create authenticated event with required headers
    const createAuthenticatedEvent = (acceptHeader: string = 'text/html', overrides: Partial<AuthenticatedALBEvent> = {}): AuthenticatedALBEvent => ({
        httpMethod: 'POST',
        path: '/users/user_123/sessions/list',
        pathParameters: {
            userId: 'user_123'
        },
        headers: {
            'Accept': acceptHeader,
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Mozilla/5.0 Test'
        },
        body: JSON.stringify({
            pagingInstruction: {}
        }),
        requestContext: {} as any,
        authContext: {
            identity: {
                userId: 'user_123',
                email: 'test@example.com',
                role: Role.Base,
                features: 0,
                accountId: 'account_1',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
            },
            access: {
                type: 'session',
                sessionId: 'session_1',
                sessionToken: 'token_1'
            }
        },
        traceId: 'trace-123',
        isBase64Encoded: false,
        ...overrides
    } as AuthenticatedALBEvent);

    describe('GET /users/{userId}/sessions/list', () => {
        it('should return XHTML when Accept: text/html', async () => {
            const event = createAuthenticatedEvent('text/html');

            const result = await controller.getSessions(event);

            // Verify response structure
            expect(result.statusCode).toBe(200);
            expect(result.headers?.['Content-Type']).toContain('xhtml');

            // Verify XHTML structure
            const body = result.body;
            expect(body).toContain('<!DOCTYPE html>');
            expect(body).toContain('<html xmlns="http://www.w3.org/1999/xhtml"');
            expect(body).toContain('<article class="hal-resource"');

            // Verify session data is rendered
            expect(body).toContain('session_1');
            expect(body).toContain('session_2');
            expect(body).toContain('192.168.1.1');
            expect(body).toContain('Mozilla/5.0');

            // Verify embedded resources section
            expect(body).toContain('<section class="hal-embedded"');
            expect(body).toContain('<article class="hal-embedded-item"');

            // Verify templates section for delete operations
            expect(body).toContain('<section class="hal-templates"');
            expect(body).toContain('<form class="hal-template"');
            expect(body).toContain('data-method="delete"');

            // Verify links section
            expect(body).toContain('<nav class="hal-links"');
        });

        it('should return XHTML when Accept: application/xhtml+xml', async () => {
            const event = createAuthenticatedEvent('application/xhtml+xml');

            const result = await controller.getSessions(event);

            expect(result.statusCode).toBe(200);
            expect(result.headers?.['Content-Type']).toContain('xhtml');
            expect(result.body).toContain('<!DOCTYPE html>');
        });

        it('should return JSON when Accept: application/json', async () => {
            const event = createAuthenticatedEvent('application/json');

            const result = await controller.getSessions(event);

            expect(result.statusCode).toBe(200);
            expect(result.headers?.['Content-Type']).toContain('json');

            // Verify JSON structure
            const body = JSON.parse(result.body);
            expect(body).toHaveProperty('_embedded');
            expect(body).toHaveProperty('_links');
            expect(body).toHaveProperty('_templates');
        });

        it('should include delete templates for each session', async () => {
            const event = createAuthenticatedEvent('text/html');

            const result = await controller.getSessions(event);
            const body = result.body;

            // Verify each session has a delete template
            expect(body).toContain('data-name="delete"');
            expect(body).toContain('button type="submit"');

            // Should have delete forms (one per session in embedded items)
            const deleteMatches = body.match(/data-method="delete"/g);
            expect(deleteMatches).toBeTruthy();
            expect(deleteMatches!.length).toBeGreaterThan(0);
        });

        it('should escape HTML entities for XSS protection', async () => {
            // Mock with potentially malicious data
            const maliciousRepo = {
                getSessions: async () => ({
                    items: [{
                        sessionId: 'session_1',
                        userId: 'user_123',
                        sessionToken: 'token_1',
                        createdAt: '2025-10-29T10:00:00Z',
                        expiresAt: '2025-10-30T10:00:00Z',
                        ipAddress: '<script>alert("xss")</script>',
                        userAgent: '<img src=x onerror=alert(1)>'
                    }] as Session[],
                    pagingInstructions: {}
                })
            } as SessionRepository;

            const testController = new SessionsController(maliciousRepo, router);

            const event = createAuthenticatedEvent('text/html');

            const result = await testController.getSessions(event);
            const body = result.body;

            // Verify HTML entities are escaped
            expect(body).toContain('&lt;script&gt;');
            expect(body).toContain('&lt;img');
            expect(body).not.toContain('<script>');
            expect(body).not.toContain('<img src=x');
        });
    });
});
