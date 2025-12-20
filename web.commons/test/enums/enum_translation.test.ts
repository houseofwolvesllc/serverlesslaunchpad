/**
 * Tests for enum translation utilities
 */

import { describe, it, expect } from "vitest";
import type { HalTemplateProperty } from "@houseofwolves/serverlesslaunchpad.types";
import {
    getEnumLabel,
    getEnumOptions,
    isEnumProperty,
    getEnumLabelSafe,
} from "../../src/enums/enum_translation";

describe("getEnumLabel", () => {
    const roleProperty: HalTemplateProperty = {
        name: "role",
        type: "select",
        options: [
            { value: 0, prompt: "Base" },
            { value: 1, prompt: "Support" },
            { value: 2, prompt: "Account Manager" },
            { value: 3, prompt: "Admin" },
        ],
    };

    it("should return label from property options", () => {
        expect(getEnumLabel(0, roleProperty)).toBe("Base");
        expect(getEnumLabel(1, roleProperty)).toBe("Support");
        expect(getEnumLabel(2, roleProperty)).toBe("Account Manager");
        expect(getEnumLabel(3, roleProperty)).toBe("Admin");
    });

    it("should return string value if not found in options", () => {
        expect(getEnumLabel(99, roleProperty)).toBe("99");
    });

    it("should return custom fallback if value not found", () => {
        expect(getEnumLabel(99, roleProperty, "Unknown")).toBe("Unknown");
    });

    it("should handle property with no options", () => {
        const noOptionsProperty: HalTemplateProperty = {
            name: "test",
            type: "text",
        };

        expect(getEnumLabel(1, noOptionsProperty)).toBe("1");
        expect(getEnumLabel(1, noOptionsProperty, "Default")).toBe("Default");
    });

    it("should handle undefined property", () => {
        expect(getEnumLabel(1, undefined)).toBe("1");
        expect(getEnumLabel(1, undefined, "Fallback")).toBe("Fallback");
    });

    it("should handle empty options array", () => {
        const emptyProperty: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [],
        };

        expect(getEnumLabel(1, emptyProperty)).toBe("1");
    });

    it("should handle string values", () => {
        const statusProperty: HalTemplateProperty = {
            name: "status",
            type: "select",
            options: [
                { value: "active", prompt: "Active" },
                { value: "inactive", prompt: "Inactive" },
            ],
        };

        expect(getEnumLabel("active", statusProperty)).toBe("Active");
        expect(getEnumLabel("pending", statusProperty)).toBe("pending");
    });

    it("should handle null and undefined values", () => {
        expect(getEnumLabel(null, roleProperty)).toBe("null");
        expect(getEnumLabel(undefined, roleProperty)).toBe("undefined");
    });

    it("should handle options without prompt", () => {
        const property: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [
                { value: 1 }, // No prompt
                { value: 2, prompt: "Two" },
            ],
        };

        expect(getEnumLabel(1, property)).toBe("1"); // Falls back to value
        expect(getEnumLabel(2, property)).toBe("Two");
    });
});

describe("getEnumOptions", () => {
    const roleProperty: HalTemplateProperty = {
        name: "role",
        type: "select",
        options: [
            { value: 0, prompt: "Base" },
            { value: 1, prompt: "Support" },
        ],
    };

    it("should convert HAL options to EnumOption format", () => {
        const options = getEnumOptions(roleProperty);

        expect(options).toHaveLength(2);
        expect(options[0]).toEqual({ value: 0, label: "Base" });
        expect(options[1]).toEqual({ value: 1, label: "Support" });
    });

    it("should return empty array for property with no options", () => {
        const noOptionsProperty: HalTemplateProperty = {
            name: "test",
            type: "text",
        };

        expect(getEnumOptions(noOptionsProperty)).toEqual([]);
    });

    it("should return empty array for undefined property", () => {
        expect(getEnumOptions(undefined)).toEqual([]);
    });

    it("should return empty array for empty options", () => {
        const emptyProperty: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [],
        };

        expect(getEnumOptions(emptyProperty)).toEqual([]);
    });

    it("should handle options without prompt", () => {
        const property: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [
                { value: 1 },
                { value: 2, prompt: "Two" },
            ],
        };

        const options = getEnumOptions(property);
        expect(options[0]).toEqual({ value: 1, label: "1" });
        expect(options[1]).toEqual({ value: 2, label: "Two" });
    });

    it("should preserve value types", () => {
        const property: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [
                { value: 1, prompt: "One" },
                { value: "two", prompt: "Two" },
                { value: true, prompt: "True" },
            ],
        };

        const options = getEnumOptions(property);
        expect(options[0].value).toBe(1);
        expect(options[1].value).toBe("two");
        expect(options[2].value).toBe(true);
    });
});

