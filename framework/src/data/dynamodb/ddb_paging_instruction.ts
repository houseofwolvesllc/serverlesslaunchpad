import type { PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";

/**
 * DynamoDB-specific paging instruction using LastEvaluatedKey
 * for efficient cursor-based pagination
 */
export interface DdbPagingInstruction extends PagingInstruction {
    /**
     * DynamoDB's LastEvaluatedKey from previous query
     * Used as ExclusiveStartKey for next page
     * null = page 1 (no cursor)
     */
    lastEvaluatedKey?: Record<string, any> | null;

    /**
     * LastEvaluatedKey from the page before the current one
     * Used to construct the previous navigation instruction
     * null = page 1 is the previous page
     */
    previousLastEvaluatedKey?: Record<string, any> | null;

    /**
     * Sort direction for queries
     * true = ascending (oldest first)
     * false = descending (newest first, default for ULID sort keys)
     */
    scanIndexForward?: boolean;
}
