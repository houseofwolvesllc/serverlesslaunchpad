/**
 * Enum translation utilities for client-side label resolution.
 *
 * These utilities help web clients resolve enum display labels from
 * HAL template metadata, supporting the hypermedia/HATEOAS approach
 * where the server provides all display information.
 *
 * @module enum_translation
 */

import type { HalTemplateProperty, EnumOption } from "@houseofwolves/serverlesslaunchpad.types";

/**
 * Get display label for an enum value from HAL template options.
 *
 * Resolves the human-readable label for an enum value by looking it up
 * in the HAL template property's options array. Falls back to the raw
 * value if no metadata is available.
 *
 * @param value - The enum value to get a label for
 * @param property - HAL template property with options metadata
 * @param fallback - Optional fallback string if value not found
 * @returns Display label or fallback
 *
 * @example
 * ```typescript
 * const property: HalTemplateProperty = {
 *   name: "role",
 *   type: "select",
 *   options: [
 *     { value: 0, prompt: "Base" },
 *     { value: 1, prompt: "Support" },
 *     { value: 2, prompt: "Account Manager" }
 *   ]
 * };
 *
 * getEnumLabel(1, property);  // Returns: "Support"
 * getEnumLabel(99, property); // Returns: "99" (fallback to string value)
 * getEnumLabel(99, property, "Unknown"); // Returns: "Unknown"
 * ```
 */
export function getEnumLabel(
    value: any,
    property: HalTemplateProperty | undefined,
    fallback?: string
): string {
    if (!property?.options || property.options.length === 0) {
        return fallback ?? String(value);
    }

    const option = property.options.find((opt) => opt.value === value);
    return option?.prompt ?? fallback ?? String(value);
}

/**
 * Get all enum options from HAL template property.
 *
 * Extracts the complete set of enum options from a HAL template property,
 * converting from HAL format (value/prompt) to a more generic format
 * (value/label).
 *
 * @param property - HAL template property with options
 * @returns Array of enum options, or empty array if no options
 *
 * @example
 * ```typescript
 * const property: HalTemplateProperty = {
 *   name: "role",
 *   type: "select",
 *   options: [
 *     { value: 0, prompt: "Base" },
 *     { value: 1, prompt: "Support" }
 *   ]
 * };
 *
 * const options = getEnumOptions(property);
 * // Returns: [
 * //   { value: 0, label: "Base" },
 * //   { value: 1, label: "Support" }
 * // ]
 * ```
 */
export function getEnumOptions(
    property: HalTemplateProperty | undefined
): EnumOption[] {
    if (!property?.options || property.options.length === 0) {
        return [];
    }

    return property.options.map((opt) => ({
        value: opt.value,
        label: opt.prompt ?? String(opt.value),
    }));
}

/**
 * Check if a HAL template property represents an enum field.
 *
 * Determines whether a property has enum options (select, checkbox, radio)
 * based on the presence of an options array.
 *
 * @param property - HAL template property to check
 * @returns True if property has enum options
 *
 * @example
 * ```typescript
 * const selectProperty: HalTemplateProperty = {
 *   name: "role",
 *   type: "select",
 *   options: [{ value: 0, prompt: "Base" }]
 * };
 *
 * const textProperty: HalTemplateProperty = {
 *   name: "email",
 *   type: "text"
 * };
 *
 * isEnumProperty(selectProperty); // Returns: true
 * isEnumProperty(textProperty);   // Returns: false
 * ```
 */
export function isEnumProperty(
    property: HalTemplateProperty | undefined
): boolean {
    return !!property?.options && property.options.length > 0;
}

/**
 * Get enum label with type guard.
 *
 * Safely gets an enum label only if the property is confirmed to be an enum.
 * Returns undefined if not an enum property.
 *
 * @param value - The enum value to get a label for
 * @param property - HAL template property
 * @returns Display label or undefined
 *
 * @example
 * ```typescript
 * const label = getEnumLabelSafe(1, property);
 * if (label) {
 *   console.log("Enum label:", label);
 * } else {
 *   console.log("Not an enum property");
 * }
 * ```
 */
export function getEnumLabelSafe(
    value: any,
    property: HalTemplateProperty | undefined
): string | undefined {
    if (!isEnumProperty(property)) {
        return undefined;
    }
    return getEnumLabel(value, property);
}
