import { ALBEvent } from "aws-lambda";

/**
 * Standard hypermedia response structure
 */
export interface HypermediaResponse {
    statusCode: number;
    headers?: Record<string, string>;
    body?: string;
    // Allow additional properties for controller responses
    [key: string]: any;
}

/**
 * Controller method signature
 */
export type ControllerMethod = (event: ALBEvent) => Promise<HypermediaResponse>;