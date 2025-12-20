import { PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";

/**
 * DynamoDB-specific paging instruction using LastEvaluatedKey
 * for efficient cursor-based pagination
 */
export class DdbPagingInstruction extends PagingInstruction {
    /**
     * DynamoDB's LastEvaluatedKey from previous query
     * Used as ExclusiveStartKey for next page
     */
    lastEvaluatedKey?: Record<string, any>;

    /**
     * Sort direction for queries
     * true = ascending (oldest first)
     * false = descending (newest first, default for ULID sort keys)
     */
    scanIndexForward?: boolean;
}
