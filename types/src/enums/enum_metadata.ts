/**
 * Enum metadata types for hypermedia API enum translation.
 *
 * These types define the structure for providing human-readable labels
 * and metadata for enum values in HAL responses.
 */

/**
 * Represents a single option in an enum with display metadata.
 *
 * @example
 * ```typescript
 * const option: EnumOption = {
 *   value: 1,
 *   label: "Support",
 *   description: "Customer support role with limited permissions"
 * };
 * ```
 */
export interface EnumOption {
    /**
     * The actual enum value (number or string).
     * This is the value stored in the database and used in API requests.
     */
    value: string | number;

    /**
     * Human-readable label for display in the UI.
     * Should be clear, concise, and user-friendly.
     *
     * @example "Account Manager", "Contact Management"
     */
    label: string;

    /**
     * Optional detailed description of what this option means.
     * Can be used for tooltips, help text, or documentation.
     *
     * @example "Users with this role can manage customer accounts and view reports"
     */
    description?: string;
}

/**
 * Metadata for a complete enum definition.
 *
 * Contains all options for an enum and can be used to generate
 * HAL template properties with proper display labels.
 *
 * @example
 * ```typescript
 * const roleMetadata: EnumMetadata = {
 *   name: "role",
 *   options: [
 *     { value: 0, label: "Base" },
 *     { value: 1, label: "Support" },
 *     { value: 2, label: "Account Manager" },
 *     { value: 3, label: "Admin" }
 *   ]
 * };
 * ```
 */
export interface EnumMetadata {
    /**
     * The name/identifier of the enum.
     * Used for logging, debugging, and documentation.
     *
     * @example "role", "user_status", "feature_flags"
     */
    name: string;

    /**
     * Array of all possible options for this enum.
     * Each option includes the value and display label.
     */
    options: EnumOption[];

    /**
     * Indicates if this enum is a bitfield (supports multiple selections).
     * When true, values can be combined using bitwise OR operations.
     *
     * @default false
     */
    isBitfield?: boolean;
}

/**
 * Metadata for bitfield enums that support multiple simultaneous values.
 *
 * Bitfield enums use bitwise operations to combine multiple flags:
 * - Each flag is a power of 2 (1, 2, 4, 8, 16, ...)
 * - Values can be combined with bitwise OR: `Contacts | Links = 5`
 * - Individual flags can be checked with bitwise AND: `value & Contacts`
 *
 * @example
 * ```typescript
 * const featuresMetadata: BitfieldMetadata = {
 *   name: "features",
 *   isBitfield: true,
 *   none: 0,
 *   options: [
 *     { value: 1, label: "Contact Management" },      // 1 << 0
 *     { value: 2, label: "Campaign Builder" },        // 1 << 1
 *     { value: 4, label: "Link Tracking" },           // 1 << 2
 *     { value: 8, label: "App Integrations" }         // 1 << 3
 *   ]
 * };
 * ```
 */
export interface BitfieldMetadata extends EnumMetadata {
    /**
     * Explicitly marks this as a bitfield enum.
     * Required to be true for BitfieldMetadata.
     */
    isBitfield: true;

    /**
     * The value representing "no flags selected".
     * Typically 0, but can be customized if needed.
     *
     * @default 0
     */
    none?: number;
}
