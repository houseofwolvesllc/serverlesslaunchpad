import { Injectable, Role, UserRepository, UpsertUserMessage, Features } from "@houseofwolves/serverlesslaunchpad.core";
import type { BitfieldMetadata } from "@houseofwolves/serverlesslaunchpad.types";
import { arrayToBitfield } from "../content_types/enum_adapter_helpers.js";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller.js";
import { Cache, Log, Protected } from "../decorators/index.js";
import { NotFoundError } from "../errors.js";
import { AuthenticatedALBEvent } from "../extended_alb_event.js";
import { Route, Router } from "../router.js";
import { UpdateUserSchema, UserSchema } from "./schemas.js";
import { UserAdapter } from "./user_adapter.js";

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
    /**
     * Bitfield metadata for Features field (same as UserAdapter)
     * Used to convert features array to bitfield integer for storage
     */
    private static readonly FEATURES_METADATA: BitfieldMetadata = {
        name: "features",
        isBitfield: true,
        none: Features.None,
        options: [
            { value: Features.None, label: "None", description: "No features enabled" },
            { value: Features.Contacts, label: "Contact Management" },
            { value: Features.Campaigns, label: "Campaign Builder" },
            { value: Features.Links, label: "Link Tracking" },
            { value: Features.Apps, label: "App Integrations" },
        ],
    };

    constructor(private userRepository: UserRepository, private router: Router) {
        super();
    }

    /**
     * Get user profile by ID
     * Example: GET /users/user-123
     *
     * Cache Strategy: 600s TTL is appropriate because user profiles are
     * relatively static data. Role and feature changes are infrequent
     * enough to tolerate cache staleness.
     *
     * Authorization: AccountManager can view any profile (audit/support).
     * Users can view their own profile for self-service needs.
     *
     * Decorator execution order (bottom to top):
     * 1. Cache - checks ETag first, may return 304
     * 2. Protected - authenticates and validates authorization
     * 3. Log - wraps entire execution with timing
     */
    @Log()
    @Protected()
    @Cache({ ttl: 600, vary: ["Authorization"] })
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

        // Create HAL adapter with hypermedia links (pass currentUser for template generation)
        const adapter = new UserAdapter(user, currentUser, this.router);

        return this.success(event, adapter);
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

        // Base authorization: User can edit own profile OR Admin can edit any
        this.requireRole(currentUser, Role.Admin, {
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

        // Convert features array to bitfield if provided
        let features = existingUser.features;
        if (body.features !== undefined) {
            features = arrayToBitfield(body.features, UsersController.FEATURES_METADATA);
        }

        // Build update message by merging with existing data
        const updateMessage: UpsertUserMessage = {
            userId: existingUser.userId, // Immutable
            email: existingUser.email, // Immutable (Cognito-managed)
            firstName: body.firstName ?? existingUser.firstName,
            lastName: body.lastName ?? existingUser.lastName,
            role: body.role ?? existingUser.role,
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
}
