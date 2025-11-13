/**
 * Tests for bitflag utilities
 */

import { describe, it, expect } from "vitest";
import type { EnumOption } from "@houseofwolves/serverlesslaunchpad.types/enums";
import {
    parseBitfield,
    hasBitflag,
    formatBitfield,
    countBitflags,
    toggleBitflag,
    setBitflag,
    unsetBitflag,
} from "../../src/enums/bitflag_utils";

// Test fixtures matching Features enum
const FEATURE_OPTIONS: EnumOption[] = [
    { value: 1, label: "Contact Management" }, // 1 << 0
    { value: 2, label: "Campaign Builder" }, // 1 << 1
    { value: 4, label: "Link Tracking" }, // 1 << 2
    { value: 8, label: "App Integrations" }, // 1 << 3
];

describe("parseBitfield", () => {
    it("should parse bitfield 5 to ['Contact Management', 'Link Tracking']", () => {
        const result = parseBitfield(5, FEATURE_OPTIONS);

        expect(result).toHaveLength(2);
        expect(result).toContain("Contact Management");
        expect(result).toContain("Link Tracking");
    });

    it("should return empty array for 0", () => {
        const result = parseBitfield(0, FEATURE_OPTIONS);
        expect(result).toEqual([]);
    });

    it("should return empty array for null", () => {
        const result = parseBitfield(null, FEATURE_OPTIONS);
        expect(result).toEqual([]);
    });

    it("should return empty array for undefined", () => {
        const result = parseBitfield(undefined, FEATURE_OPTIONS);
        expect(result).toEqual([]);
    });

    it("should handle all flags set", () => {
        const result = parseBitfield(15, FEATURE_OPTIONS); // 1 | 2 | 4 | 8

        expect(result).toHaveLength(4);
        expect(result).toContain("Contact Management");
        expect(result).toContain("Campaign Builder");
        expect(result).toContain("Link Tracking");
        expect(result).toContain("App Integrations");
    });

    it("should handle single flag", () => {
        expect(parseBitfield(1, FEATURE_OPTIONS)).toEqual([
            "Contact Management",
        ]);
        expect(parseBitfield(2, FEATURE_OPTIONS)).toEqual(["Campaign Builder"]);
        expect(parseBitfield(4, FEATURE_OPTIONS)).toEqual(["Link Tracking"]);
        expect(parseBitfield(8, FEATURE_OPTIONS)).toEqual(["App Integrations"]);
    });

    it("should handle non-contiguous flags", () => {
        const result = parseBitfield(10, FEATURE_OPTIONS); // 2 | 8

        expect(result).toHaveLength(2);
        expect(result).toContain("Campaign Builder");
        expect(result).toContain("App Integrations");
    });

    it("should ignore bits not in options", () => {
        const result = parseBitfield(16, FEATURE_OPTIONS); // Not a defined flag

        expect(result).toEqual([]);
    });

    it("should handle combination with undefined flags", () => {
        const result = parseBitfield(17, FEATURE_OPTIONS); // 16 + 1

        expect(result).toHaveLength(1);
        expect(result).toContain("Contact Management");
    });
});

describe("hasBitflag", () => {
    it("should return true when flag is set", () => {
        expect(hasBitflag(5, 1)).toBe(true); // Has Contacts
        expect(hasBitflag(5, 4)).toBe(true); // Has Links
    });

    it("should return false when flag is not set", () => {
        expect(hasBitflag(5, 2)).toBe(false); // Doesn't have Campaigns
        expect(hasBitflag(5, 8)).toBe(false); // Doesn't have Apps
    });

    it("should return false for zero value", () => {
        expect(hasBitflag(0, 1)).toBe(false);
    });

    it("should return false for null value", () => {
        expect(hasBitflag(null, 1)).toBe(false);
    });

    it("should return false for undefined value", () => {
        expect(hasBitflag(undefined, 1)).toBe(false);
    });

    it("should return false for zero flag", () => {
        expect(hasBitflag(5, 0)).toBe(false);
    });

    it("should handle all flags set", () => {
        expect(hasBitflag(15, 1)).toBe(true);
        expect(hasBitflag(15, 2)).toBe(true);
        expect(hasBitflag(15, 4)).toBe(true);
        expect(hasBitflag(15, 8)).toBe(true);
    });

    it("should handle combination flags", () => {
        const value = 5; // Contacts + Links
        expect(hasBitflag(value, 1)).toBe(true);
        expect(hasBitflag(value, 4)).toBe(true);
        expect(hasBitflag(value, 5)).toBe(true); // Has the combination
    });
});

