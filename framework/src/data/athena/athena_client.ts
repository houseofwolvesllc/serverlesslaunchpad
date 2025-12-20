import {
    AthenaClient as AwsAthenaClient,
    GetQueryExecutionCommand,
    GetQueryResultsCommand,
    StartQueryExecutionCommand,
    QueryExecutionState,
} from "@aws-sdk/client-athena";

export interface AthenaClientConfig {
    databaseName: string;
    workGroup?: string;
    resultLocation?: string;
    maxRetries?: number;
    pollingIntervalMs?: number;
}

export interface SqlParameter {
    name: string;
    value: string | number | boolean | null;
}

export class AthenaClient {
    protected readonly client: AwsAthenaClient;
    protected readonly config: AthenaClientConfig;

    constructor(client: AwsAthenaClient, config: AthenaClientConfig) {
        this.client = client;
        this.config = {
            workGroup: "primary",
            maxRetries: 10,
            pollingIntervalMs: 1000,
            ...config,
        };
    }

    /**
     * Execute a query and return processed results
     */
    async query<T = Record<string, any>>(
        sql: string,
        params: SqlParameter[] = [],
        mapper?: (row: Record<string, any>) => T
    ): Promise<T[]> {
        const processedSql = this.prepareSql(sql, params);
        const queryExecutionId = await this.startQuery(processedSql);
        const rawResults = await this.waitForQueryResults(queryExecutionId);

        if (!mapper) {
            return rawResults as T[];
        }

        return rawResults.map(mapper);
    }

    /**
     * Prepare SQL with parameters to prevent SQL injection
     */
    prepareSql(sql: string, params: SqlParameter[] = []): string {
        let processedSql = sql;

        for (const param of params) {
            const placeholderRegex = new RegExp(`:${param.name}\\b`, "g");
            const replacement = this.formatParameterValue(param.value);
            processedSql = processedSql.replace(placeholderRegex, replacement);
        }

        return processedSql;
    }

    /**
     * Format a parameter value based on its type
     */
    private formatParameterValue(value: string | number | boolean | null): string {
        if (value === null) {
            return "NULL";
        }

        if (typeof value === "string") {
            return `'${this.escapeString(value)}'`;
        }

        if (typeof value === "boolean") {
            return value ? "TRUE" : "FALSE";
        }

        return String(value);
    }

    /**
     * Start a query execution and return the execution ID
     */
    async startQuery(sql: string): Promise<string> {
        const params = {
            QueryString: sql,
            QueryExecutionContext: {
                Database: this.config.databaseName,
            },
            WorkGroup: this.config.workGroup,
            ResultConfiguration: this.config.resultLocation
                ? {
                      OutputLocation: this.config.resultLocation,
                  }
                : undefined,
        };

        const command = new StartQueryExecutionCommand(params);
        const response = await this.client.send(command);

        if (!response.QueryExecutionId) {
            throw new Error("Failed to start Athena query");
        }

        return response.QueryExecutionId;
    }

    /**
     * Wait for query completion and fetch results
     */
    async waitForQueryResults(queryExecutionId: string): Promise<Record<string, any>[]> {
        let queryStatus: QueryExecutionState | string = QueryExecutionState.RUNNING;
        let retries = 0;

        while (
            (queryStatus === QueryExecutionState.RUNNING || queryStatus === QueryExecutionState.QUEUED) &&
            retries < this.config.maxRetries!
        ) {
            await new Promise((resolve) => setTimeout(resolve, this.config.pollingIntervalMs));
            retries++;

            const executionCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
            const executionResponse = await this.client.send(executionCommand);

            queryStatus = executionResponse.QueryExecution?.Status?.State || QueryExecutionState.FAILED;

            if (queryStatus === QueryExecutionState.FAILED) {
                throw new Error(`Query failed: ${executionResponse.QueryExecution?.Status?.StateChangeReason}`);
            }

            if (queryStatus === QueryExecutionState.CANCELLED) {
                throw new Error("Query was cancelled");
            }
        }

        if (retries >= this.config.maxRetries!) {
            throw new Error(`Query timed out after ${retries} retries`);
        }

        const resultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
        const resultsResponse = await this.client.send(resultsCommand);

        return this.processQueryResults(resultsResponse);
    }

    /**
     * Process raw query results into usable objects
     */
    private processQueryResults(resultsResponse: any): Record<string, any>[] {
        if (!resultsResponse.ResultSet?.Rows || resultsResponse.ResultSet.Rows.length <= 1) {
            return [];
        }

        const columnInfo = resultsResponse.ResultSet.ResultSetMetadata?.ColumnInfo || [];
        const dataRows = resultsResponse.ResultSet.Rows.slice(1); // Skip header row

        return dataRows.map((row) => {
            const data: Record<string, any> = {};

            row.Data?.forEach((cell, index) => {
                const columnName = columnInfo[index]?.Name || `column${index}`;
                data[columnName] = cell.VarCharValue || null;
            });

            return data;
        });
    }

    /**
     * Utility method to escape string values for SQL
     */
    escapeString(value: string): string {
        return value.replace(/'/g, "''");
    }

    /**
     * Create an SQL timestamp string from a Date
     */
    formatTimestamp(date: Date): string {
        return date.toISOString();
    }
}
