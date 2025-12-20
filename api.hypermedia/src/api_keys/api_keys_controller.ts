import { ApiKeyRepository, Injectable, Role } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller.js";
import { MessageAdapter } from "../content_types/message_adapter.js";
import { Cache, Log, Protected } from "../decorators/index.js";
import { AuthenticatedALBEvent } from "../extended_alb_event.js";
import { Route, Router } from "../router.js";
import { generateApiKey } from "../utils/api_key_generator.js";
import { ApiKeyCollectionAdapter } from "./api_key_collection_adapter.js";
import { CreateApiKeySchema, DeleteApiKeysSchema, GetApiKeysSchema } from "./schemas.js";

/**
 * API Keys endpoint controller demonstrating proper decorator usage
 * with elevated security requirements for programmatic access credentials
 */
@Injectable()
export class ApiKeysController extends BaseController {
    constructor(private apiKeyRepository: ApiKeyRepository, private router: Router) {
        super();
    }

    /**
     * Get paginated list of user API keys
     * Example: POST /users/123/api_keys/list
     * Body: { "pagingInstruction": { ... } }
     *
     * Security: API key management requires elevated privilege (AccountManager) due to
     * programmatic access implications. API keys bypass session-based security controls.
     *
     * Cache Strategy: 600s TTL (vs 300s for sessions) is appropriate because API keys
     * are semi-static credentials that tolerate staleness better than active auth sessions.
     *
     * Decorator execution order (bottom to top):
     * 1. Cache - checks ETag first
     * 2. Protected - authenticates user and validates role/owner access
     * 3. Log - wraps entire execution
     */
    @Log()
    @Protected()
    @Cache({ ttl: 600, vary: ["Authorization"] })
    @Route("POST", "/users/{userId}/api-keys/list")
    async getApiKeys(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request data
        const { params, body } = this.parseRequest(event, GetApiKeysSchema);
        const { userId } = params;
        const { pagingInstruction } = body;

        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId,
        });

        // Call repository with pagination instruction (or undefined for first page)
        const result = await this.apiKeyRepository.getApiKeys({
            userId,
            pagingInstruction,
        });

        // Pass paging instructions as-is (no serialization needed)
        const adapter = new ApiKeyCollectionAdapter(userId, result.items, result.pagingInstructions, this.router);

        return this.success(event, adapter);
    }

    /**
     * Delete multiple API keys
     * Example: POST /users/123/api_keys/delete
     *
     * Security: Requires Admin role (highest privilege) and session authentication for this
     * critical operation. API key deletion immediately revokes programmatic access and cannot
     * be undone, justifying the elevated security requirements vs session deletion (Support role).
     */
    @Log()
    @Protected()
    @Route("POST", "/users/{userId}/api-keys/delete")
    async deleteApiKeys(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request data
        const { params, body } = this.parseRequest(event, DeleteApiKeysSchema);
        const { userId } = params;
        const { apiKeyIds } = body;

        // Get authenticated user and check authorization
        const user = event.authContext.identity;
        this.requireRole(user, Role.Admin, {
            allowOwner: true,
            resourceUserId: userId,
        });

        // Require session auth for bulk deletion (critical operation)
        this.requireSessionAuth(event);

        await this.apiKeyRepository.deleteApiKeys({
            userId,
            apiKeyIds: apiKeyIds,
        });

        // Action response - no self link, use collection template (POST operation)
        const adapter = new MessageAdapter({
            message: `Deleted ${apiKeyIds.length} API keys for user ${userId}`,
            templates: {
                collection: {
                    title: "View API Keys",
                    method: "POST",
                    target: this.router.buildHref(ApiKeysController, "getApiKeys", { userId }),
                    contentType: "application/json",
                    properties: [
                        {
                            name: "pagingInstruction",
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden"
                        }
                    ]
                }
            },
            properties: {
                deletedCount: apiKeyIds.length,
            },
        });

        return this.success(event, adapter);
    }

    /**
     * Create a new API key for programmatic access
     * Example: POST /users/123/api_keys/create
     * Body: { "label": "Production API Key" }
     *
     * Security: Requires AccountManager role and session authentication.
     * API key authentication is blocked to prevent keys from creating other keys.
     *
     * The full API key is returned ONCE in the response. It cannot be retrieved again.
     *
     * Decorator execution order (bottom to top):
     * 1. Protected - authenticates user and validates role/owner access
     * 2. Log - wraps entire execution
     */
    @Log()
    @Protected()
    @Route("POST", "/users/{userId}/api-keys/create")
    async createApiKey(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request
        const { params, body } = this.parseRequest(event, CreateApiKeySchema);
        const { userId } = params;
        const { label } = body;

        // Authorize: AccountManager or owner, session auth required
        const user = event.authContext.identity;
        this.requireRole(user, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId,
        });
        this.requireSessionAuth(event);

        // Generate secure API key
        const apiKey = generateApiKey();

        // Create in repository
        const created = await this.apiKeyRepository.createApiKey({
            userId,
            apiKey,
            label,
        });

        // Return response with full key (one-time display)
        // Action response - no self link, use collection template (POST operation)
        const adapter = new MessageAdapter({
            message: "API key created successfully",
            templates: {
                collection: {
                    title: "View API Keys",
                    method: "POST",
                    target: this.router.buildHref(ApiKeysController, "getApiKeys", { userId }),
                    contentType: "application/json",
                    properties: [
                        {
                            name: "pagingInstruction",
                            prompt: "Paging Instruction",
                            required: false,
                            type: "hidden"
                        }
                    ]
                }
            },
            properties: {
                apiKeyId: created.apiKeyId,
                apiKey: created.apiKey, // FULL KEY - only time it's returned
                label: created.label,
                dateCreated: created.dateCreated.toISOString(),
            },
        });

        return this.success(event, adapter);
    }
}