describe("formatBitfield", () => {
    it("should format bitfield as comma-separated string", () => {
        const result = formatBitfield(5, FEATURE_OPTIONS);

        expect(result).toBe("Contact Management, Link Tracking");
    });

    it("should return 'None' for zero value", () => {
        expect(formatBitfield(0, FEATURE_OPTIONS)).toBe("None");
    });

    it("should return 'None' for null", () => {
        expect(formatBitfield(null, FEATURE_OPTIONS)).toBe("None");
    });

    it("should return 'None' for undefined", () => {
        expect(formatBitfield(undefined, FEATURE_OPTIONS)).toBe("None");
    });

    it("should handle custom separator", () => {
        const result = formatBitfield(5, FEATURE_OPTIONS, " | ");

        expect(result).toBe("Contact Management | Link Tracking");
    });

    it("should handle all flags", () => {
        const result = formatBitfield(15, FEATURE_OPTIONS);

        expect(result).toContain("Contact Management");
        expect(result).toContain("Campaign Builder");
        expect(result).toContain("Link Tracking");
        expect(result).toContain("App Integrations");
    });

    it("should handle single flag", () => {
        expect(formatBitfield(1, FEATURE_OPTIONS)).toBe("Contact Management");
    });

    it("should use newline as separator", () => {
        const result = formatBitfield(5, FEATURE_OPTIONS, "\n");

        expect(result).toBe("Contact Management\nLink Tracking");
    });
});

describe("countBitflags", () => {
    it("should count number of enabled flags", () => {
        expect(countBitflags(5, FEATURE_OPTIONS)).toBe(2); // Contacts + Links
        expect(countBitflags(7, FEATURE_OPTIONS)).toBe(3); // Contacts + Campaigns + Links
        expect(countBitflags(15, FEATURE_OPTIONS)).toBe(4); // All flags
    });

    it("should return 0 for zero value", () => {
        expect(countBitflags(0, FEATURE_OPTIONS)).toBe(0);
    });

    it("should return 0 for null", () => {
        expect(countBitflags(null, FEATURE_OPTIONS)).toBe(0);
    });

    it("should return 0 for undefined", () => {
        expect(countBitflags(undefined, FEATURE_OPTIONS)).toBe(0);
    });

    it("should count single flag", () => {
        expect(countBitflags(1, FEATURE_OPTIONS)).toBe(1);
        expect(countBitflags(2, FEATURE_OPTIONS)).toBe(1);
    });
});

describe("toggleBitflag", () => {
    it("should set flag when not present", () => {
        const value = 1; // Only Contacts
        const result = toggleBitflag(value, 2); // Add Campaigns

        expect(result).toBe(3); // 1 | 2
        expect(hasBitflag(result, 1)).toBe(true);
        expect(hasBitflag(result, 2)).toBe(true);
    });

    it("should unset flag when present", () => {
        const value = 5; // Contacts + Links
        const result = toggleBitflag(value, 1); // Remove Contacts

        expect(result).toBe(4); // Only Links
        expect(hasBitflag(result, 1)).toBe(false);
        expect(hasBitflag(result, 4)).toBe(true);
    });

    it("should handle null value", () => {
        const result = toggleBitflag(null, 1);
        expect(result).toBe(1);
    });

    it("should handle undefined value", () => {
        const result = toggleBitflag(undefined, 1);
        expect(result).toBe(1);
    });

    it("should toggle multiple times", () => {
        let value = 0;
        value = toggleBitflag(value, 1); // Set
        expect(value).toBe(1);
        value = toggleBitflag(value, 1); // Unset
        expect(value).toBe(0);
        value = toggleBitflag(value, 1); // Set again
        expect(value).toBe(1);
    });
});

