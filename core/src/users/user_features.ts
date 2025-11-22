import type { BitfieldMetadata } from "@houseofwolves/serverlesslaunchpad.types";

/**
 * User feature flags enumeration
 *
 * Bitfield enum for enabling/disabling specific features per user.
 * Multiple features can be combined using bitwise OR.
 */
export enum Features {
    None = 0,
    Contacts = 1 << 0,  // 1 - Contact Management
    Campaigns = 1 << 1, // 2 - Campaign Builder
    Links = 1 << 2,     // 4 - Link Tracking
    Apps = 1 << 3,      // 8 - App Integrations
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
        { value: Features.Contacts, label: "Contact Management", description: "Manage customer contacts and profiles" },
        { value: Features.Campaigns, label: "Campaign Builder", description: "Create and manage marketing campaigns" },
        { value: Features.Links, label: "Link Tracking", description: "Track and analyze link performance" },
        { value: Features.Apps, label: "App Integrations", description: "Connect with third-party applications" },
    ],
};
