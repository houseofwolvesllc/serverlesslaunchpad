/**
 * Enum adapter helpers for generating HAL template properties with enum metadata.
 *
 * These utilities help adapters create self-describing HAL-FORMS templates
 * with human-readable enum labels, following hypermedia/HATEOAS principles.
 *
 * @module enum_adapter_helpers
 */

import type {
    HalTemplateProperty,
    EnumMetadata,
    BitfieldMetadata,
} from "@houseofwolves/serverlesslaunchpad.types";

/**
 * Create options array for HAL template property from enum metadata.
 *
 * Converts enum metadata into the HAL-FORMS options format with
 * value/prompt pairs for use in template properties.
 *
 * @param metadata - Enum metadata with options array
 * @returns Array of HAL options with value and prompt
 *
 * @example
 * ```typescript
 * const roleMetadata: EnumMetadata = {
 *   name: "role",
 *   options: [
 *     { value: 0, label: "Base" },
 *     { value: 1, label: "Support" }
 *   ]
 * };
 *
 * const options = createEnumOptions(roleMetadata);
 * // Returns: [
 * //   { value: 0, prompt: "Base" },
 * //   { value: 1, prompt: "Support" }
 * // ]
 * ```
 */
export function createEnumOptions(
    metadata: EnumMetadata
): Array<{ value: any; prompt: string }> {
    return metadata.options.map((option) => ({
        value: option.value,
        prompt: option.label,
    }));
}

/**
 * Create HAL property for simple enum (select dropdown).
 *
 * Generates a complete HAL template property for a simple enum
 * where only one value can be selected at a time.
 *
 * @param name - Property name
 * @param metadata - Enum metadata
 * @param options - Additional property options (required, value, etc.)
 * @returns HAL template property with select type and options
 *
 * @example
 * ```typescript
 * const roleProperty = createEnumProperty("role", ROLE_METADATA, {
 *   required: true,
 *   value: user.role
 * });
 *
 * // Returns a property suitable for dropdown/select in UI:
 * // {
 * //   name: "role",
 * //   type: "select",
 * //   required: true,
 * //   value: 1,
 * //   options: [
 * //     { value: 0, prompt: "Base" },
 * //     { value: 1, prompt: "Support" },
 * //     ...
 * //   ]
 * // }
 * ```
 */
export function createEnumProperty(
    name: string,
    metadata: EnumMetadata,
    options?: {
        prompt?: string;
        required?: boolean;
        value?: any;
        description?: string;
        readOnly?: boolean;
    }
): HalTemplateProperty {
    return {
        name,
        type: "select",
        prompt: options?.prompt,
        required: options?.required ?? false,
        value: options?.value,
        readOnly: options?.readOnly,
        options: createEnumOptions(metadata),
        ...(options?.description ? { description: options.description } : {}),
    };
}

/**
 * Create HAL property for bitfield enum (checkboxes/toggles).
 *
 * Generates a HAL template property for bitfield enums where multiple
 * values can be selected simultaneously. Uses string array representation
 * for better hypermedia compatibility.
 *
 * @param name - Property name
 * @param metadata - Bitfield metadata
 * @param options - Additional property options
 * @returns HAL template property with checkbox type and options
 *
 * @example
 * ```typescript
 * const featuresProperty = createBitfieldProperty(
 *   "enabled_features",
 *   FEATURES_METADATA,
 *   { value: user.features }
 * );
 *
 * // Returns a property suitable for multi-select checkboxes/toggles:
 * // {
 * //   name: "enabled_features",
 * //   type: "checkbox",
 * //   value: ["contacts", "links"],  // Converted from bitfield
 * //   options: [
 * //     { value: "contacts", prompt: "Contact Management" },
 * //     { value: "campaigns", prompt: "Campaign Builder" },
 * //     ...
 * //   ]
 * // }
 * ```
 */
