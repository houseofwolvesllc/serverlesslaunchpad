/**
 * Tests for enum adapter helpers
 */

import { describe, it, expect } from "vitest";
import type {
    EnumMetadata,
    BitfieldMetadata,
} from "@houseofwolves/serverlesslaunchpad.types/enums";
import {
    createEnumOptions,
    createEnumProperty,
    createBitfieldProperty,
    bitfieldToArray,
    arrayToBitfield,
} from "../../src/content_types/enum_adapter_helpers";

// Test fixtures matching the Role enum from core/users
const ROLE_METADATA: EnumMetadata = {
    name: "role",
    options: [
        { value: 0, label: "Base" },
        { value: 1, label: "Support" },
        { value: 2, label: "Account Manager" },
        { value: 3, label: "Admin" },
    ],
};

// Test fixtures matching the Features enum from core/users
const FEATURES_METADATA: BitfieldMetadata = {
    name: "features",
    isBitfield: true,
    none: 0,
    options: [
        { value: 1, label: "Contact Management", description: "Manage contacts" }, // 1 << 0
        { value: 2, label: "Campaign Builder", description: "Build campaigns" }, // 1 << 1
        { value: 4, label: "Link Tracking", description: "Track links" }, // 1 << 2
        { value: 8, label: "App Integrations", description: "Integrate apps" }, // 1 << 3
    ],
};

describe("createEnumOptions", () => {
    it("should create options from simple enum metadata", () => {
        const options = createEnumOptions(ROLE_METADATA);

        expect(options).toHaveLength(4);
        expect(options[0]).toEqual({ value: 0, prompt: "Base" });
        expect(options[1]).toEqual({ value: 1, prompt: "Support" });
        expect(options[2]).toEqual({ value: 2, prompt: "Account Manager" });
        expect(options[3]).toEqual({ value: 3, prompt: "Admin" });
    });

    it("should create options from bitfield metadata", () => {
        const options = createEnumOptions(FEATURES_METADATA);

        expect(options).toHaveLength(4);
        expect(options[0]).toEqual({ value: 1, prompt: "Contact Management" });
        expect(options[1]).toEqual({ value: 2, prompt: "Campaign Builder" });
        expect(options[2]).toEqual({ value: 4, prompt: "Link Tracking" });
        expect(options[3]).toEqual({ value: 8, prompt: "App Integrations" });
    });

    it("should handle empty options array", () => {
        const emptyMetadata: EnumMetadata = {
            name: "empty",
            options: [],
        };

        const options = createEnumOptions(emptyMetadata);
        expect(options).toEqual([]);
    });

    it("should preserve value types (number and string)", () => {
        const mixedMetadata: EnumMetadata = {
            name: "mixed",
            options: [
                { value: 1, label: "One" },
                { value: "two", label: "Two" },
                { value: 3, label: "Three" },
            ],
        };

        const options = createEnumOptions(mixedMetadata);
        expect(options[0].value).toBe(1);
        expect(options[1].value).toBe("two");
        expect(options[2].value).toBe(3);
    });
});

describe("createEnumProperty", () => {
    it("should create select property with options", () => {
        const property = createEnumProperty("role", ROLE_METADATA);

        expect(property.name).toBe("role");
        expect(property.type).toBe("select");
        expect(property.required).toBe(false);
        expect(property.options).toHaveLength(4);
        expect(property.options![0]).toEqual({ value: 0, prompt: "Base" });
    });

    it("should include value if provided", () => {
        const property = createEnumProperty("role", ROLE_METADATA, {
            value: 2,
        });

        expect(property.value).toBe(2);
    });

    it("should mark as required if specified", () => {
        const property = createEnumProperty("role", ROLE_METADATA, {
            required: true,
        });

        expect(property.required).toBe(true);
    });

    it("should include custom prompt if provided", () => {
        const property = createEnumProperty("role", ROLE_METADATA, {
            prompt: "User Role",
        });

        expect(property.prompt).toBe("User Role");
    });

    it("should include description if provided", () => {
        const property = createEnumProperty("role", ROLE_METADATA, {
            description: "Select the user's role",
        });

        expect(property.description).toBe("Select the user's role");
    });

    it("should omit description if not provided", () => {
        const property = createEnumProperty("role", ROLE_METADATA);

        expect(property.description).toBeUndefined();
    });

    it("should handle all options together", () => {
        const property = createEnumProperty("role", ROLE_METADATA, {
            prompt: "User Role",
            required: true,
            value: 1,
            description: "Choose role",
        });

        expect(property.name).toBe("role");
        expect(property.type).toBe("select");
        expect(property.prompt).toBe("User Role");
        expect(property.required).toBe(true);
        expect(property.value).toBe(1);
        expect(property.description).toBe("Choose role");
        expect(property.options).toHaveLength(4);
    });
});

