import { BaseController } from "../base_controller.js";
import { Route } from "../router.js";
import { Protected, Cache } from "../decorators/index.js";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";
import { AuthenticatedALBEvent } from "../common/extended_alb_event.js";
import { GetApiKeysSchema, DeleteApiKeysSchema } from "./schemas.js";
import { HypermediaResponse } from "../common/types.js";

/**
 * API Keys endpoint controller
 */
export class ApiKeysController extends BaseController {
    /**
     * Get paginated list of user API keys
     * Example: GET /users/123/api_keys
     * Note: API key management requires higher privilege (AccountManager)
     */
    @Protected()
    @Cache({ ttl: 600, vary: ['Authorization'] })
    @Route('GET', '/users/{userId}/api_keys')
    async getApiKeys(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse and validate request data
        const { params, query } = this.parseRequest(event, GetApiKeysSchema);
        const { userId } = params;
        const { limit, cursor } = query;

        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId
        });

        // TODO: Implement API keys retrieval
        // const apiKeys = await this.apiKeyRepository.findByUserId(userId, { limit, cursor });
        
        // Return mock API key data for now
        return this.success({
            apiKeys: [],
            pagination: {
                limit,
                cursor,
                hasMore: false
            }
        });
    }

    /**
     * Get specific API key details
     * Example: GET /users/123/api_keys/456
     */
    @Protected()
    @Cache({ ttl: 900 })
    @Route('GET', '/users/{userId}/api_keys/{apiKeyId}')
    async getApiKeyById(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse parameters
        const { userId, apiKeyId } = this.getPathParams(event);
        
        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // TODO: Implement single API key retrieval
        // const apiKey = await this.apiKeyRepository.findById(apiKeyId);
        
        // Return mock API key data for now
        return this.success({ 
            apiKeyId,
            userId,
            name: "Production API Key",
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            expiresAt: null // No expiration
        });
    }

    /**
     * Delete a specific API key
     * Example: DELETE /users/123/api_keys/456
     * Requires Admin role for security (deleting API keys is dangerous)
     */
    @Protected()
    @Route('DELETE', '/users/{userId}/api_keys/{apiKeyId}')
    async deleteApiKey(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse parameters
        const { userId, apiKeyId } = this.getPathParams(event);
        
        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Admin, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // TODO: Implement API key deletion
        // Note: Logging is handled by @Log decorator
        return this.noContent();
    }

    /**
     * Delete multiple API keys
     * Example: POST /users/123/api_keys/delete
     * Requires Admin role and session authentication (critical operation)
     */
    @Protected()
    @Route('POST', '/users/{userId}/api_keys/delete')
    async deleteApiKeys(event: AuthenticatedALBEvent): Promise<HypermediaResponse> {
        // Parse and validate request data
        const { params, body } = this.parseRequest(event, DeleteApiKeysSchema);
        const { userId } = params;
        const { apiKeyIds } = body;
        
        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Admin, {
            allowOwner: true,
            resourceUserId: userId
        });
        
        // Require session auth for bulk deletion (critical operation)
        this.requireSessionAuth(event);

        // TODO: Implement multiple API key deletion
        return this.success({ 
            message: `Deleted ${apiKeyIds.length} API keys for user ${userId}`,
            deletedCount: apiKeyIds.length
        });
    }
}