export function createBitfieldProperty(
    name: string,
    metadata: BitfieldMetadata,
    options?: {
        prompt?: string;
        required?: boolean;
        value?: number;
        description?: string;
        readOnly?: boolean;
    }
): HalTemplateProperty {
    // Convert numeric bitfield to array if value provided
    const valueArray =
        options?.value !== undefined
            ? bitfieldToArray(options.value, metadata)
            : undefined;

    // Create string-based options for bitfield (not numeric)
    // Filter out the "none" value (0) as it doesn't make sense in a multi-select checkbox
    const bitfieldOptions = metadata.options
        .filter((option) => Number(option.value) !== 0)
        .map((option) => ({
            value: getOptionKey(option.value, metadata),
            prompt: option.label,
        }));

    return {
        name,
        type: "checkbox",
        prompt: options?.prompt,
        required: options?.required ?? false,
        value: valueArray,
        readOnly: options?.readOnly,
        options: bitfieldOptions,
        ...(options?.description ? { description: options.description } : {}),
    };
}

/**
 * Convert bitfield integer to array of enabled option keys.
 *
 * Transforms a bitfield numeric value into an array of string keys
 * representing which flags are set. This provides a more hypermedia-friendly
 * representation than raw bitfield integers.
 *
 * @param value - Bitfield integer value
 * @param metadata - Bitfield metadata with flag definitions
 * @returns Array of enabled option keys (lowercase names)
 *
 * @example
 * ```typescript
 * const FEATURES_METADATA: BitfieldMetadata = {
 *   name: "features",
 *   isBitfield: true,
 *   options: [
 *     { value: 1, label: "Contact Management" },  // Contacts
 *     { value: 2, label: "Campaign Builder" },    // Campaigns
 *     { value: 4, label: "Link Tracking" }        // Links
 *   ]
 * };
 *
 * bitfieldToArray(5, FEATURES_METADATA);
 * // Returns: ["contacts", "links"]  (1 + 4 = 5)
 *
 * bitfieldToArray(0, FEATURES_METADATA);
 * // Returns: []  (no flags set)
 * ```
 */
export function bitfieldToArray(
    value: number,
    metadata: BitfieldMetadata
): string[] {
    const result: string[] = [];

    for (const option of metadata.options) {
        const flagValue = Number(option.value);
        if ((value & flagValue) === flagValue && flagValue !== 0) {
            result.push(getOptionKey(option.value, metadata));
        }
    }

    return result;
}

/**
 * Convert array of option keys to bitfield integer.
 *
 * Transforms an array of string keys (from client submission) back into
 * the bitfield integer format used internally. This is the inverse of
 * bitfieldToArray().
 *
 * @param keys - Array of option keys (e.g., ["contacts", "links"])
 * @param metadata - Bitfield metadata with flag definitions
 * @returns Bitfield integer with corresponding flags set
 *
 * @example
 * ```typescript
 * arrayToBitfield(["contacts", "links"], FEATURES_METADATA);
 * // Returns: 5  (1 | 4)
 *
 * arrayToBitfield([], FEATURES_METADATA);
 * // Returns: 0  (none selected)
 *
 * arrayToBitfield(["contacts", "campaigns", "links"], FEATURES_METADATA);
 * // Returns: 7  (1 | 2 | 4)
 * ```
 */
export function arrayToBitfield(
    keys: string[],
    metadata: BitfieldMetadata
): number {
    let result = metadata.none ?? 0;

    for (const key of keys) {
        const option = metadata.options.find(
            (opt) => getOptionKey(opt.value, metadata) === key.toLowerCase()
        );
        if (option) {
            result |= Number(option.value);
        }
    }

    return result;
}

/**
 * Get a normalized string key for an enum option value.
 *
 * Internal helper that converts enum values to consistent lowercase keys.
 * For bitfield flags, derives the key from the label.
 *
 * @param value - The enum option value
 * @param metadata - Enum metadata
 * @returns Lowercase string key
 *
 * @internal
 */
function getOptionKey(value: string | number, metadata: EnumMetadata): string {
    // For bitfields, derive key from label (e.g., "Contact Management" -> "contacts")
    if (metadata.isBitfield) {
        const option = metadata.options.find((opt) => opt.value === value);
        if (option) {
            // Take first word of label and lowercase it
            return option.label.split(" ")[0].toLowerCase();
        }
    }

    // For simple enums, use the value as-is (converted to string)
    return String(value).toLowerCase();
}
