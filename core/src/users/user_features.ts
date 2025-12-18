import type { BitfieldMetadata } from "@houseofwolves/serverlesslaunchpad.types";

/**
 * User feature flags enumeration
 *
 * Bitfield enum for enabling/disabling specific features per user.
 * Multiple features can be combined using bitwise OR.
 */
export enum Features {
    None = 0,
    FeatureA = 1 << 0, // 1 - Feature A
    FeatureB = 1 << 1, // 2 - Feature B
    FeatureC = 1 << 2, // 4 - Feature C
    FeatureD = 1 << 3, // 8 - Feature D
}

/**
 * Bitfield metadata for Features field
 *
 * Defines human-readable labels for each feature flag.
 * Used by API layer to convert bitfield integers to/from human-readable arrays.
 * Used by web clients for rendering feature toggles/checkboxes.
 */
export const FEATURES_METADATA: BitfieldMetadata = {
    name: "features",
    isBitfield: true,
    none: Features.None,
    options: [
        { value: Features.None, label: "None", description: "No features enabled" },
        {
            value: Features.FeatureA,
            label: "Feature A",
            description: "Enables the user to interact with Feature A",
        },
        { value: Features.FeatureB, label: "Feature B", description: "Enables the user to interact with Feature B" },
        {
            value: Features.FeatureC,
            label: "Feature C",
            description: "Enables the user to interact with Feature C",
        },
        {
            value: Features.FeatureD,
            label: "Feature D",
            description: "Enables the user to interact with Feature D",
        },
    ],
};
