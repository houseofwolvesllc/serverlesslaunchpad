/**
 * Unit tests for navigation_actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executePostAction } from '../../../../src/features/sitemap/utils/navigation_actions';
import { apiClient, ApiClientError } from '../../../../src/services/api.client';
import { notifications } from '@mantine/notifications';

// Mock dependencies
vi.mock('../../../../src/services/api.client', () => ({
    apiClient: {
        post: vi.fn(),
    },
    ApiClientError: class extends Error {
        constructor(public status: number, public error: { message: string }) {
            super(error.message);
            this.name = 'ApiClientError';
        }
    },
}));

vi.mock('@mantine/notifications', () => ({
    notifications: {
        show: vi.fn(),
        update: vi.fn(),
    },
}));

// No longer need to mock endpoint_route_mapper - it has been removed

describe('executePostAction', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should execute POST request and navigate to self link on success', async () => {
        const mockResponse = {
            data: { items: [] },
            _links: {
                self: { href: '/users/abc123/api-keys/list' },
            },
        };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        await executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate);

        // Verify POST request made
        expect(apiClient.post).toHaveBeenCalledWith('/users/abc123/api-keys/list');

        // Verify navigation occurred to self link
        expect(mockNavigate).toHaveBeenCalledWith('/users/abc123/api-keys/list', {
            state: { data: mockResponse, navigationSource: 'menu' },
        });
    });

    it('should show error notification on 401 unauthorized', async () => {
        const error = new ApiClientError(401, { message: 'Unauthorized' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        // Verify error notification shown
        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'red',
                title: 'Error',
                message: expect.stringContaining('Please sign in to continue'),
            })
        );

        // Verify no navigation occurred
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show error notification on 403 forbidden', async () => {
        const error = new ApiClientError(403, { message: 'Forbidden' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/sessions/list', 'Sessions', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'red',
                message: expect.stringContaining("You don't have permission"),
            })
        );
    });

    it('should show error notification on 404 not found', async () => {
        const error = new ApiClientError(404, { message: 'Not Found' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'red',
                message: expect.stringContaining('Resource not found'),
            })
        );
    });

    it('should show error notification on 500 server error', async () => {
        const error = new ApiClientError(500, { message: 'Internal Server Error' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'red',
                message: expect.stringContaining('Server error. Please try again later'),
            })
        );
    });

    it('should handle network errors', async () => {
        const error = new Error('Network error occurred');
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'red',
                message: expect.stringContaining('Network error. Check your connection'),
            })
        );
    });

    it('should handle abort errors', async () => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                color: 'red',
                message: expect.stringContaining('Request was cancelled'),
            })
        );
    });

    it('should force full page reload when response includes federate link', async () => {
        const mockResponse = {
            message: 'Session revoked successfully',
            _links: {
                federate: { href: '/auth/federate' }
            },
        };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        // Mock window.location.href setter
        const mockLocation = { href: '' };
        vi.stubGlobal('window', { location: mockLocation });

        // This works for any action that returns a federate link (logout, session expiry, etc.)
        await executePostAction('/auth/revoke', 'Logout', mockNavigate);

        expect(apiClient.post).toHaveBeenCalledWith('/auth/revoke');
        expect(mockLocation.href).toBe('/auth/signin');
        expect(mockNavigate).not.toHaveBeenCalled(); // Should NOT use navigate

        // Cleanup
        vi.unstubAllGlobals();
    });

    it('should navigate to the called endpoint (POST-only API pattern)', async () => {
        const mockResponse = {
            message: 'Action completed',
            _links: {
                collection: { href: '/users/abc123/api-keys/list' }
            },
        };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        // POST-only API: navigate to the endpoint we just called, not collection
        await executePostAction('/users/abc123/api-keys/create', 'Create', mockNavigate);

        expect(mockNavigate).toHaveBeenCalledWith('/users/abc123/api-keys/create', {
            state: { data: mockResponse, navigationSource: 'menu' }
        });
    });

    it('should navigate even when response has no links (POST-only API)', async () => {
        const mockResponse = {
            data: { items: [] },
            _links: {},
        };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        // POST-only API: navigate to the endpoint we called, not response links
        await executePostAction('/users/abc123/api-keys/list', 'API Keys', mockNavigate);

        expect(mockNavigate).toHaveBeenCalledWith('/users/abc123/api-keys/list', {
            state: { data: mockResponse, navigationSource: 'menu' }
        });
    });
});