describe("isEnumProperty", () => {
    it("should return true for property with options", () => {
        const enumProperty: HalTemplateProperty = {
            name: "role",
            type: "select",
            options: [{ value: 0, prompt: "Base" }],
        };

        expect(isEnumProperty(enumProperty)).toBe(true);
    });

    it("should return false for property without options", () => {
        const textProperty: HalTemplateProperty = {
            name: "email",
            type: "text",
        };

        expect(isEnumProperty(textProperty)).toBe(false);
    });

    it("should return false for property with empty options", () => {
        const emptyProperty: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [],
        };

        expect(isEnumProperty(emptyProperty)).toBe(false);
    });

    it("should return false for undefined property", () => {
        expect(isEnumProperty(undefined)).toBe(false);
    });

    it("should work with checkbox type", () => {
        const checkboxProperty: HalTemplateProperty = {
            name: "features",
            type: "checkbox",
            options: [
                { value: "contacts", prompt: "Contacts" },
                { value: "campaigns", prompt: "Campaigns" },
            ],
        };

        expect(isEnumProperty(checkboxProperty)).toBe(true);
    });
});

describe("getEnumLabelSafe", () => {
    const roleProperty: HalTemplateProperty = {
        name: "role",
        type: "select",
        options: [
            { value: 0, prompt: "Base" },
            { value: 1, prompt: "Support" },
        ],
    };

    it("should return label for enum property", () => {
        expect(getEnumLabelSafe(0, roleProperty)).toBe("Base");
        expect(getEnumLabelSafe(1, roleProperty)).toBe("Support");
    });

    it("should return undefined for non-enum property", () => {
        const textProperty: HalTemplateProperty = {
            name: "email",
            type: "text",
        };

        expect(getEnumLabelSafe(1, textProperty)).toBeUndefined();
    });

    it("should return undefined for undefined property", () => {
        expect(getEnumLabelSafe(1, undefined)).toBeUndefined();
    });

    it("should return label even if value not found in enum", () => {
        expect(getEnumLabelSafe(99, roleProperty)).toBe("99");
    });

    it("should return undefined for property with empty options", () => {
        const emptyProperty: HalTemplateProperty = {
            name: "test",
            type: "select",
            options: [],
        };

        expect(getEnumLabelSafe(1, emptyProperty)).toBeUndefined();
    });
});

describe("integration scenarios", () => {
    it("should handle complete enum workflow", () => {
        const property: HalTemplateProperty = {
            name: "role",
            type: "select",
            required: true,
            options: [
                { value: 0, prompt: "Base" },
                { value: 1, prompt: "Support" },
                { value: 2, prompt: "Account Manager" },
            ],
        };

        // Check if it's an enum
        expect(isEnumProperty(property)).toBe(true);

        // Get all options
        const options = getEnumOptions(property);
        expect(options).toHaveLength(3);

        // Get label for specific value
        expect(getEnumLabel(1, property)).toBe("Support");

        // Safe label retrieval
        const label = getEnumLabelSafe(2, property);
        expect(label).toBe("Account Manager");
    });

    it("should handle non-enum property gracefully", () => {
        const property: HalTemplateProperty = {
            name: "email",
            type: "email",
            required: true,
        };

        expect(isEnumProperty(property)).toBe(false);
        expect(getEnumOptions(property)).toEqual([]);
        expect(getEnumLabelSafe(1, property)).toBeUndefined();
    });
});
