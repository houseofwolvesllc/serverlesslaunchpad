import type { EnumMetadata } from "@houseofwolves/serverlesslaunchpad.types";

/**
 * User role enumeration
 *
 * Defines the authorization levels for users in the system.
 * Roles are hierarchical - higher values imply greater permissions.
 */
export enum Role {
    Base,           // 0 - Basic user access
    Support,        // 1 - Customer support access
    AccountManager, // 2 - Account management access
    Admin,          // 3 - Full administrative access
}

/**
 * Enum metadata for Role field
 *
 * Defines human-readable labels for each role value.
 * Used by API layer for HAL template properties and validation.
 * Used by web clients for rendering role selectors.
 */
export const ROLE_METADATA: EnumMetadata = {
    name: "role",
    options: [
        { value: Role.Base, label: "Base" },
        { value: Role.Support, label: "Support" },
        { value: Role.AccountManager, label: "Account Manager" },
        { value: Role.Admin, label: "Admin" },
    ],
};