describe("setBitflag", () => {
    it("should set flag when not present", () => {
        const value = 1; // Only Contacts
        const result = setBitflag(value, 2); // Add Campaigns

        expect(result).toBe(3); // 1 | 2
    });

    it("should keep flag when already present", () => {
        const value = 5; // Contacts + Links
        const result = setBitflag(value, 1); // Contacts already set

        expect(result).toBe(5); // No change
    });

    it("should handle null value", () => {
        const result = setBitflag(null, 1);
        expect(result).toBe(1);
    });

    it("should handle undefined value", () => {
        const result = setBitflag(undefined, 1);
        expect(result).toBe(1);
    });

    it("should set multiple flags", () => {
        let value = 0;
        value = setBitflag(value, 1);
        value = setBitflag(value, 2);
        value = setBitflag(value, 4);

        expect(value).toBe(7); // 1 | 2 | 4
    });
});

describe("unsetBitflag", () => {
    it("should unset flag when present", () => {
        const value = 5; // Contacts + Links
        const result = unsetBitflag(value, 1); // Remove Contacts

        expect(result).toBe(4); // Only Links
    });

    it("should keep value when flag not present", () => {
        const value = 5; // Contacts + Links
        const result = unsetBitflag(value, 2); // Campaigns not set

        expect(result).toBe(5); // No change
    });

    it("should handle null value", () => {
        const result = unsetBitflag(null, 1);
        expect(result).toBe(0);
    });

    it("should handle undefined value", () => {
        const result = unsetBitflag(undefined, 1);
        expect(result).toBe(0);
    });

    it("should unset multiple flags", () => {
        let value = 15; // All flags
        value = unsetBitflag(value, 1);
        value = unsetBitflag(value, 4);

        expect(value).toBe(10); // 2 | 8
    });

    it("should handle unsetting to zero", () => {
        let value = 1; // Only Contacts
        value = unsetBitflag(value, 1);

        expect(value).toBe(0);
    });
});

describe("bitfield manipulation workflows", () => {
    it("should support complete toggle workflow", () => {
        let features = 0; // Start with nothing

        // Enable Contacts
        features = toggleBitflag(features, 1);
        expect(hasBitflag(features, 1)).toBe(true);
        expect(countBitflags(features, FEATURE_OPTIONS)).toBe(1);

        // Enable Links
        features = toggleBitflag(features, 4);
        expect(hasBitflag(features, 4)).toBe(true);
        expect(countBitflags(features, FEATURE_OPTIONS)).toBe(2);

        // Disable Contacts
        features = toggleBitflag(features, 1);
        expect(hasBitflag(features, 1)).toBe(false);
        expect(countBitflags(features, FEATURE_OPTIONS)).toBe(1);

        // Final value should be 4 (only Links)
        expect(features).toBe(4);
    });

    it("should support explicit set/unset workflow", () => {
        let features = 0;

        // Set multiple flags
        features = setBitflag(features, 1);
        features = setBitflag(features, 2);
        features = setBitflag(features, 8);

        expect(features).toBe(11); // 1 | 2 | 8

        // Unset one flag
        features = unsetBitflag(features, 2);
        expect(features).toBe(9); // 1 | 8

        // Setting already-set flag doesn't change value
        features = setBitflag(features, 1);
        expect(features).toBe(9);
    });

    it("should support display workflow", () => {
        const features = 7; // Contacts | Campaigns | Links

        // Parse to array
        const enabled = parseBitfield(features, FEATURE_OPTIONS);
        expect(enabled).toHaveLength(3);

        // Format for display
        const formatted = formatBitfield(features, FEATURE_OPTIONS);
        expect(formatted).toContain("Contact Management");
        expect(formatted).toContain("Campaign Builder");
        expect(formatted).toContain("Link Tracking");

        // Count enabled features
        const count = countBitflags(features, FEATURE_OPTIONS);
        expect(count).toBe(3);
    });
});
