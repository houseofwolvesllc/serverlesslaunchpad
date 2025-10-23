import { ApiKeyRepository, Injectable, Role } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { AuthenticatedALBEvent } from "../extended_alb_event";
import { Cache, Log, Protected } from "../decorators/index";
import { Route } from "../router";
import { MessageAdapter } from "../content_types/message_adapter";
import { DeleteApiKeysSchema, GetApiKeysSchema } from "./schemas";
import { ApiKeyCollectionAdapter } from "./api_key_collection_adapter";

/**
 * API Keys endpoint controller
 */
@Injectable()
export class ApiKeysController extends BaseController {
    constructor(
        private apiKeyRepository: ApiKeyRepository
    ) {
        super();
    }

    /**
     * Get paginated list of user API keys
     * Example: POST /users/123/api_keys/list
     * Body: { "pagingInstruction": { ... } }
     * Note: API key management requires higher privilege (AccountManager)
     */
    @Log()
    @Protected()
    @Cache({ ttl: 600, vary: ['Authorization'] })
    @Route('POST', '/users/{userId}/api_keys/list')
    async getApiKeys(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request data
        const { params, body } = this.parseRequest(event, GetApiKeysSchema);
        const { userId } = params;
        const { pagingInstruction } = body;

        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId
        });

        // Call repository with pagination instruction (or undefined for first page)
        const result = await this.apiKeyRepository.getApiKeys({
            userId,
            pagingInstruction
        });

        // Pass paging instructions as-is (no serialization needed)
        const adapter = new ApiKeyCollectionAdapter(
            userId,
            result.items,
            result.pagingInstructions
        );

        return this.success(event, adapter);
    }

    /**
     * Delete multiple API keys
     * Example: POST /users/123/api_keys/delete
     * Requires Admin role and session authentication (critical operation)
     */
    @Log()
    @Protected()
    @Route('POST', '/users/{userId}/api_keys/delete')
    async deleteApiKeys(event: AuthenticatedALBEvent): Promise<ALBResult> {
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

        await this.apiKeyRepository.deleteApiKeys({
            userId,
            apiKeys: apiKeyIds
        });

        const adapter = new MessageAdapter({
            selfHref: `/users/${userId}/api_keys/delete`,
            message: `Deleted ${apiKeyIds.length} API keys for user ${userId}`,
            links: {
                apiKeys: {
                    href: `/users/${userId}/api_keys/list`,
                    title: "View remaining API keys"
                }
            },
            properties: {
                deletedCount: apiKeyIds.length
            }
        });

        return this.success(event, adapter);
    }
}