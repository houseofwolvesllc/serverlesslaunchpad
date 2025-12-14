import {
    FEATURES_METADATA,
    Injectable,
    Role,
    ROLE_METADATA,
    UpsertUserMessage,
    User,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import type { PagingInstructions } from "@houseofwolves/serverlesslaunchpad.types";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller.js";
import { arrayToBitfield, enumLabelToValue } from "../content_types/enum_adapter_helpers.js";
import { Log, Protected } from "../decorators/index.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { AuthenticatedALBEvent } from "../extended_alb_event.js";
import { Route, Router } from "../router.js";
import { GetUsersSchema, UpdateUserSchema, UserSchema } from "./schemas.js";
import { UserAdapter } from "./user_adapter.js";
import { UserCollectionAdapter } from "./user_collection_adapter.js";

/**
 * Users endpoint controller for retrieving user profile information
 *
 * This controller demonstrates the catchall HATEOAS strategy where the
 * `user` link from AuthContextAdapter can be followed to retrieve full
 * user details.
 *
 * Security Model:
 * - AccountManager role can access any user profile
 * - Users can access their own profile (allowOwner: true)
 * - Cache varies by Authorization to prevent cross-user data leaks
 */
@Injectable()
export class UsersController extends BaseController {
    constructor(private userRepository: UserRepository, private router: Router) {
        super();
    }

    /**
     * Get user profile by ID
     * Example: GET /users/user-123
     *
     * ETag Strategy: Uses userId + dateModified timestamp.
     * Returns 304 Not Modified if client has current version.
     *
     * Authorization: AccountManager can view any profile (audit/support).
     * Users can view their own profile for self-service needs.
     *
     * Decorator execution order (bottom to top):
     * 1. Protected - authenticates and validates authorization
     * 2. Log - wraps entire execution with timing
     */
    @Log()
    @Protected()
    @Route("GET", "/users/{userId}")
    async getUser(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request
        const { params } = this.parseRequest(event, UserSchema);
        const { userId } = params;

        // Get authenticated user and check authorization
        const currentUser = event.authContext.identity;
        this.requireRole(currentUser, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId,
        });

        // Retrieve user from repository
        const user = await this.userRepository.getUserById({ userId });

        if (!user) {
            throw new NotFoundError(`User ${userId} not found`);
        }

        // Generate ETag from entity
        const etag = this.generateUserETag(user);

        // Check if client has current version
        const notModified = this.checkNotModified(event, etag);
        if (notModified) return notModified;

        // Create HAL adapter with hypermedia links (pass currentUser for template generation)
        const adapter = new UserAdapter(user, currentUser, this.router);

        return this.success(event, adapter, {
            headers: { ETag: etag },
        });
    }

    /**
     * Update user profile
     *
     * Example: POST /users/user-123 with _method=put (or real PUT /users/user-123)
     *
     * Authorization:
     * - Users can update their own firstName/lastName
     * - Admins can update any user's firstName/lastName
     * - Only admins can update role and features
     *
     * Field-Level Authorization:
     * - role and features fields require Admin role even for self-update
     *
     * @throws {NotFoundError} User not found
     * @throws {ForbiddenError} Unauthorized to edit user or field
     * @throws {ValidationError} Invalid input data
     */
    @Log()
    @Protected()
    @Route("POST", "/users/{userId}")
    async updateUser(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request
        const { params, body } = this.parseRequest(event, UpdateUserSchema);
        const { userId } = params;

        // Get authenticated user from JWT
        const currentUser = event.authContext.identity;

        // Base authorization: User can edit own profile OR AccountManagers can edit any
        this.requireRole(currentUser, Role.AccountManager, {
            allowOwner: true,
            resourceUserId: userId,
        });

        // Retrieve existing user from repository
        const existingUser = await this.userRepository.getUserById({ userId });

        if (!existingUser) {
            throw new NotFoundError(`User ${userId} not found`);
        }

        // Field-level authorization: Only admins can modify role/features
        if (body.role !== undefined || body.features !== undefined) {
            this.requireRole(currentUser, Role.Admin);
        }

        // Convert role label to enum value if provided
        let role = existingUser.role;
        if (body.role !== undefined) {
            // If it's a string, convert label to value; if it's already a number, use it
            if (typeof body.role === "string") {
                const convertedRole = enumLabelToValue(body.role, ROLE_METADATA);
                if (convertedRole === undefined) {
                    throw new ValidationError("Invalid role value");
                }
                role = convertedRole;
            } else {
                role = body.role;
            }
        }

        // Convert features to bitfield if provided
        let features = existingUser.features;
        if (body.features !== undefined) {
            // If it's an array, convert to bitfield; if it's already a number, use it
            if (Array.isArray(body.features)) {
                features = arrayToBitfield(body.features, FEATURES_METADATA);
            } else {
                features = body.features;
            }
        }

        // Build update message by merging with existing data
        const updateMessage: UpsertUserMessage = {
            userId: existingUser.userId, // Immutable
            email: existingUser.email, // Immutable (Cognito-managed)
            firstName: body.firstName ?? existingUser.firstName,
            lastName: body.lastName ?? existingUser.lastName,
            role,
            features,
            dateCreated: existingUser.dateCreated, // Immutable
            dateModified: new Date(), // Auto-update
        };

        // Persist changes via repository
        const updatedUser = await this.userRepository.upsertUser(updateMessage);

        // Return updated HAL resource with templates
        const adapter = new UserAdapter(updatedUser, currentUser, this.router);
        return this.success(event, adapter);
    }

    /**
     * Get paginated list of all users
     * Example: POST /users/list
     * Body: { "pagingInstruction": { ... } }
     *
     * Security: Only Admin role can list all users (user management)
     *
     * ETag Strategy: Uses query hash + limit + first/last record identifiers.
     * Returns 304 Not Modified if client has current version of this page.
     *
     * Note: This endpoint showcases pure HAL/HATEOAS architecture.
     * The collection will be rendered by generic frontend components with ZERO custom code.
     *
     * Decorator execution order (bottom to top):
     * 1. Protected - authenticates user and validates Admin role
     * 2. Log - wraps entire execution
     */
    @Log()
    @Protected()
    @Route("POST", "/users/list")
    async getUsers(event: AuthenticatedALBEvent): Promise<ALBResult> {
        // Parse and validate request data
        const { body } = this.parseRequest(event, GetUsersSchema);
        const { pagingInstruction } = body;

        // Get authenticated user and check authorization
        const currentUser = event.authContext.identity;
        this.requireRole(currentUser, Role.AccountManager);

        // Parse paging instruction if provided
        let lastEvaluatedKey: string | undefined;
        if (pagingInstruction && pagingInstruction.cursor) {
            lastEvaluatedKey = pagingInstruction.cursor;
        }

        // Call repository with pagination
        const result = await this.userRepository.getAllUsers({
            limit: 50,
            lastEvaluatedKey,
        });

        // Build paging instructions for HAL response (similar to API Keys pattern)
        const pagingInstructions: PagingInstructions = {
            ...(result.lastEvaluatedKey ? { next: { limit: 50 } } : {}),
        };

        // Add cursor to next instruction if there's more data
        if (result.lastEvaluatedKey && pagingInstructions.next) {
            (pagingInstructions.next as any).cursor = result.lastEvaluatedKey;
        }

        // Generate ETag from collection
        const etag = this.generateUsersListETag(result.users, { cursor: pagingInstruction?.cursor }, { limit: 50 });

        // Check if client has current version
        const notModified = this.checkNotModified(event, etag);
        if (notModified) return notModified;

        // Return collection adapter with embedded user resources
        const adapter = new UserCollectionAdapter(result.users, currentUser, pagingInstructions, this.router);

        return this.success(event, adapter, {
            headers: { ETag: etag },
        });
    }

    /**
     * Generate ETag for a single user resource.
     * Format: "{userId}-{dateModifiedTimestamp}"
     */
    private generateUserETag(user: User): string {
        const timestamp = new Date(user.dateModified).getTime();
        return `"${user.userId}-${timestamp}"`;
    }

    /**
     * Generate ETag for a users list/collection.
     * Based on query params, pagination, and first/last record identifiers.
     */
    private generateUsersListETag(users: User[], query: Record<string, any>, pagination: { limit: number }): string {
        if (users.length === 0) {
            const queryHash = this.simpleHash(JSON.stringify(query));
            return `"list-${queryHash}-${pagination.limit}-empty"`;
        }

        const first = users[0];
        const last = users[users.length - 1];
        const queryHash = this.simpleHash(JSON.stringify(query));
        const firstTs = new Date(first.dateModified).getTime();
        const lastTs = new Date(last.dateModified).getTime();

        return `"list-${queryHash}-${pagination.limit}-${first.userId}-${firstTs}-${last.userId}-${lastTs}"`;
    }
}
