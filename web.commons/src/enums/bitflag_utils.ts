/**
 * Bitflag utilities for client-side bitfield handling.
 *
 * These utilities help web clients work with bitfield enums, parsing
 * and formatting bitfield values for display and manipulation.
 *
 * @module bitflag_utils
 */

import type { EnumOption } from "@houseofwolves/serverlesslaunchpad.types";

/**
 * Parse bitfield value to array of enabled flag labels.
 *
 * Converts a numeric bitfield value into an array of human-readable
 * labels for the enabled flags. Useful for displaying which features
 * or permissions are active.
 *
 * @param value - Bitfield integer value
 * @param options - Enum options with flag values and labels
 * @returns Array of labels for enabled flags
 *
 * @example
 * ```typescript
 * const options: EnumOption[] = [
 *   { value: 1, label: "Contact Management" },
 *   { value: 2, label: "Campaign Builder" },
 *   { value: 4, label: "Link Tracking" }
 * ];
 *
 * parseBitfield(5, options);
 * // Returns: ["Contact Management", "Link Tracking"]  (1 + 4 = 5)
 *
 * parseBitfield(0, options);
 * // Returns: []  (no flags set)
 * ```
 */
export function parseBitfield(
    value: number | undefined | null,
    options: EnumOption[]
): string[] {
    if (value === undefined || value === null || value === 0) {
        return [];
    }

    const result: string[] = [];

    for (const option of options) {
        const flagValue = Number(option.value);
        if ((value & flagValue) === flagValue && flagValue !== 0) {
            result.push(option.label);
        }
    }

    return result;
}

/**
 * Check if a specific flag is set in a bitfield value.
 *
 * Tests whether a particular flag bit is set in the bitfield value
 * using bitwise AND operation.
 *
 * @param value - Bitfield integer value
 * @param flag - Flag value to check
 * @returns True if flag is set
 *
 * @example
 * ```typescript
 * const features = 5; // Binary: 0101 (Contacts + Links)
 *
 * hasBitflag(features, 1); // true  (Contacts is set)
 * hasBitflag(features, 2); // false (Campaigns is not set)
 * hasBitflag(features, 4); // true  (Links is set)
 * ```
 */
export function hasBitflag(
    value: number | undefined | null,
    flag: number
): boolean {
    if (value === undefined || value === null || flag === 0) {
        return false;
    }

    return (value & flag) === flag;
}

/**
 * Format bitfield as human-readable string.
 *
 * Converts a bitfield value into a comma-separated string of enabled
 * flag labels. Useful for displaying in tables, lists, or summaries.
 *
 * @param value - Bitfield integer value
 * @param options - Enum options with flag values and labels
 * @param separator - String to join labels (default: ", ")
 * @returns Formatted string of enabled flags
 *
 * @example
 * ```typescript
 * const options: EnumOption[] = [
 *   { value: 1, label: "Contact Management" },
 *   { value: 2, label: "Campaign Builder" },
 *   { value: 4, label: "Link Tracking" }
 * ];
 *
 * formatBitfield(5, options);
 * // Returns: "Contact Management, Link Tracking"
 *
 * formatBitfield(5, options, " | ");
 * // Returns: "Contact Management | Link Tracking"
 *
 * formatBitfield(0, options);
 * // Returns: "None"
 * ```
 */
export function formatBitfield(
    value: number | undefined | null,
    options: EnumOption[],
    separator: string = ", "
): string {
    const labels = parseBitfield(value, options);

    if (labels.length === 0) {
        return "None";
    }

    return labels.join(separator);
}

/**
 * Get count of enabled flags in a bitfield.
 *
 * Counts how many flags are set in the bitfield value.
 *
 * @param value - Bitfield integer value
 * @param options - Enum options with flag values
 * @returns Number of enabled flags
 *
 * @example
 * ```typescript
 * const options: EnumOption[] = [
 *   { value: 1, label: "Contacts" },
 *   { value: 2, label: "Campaigns" },
 *   { value: 4, label: "Links" }
 * ];
 *
 * countBitflags(5, options); // Returns: 2 (Contacts + Links)
 * countBitflags(0, options); // Returns: 0
 * countBitflags(7, options); // Returns: 3 (all flags)
 * ```
 */
export function countBitflags(
    value: number | undefined | null,
    options: EnumOption[]
): number {
    return parseBitfield(value, options).length;
}

/**
 * Toggle a specific flag in a bitfield value.
 *
 * Returns a new bitfield value with the specified flag toggled
 * (set if unset, unset if set).
 *
 * @param value - Current bitfield value
 * @param flag - Flag value to toggle
 * @returns New bitfield value with flag toggled
 *
 * @example
 * ```typescript
 * const features = 5; // Binary: 0101 (Contacts + Links)
 *
 * toggleBitflag(features, 2); // Returns: 7  (adds Campaigns)
 * toggleBitflag(features, 1); // Returns: 4  (removes Contacts)
 * ```
 */
export function toggleBitflag(
    value: number | undefined | null,
    flag: number
): number {
    const current = value ?? 0;
    return current ^ flag; // XOR toggles the bit
}

/**
 * Set a specific flag in a bitfield value.
 *
 * Returns a new bitfield value with the specified flag set (enabled).
 *
 * @param value - Current bitfield value
 * @param flag - Flag value to set
 * @returns New bitfield value with flag set
 *
 * @example
 * ```typescript
 * const features = 1; // Binary: 0001 (only Contacts)
 *
 * setBitflag(features, 4); // Returns: 5 (Contacts + Links)
 * setBitflag(features, 1); // Returns: 1 (already set)
 * ```
 */
export function setBitflag(
    value: number | undefined | null,
    flag: number
): number {
    const current = value ?? 0;
    return current | flag; // OR sets the bit
}

/**
 * Unset a specific flag in a bitfield value.
 *
 * Returns a new bitfield value with the specified flag unset (disabled).
 *
 * @param value - Current bitfield value
 * @param flag - Flag value to unset
 * @returns New bitfield value with flag unset
 *
 * @example
 * ```typescript
 * const features = 5; // Binary: 0101 (Contacts + Links)
 *
 * unsetBitflag(features, 1); // Returns: 4 (only Links)
 * unsetBitflag(features, 2); // Returns: 5 (wasn't set anyway)
 * ```
 */
export function unsetBitflag(
    value: number | undefined | null,
    flag: number
): number {
    const current = value ?? 0;
    return current & ~flag; // AND with NOT unsets the bit
}
