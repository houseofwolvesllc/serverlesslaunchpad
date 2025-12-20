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

vi.mock('../../../../src/features/sitemap/utils/endpoint_route_mapper', () => ({
    mapEndpointToRoute: vi.fn((href: string) => {
        if (href.includes('api_keys')) return '/account/api-keys';
        if (href.includes('sessions')) return '/account/sessions';
        return href;
    }),
    extractResourceName: vi.fn((href: string) => {
        if (href.includes('api_keys')) return 'API Keys';
        if (href.includes('sessions')) return 'Sessions';
        return 'Resource';
    }),
}));

describe('executePostAction', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should execute POST request and navigate on success', async () => {
        const mockResponse = { data: { items: [] } };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        await executePostAction('/users/abc123/api_keys/list', 'API Keys', mockNavigate);

        // Verify loading notification shown
        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                loading: true,
                message: 'Loading API Keys...',
            })
        );

        // Verify POST request made
        expect(apiClient.post).toHaveBeenCalledWith('/users/abc123/api_keys/list');

        // Verify success notification shown
        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                loading: false,
                color: 'green',
                message: 'API Keys loaded successfully',
            })
        );

        // Verify navigation occurred
        expect(mockNavigate).toHaveBeenCalledWith('/account/api-keys', expect.objectContaining({
            state: { data: mockResponse },
        }));
    });

    it('should show error notification on 401 unauthorized', async () => {
        const error = new ApiClientError(401, { message: 'Unauthorized' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api_keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        // Verify error notification shown
        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                loading: false,
                color: 'red',
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

        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining("You don't have permission"),
            })
        );
    });

    it('should show error notification on 404 not found', async () => {
        const error = new ApiClientError(404, { message: 'Not Found' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api_keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('Resource not found'),
            })
        );
    });

    it('should show error notification on 500 server error', async () => {
        const error = new ApiClientError(500, { message: 'Internal Server Error' });
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api_keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('Server error. Please try again later'),
            })
        );
    });

    it('should handle network errors', async () => {
        const error = new Error('Network error occurred');
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api_keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('Network error. Check your connection'),
            })
        );
    });

    it('should handle abort errors', async () => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        vi.mocked(apiClient.post).mockRejectedValue(error);

        await expect(
            executePostAction('/users/abc123/api_keys/list', 'API Keys', mockNavigate)
        ).rejects.toThrow();

        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('Request was cancelled'),
            })
        );
    });

    it('should use title parameter for notification messages', async () => {
        const mockResponse = { data: { items: [] } };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        await executePostAction('/users/abc123/sessions/list', 'My Sessions', mockNavigate);

        expect(notifications.show).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Loading My Sessions...',
            })
        );

        expect(notifications.update).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'My Sessions loaded successfully',
            })
        );
    });
});