describe("createBitfieldProperty", () => {
    it("should create checkbox property with string options", () => {
        const property = createBitfieldProperty(
            "enabled_features",
            FEATURES_METADATA
        );

        expect(property.name).toBe("enabled_features");
        expect(property.type).toBe("checkbox");
        expect(property.required).toBe(false);
        expect(property.options).toHaveLength(4);
        // Options should use string keys, not numeric values
        expect(property.options![0]).toEqual({
            value: "contact",
            prompt: "Contact Management",
        });
    });

    it("should convert bitfield value to array", () => {
        // Features = Contacts (1) | Links (4) = 5
        const property = createBitfieldProperty(
            "enabled_features",
            FEATURES_METADATA,
            { value: 5 }
        );

        expect(property.value).toEqual(["contact", "link"]);
    });

    it("should handle zero value (no flags set)", () => {
        const property = createBitfieldProperty(
            "enabled_features",
            FEATURES_METADATA,
            { value: 0 }
        );

        expect(property.value).toEqual([]);
    });

    it("should handle all flags set", () => {
        // All features: 1 | 2 | 4 | 8 = 15
        const property = createBitfieldProperty(
            "enabled_features",
            FEATURES_METADATA,
            { value: 15 }
        );

        expect(property.value).toHaveLength(4);
        expect(property.value).toContain("contact");
        expect(property.value).toContain("campaign");
        expect(property.value).toContain("link");
        expect(property.value).toContain("app");
    });

    it("should include custom prompt if provided", () => {
        const property = createBitfieldProperty(
            "enabled_features",
            FEATURES_METADATA,
            { prompt: "Features" }
        );

        expect(property.prompt).toBe("Features");
    });

    it("should handle undefined value", () => {
        const property = createBitfieldProperty(
            "enabled_features",
            FEATURES_METADATA
        );

        expect(property.value).toBeUndefined();
    });
});

describe("bitfieldToArray", () => {
    it("should convert bitfield 5 to ['contact', 'link']", () => {
        // 5 = 0101 binary = Contacts (1) | Links (4)
        const result = bitfieldToArray(5, FEATURES_METADATA);

        expect(result).toHaveLength(2);
        expect(result).toContain("contact");
        expect(result).toContain("link");
    });

    it("should return empty array for 0", () => {
        const result = bitfieldToArray(0, FEATURES_METADATA);
        expect(result).toEqual([]);
    });

    it("should handle all flags set", () => {
        // 15 = 1111 binary = all flags
        const result = bitfieldToArray(15, FEATURES_METADATA);

        expect(result).toHaveLength(4);
        expect(result).toContain("contact");
        expect(result).toContain("campaign");
        expect(result).toContain("link");
        expect(result).toContain("app");
    });

    it("should handle single flag", () => {
        const result = bitfieldToArray(2, FEATURES_METADATA);

        expect(result).toEqual(["campaign"]);
    });

    it("should handle non-contiguous flags", () => {
        // 10 = 1010 binary = Campaigns (2) | Apps (8)
        const result = bitfieldToArray(10, FEATURES_METADATA);

        expect(result).toHaveLength(2);
        expect(result).toContain("campaign");
        expect(result).toContain("app");
    });

    it("should ignore bits not in metadata", () => {
        // 16 is not a defined flag (1 << 4)
        const result = bitfieldToArray(17, FEATURES_METADATA); // 17 = 16 + 1

        // Should only include Contacts (1), not the undefined bit
        expect(result).toHaveLength(1);
        expect(result).toContain("contact");
    });
});

describe("arrayToBitfield", () => {
    it("should convert ['contact', 'link'] to 5", () => {
        const result = arrayToBitfield(["contact", "link"], FEATURES_METADATA);
        expect(result).toBe(5); // 1 | 4
    });

    it("should return 0 for empty array", () => {
        const result = arrayToBitfield([], FEATURES_METADATA);
        expect(result).toBe(0);
    });

    it("should handle all flags", () => {
        const result = arrayToBitfield(
            ["contact", "campaign", "link", "app"],
            FEATURES_METADATA
        );
        expect(result).toBe(15); // 1 | 2 | 4 | 8
    });

    it("should handle single flag", () => {
        const result = arrayToBitfield(["campaign"], FEATURES_METADATA);
        expect(result).toBe(2);
    });

    it("should be case-insensitive", () => {
        const result = arrayToBitfield(
            ["CONTACT", "Link"],
            FEATURES_METADATA
        );
        expect(result).toBe(5); // 1 | 4
    });

    it("should ignore unknown keys", () => {
        const result = arrayToBitfield(
            ["contact", "unknown", "link"],
            FEATURES_METADATA
        );
        expect(result).toBe(5); // Only 1 | 4, ignore "unknown"
    });

    it("should handle duplicate keys", () => {
        const result = arrayToBitfield(
            ["contact", "contact", "link"],
            FEATURES_METADATA
        );
        expect(result).toBe(5); // 1 | 4, duplicates don't affect bitwise OR
    });
});

describe("bitfield round-trip conversions", () => {
    it("should convert bitfield -> array -> bitfield", () => {
        const original = 7; // Contacts | Campaigns | Links
        const array = bitfieldToArray(original, FEATURES_METADATA);
        const converted = arrayToBitfield(array, FEATURES_METADATA);

        expect(converted).toBe(original);
    });

    it("should handle all possible combinations", () => {
        for (let i = 0; i <= 15; i++) {
            const array = bitfieldToArray(i, FEATURES_METADATA);
            const converted = arrayToBitfield(array, FEATURES_METADATA);
            expect(converted).toBe(i);
        }
    });
});

describe("edge cases", () => {
    it("should handle metadata with custom none value", () => {
        const customMetadata: BitfieldMetadata = {
            ...FEATURES_METADATA,
            none: -1,
        };

        const result = arrayToBitfield([], customMetadata);
        expect(result).toBe(-1);
    });

    it("should handle metadata without none value", () => {
        const { none, ...metadataWithoutNone } = FEATURES_METADATA;
        const result = arrayToBitfield(
            [],
            metadataWithoutNone as BitfieldMetadata
        );
        expect(result).toBe(0); // Should default to 0
    });
});
