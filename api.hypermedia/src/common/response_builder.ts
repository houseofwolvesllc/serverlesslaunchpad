import type { ALBResult } from "aws-lambda";
import { ContentType, CONTENT_TYPES } from "./content_negotiation";
import { JsonAdapter } from "../content_types/json_adapter";
import { XhtmlAdapter } from "../content_types/xhtml_adapter";
import { HttpError } from "./errors";

/**
 * Response data interface for content adapters
 */
export interface ResponseData<T = unknown> {
    status?: number;
    data?: T;
    error?: {
        status: number;
        title: string;
        detail?: string;
        instance?: string;
        timestamp?: string;
        traceId?: string;
        violations?: Array<{ field: string; message: string }>;
    };
    links?: Array<{ rel: string[]; href: string; title?: string }>;
    actions?: Array<{
        name: string;
        title: string;
        method: string;
        href: string;
        type?: string;
        fields?: Array<{
            name: string;
            type: string;
            required?: boolean;
            value?: any;
        }>;
    }>;
    metadata?: {
        title?: string;
        description?: string;
        resourceType?: string;
        resourceUri?: string;
    };
}

/**
 * Response builder utilities for ALB responses
 */
export class ResponseBuilder {
    private static jsonAdapter = new JsonAdapter();
    private static xhtmlAdapter = new XhtmlAdapter();
    
    /**
     * Build a successful response in the requested content type
     */
    static success<T = unknown>(
        data: T,
        contentType: ContentType,
        options: {
            status?: number;
            headers?: Record<string, string>;
            links?: ResponseData["links"];
            actions?: ResponseData["actions"];
            metadata?: ResponseData["metadata"];
        } = {}
    ): ALBResult {
        const status = options.status || 200;
        const responseData: ResponseData = {
            status,
            data,
            links: options.links,
            actions: options.actions,
            metadata: options.metadata
        };
        
        const body = contentType === CONTENT_TYPES.JSON 
            ? this.jsonAdapter.format(responseData)
            : this.xhtmlAdapter.format(responseData);
        
        return {
            statusCode: status,
            headers: {
                "Content-Type": contentType,
                ...options.headers
            },
            body
        };
    }
    
    /**
     * Build an error response in the requested content type
     */
    static error(
        error: HttpError | Error,
        contentType: ContentType,
        options: {
            instance?: string;
            violations?: Array<{ field: string; message: string }>;
            headers?: Record<string, string>;
            traceId?: string;
        } = {}
    ): ALBResult {
        const httpError = error instanceof HttpError ? error : {
            status: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred"
        };
        
        const responseData: ResponseData = {
            status: httpError.status,
            error: {
                status: httpError.status,
                title: httpError.title,
                detail: httpError.message,
                instance: options.instance,
                timestamp: new Date().toISOString(),
                traceId: options.traceId || this.generateTraceId(),
                violations: options.violations
            },
            links: [
                { rel: ["home"], href: "/" },
                { rel: ["help"], href: "/docs" }
            ]
        };
        
        const body = contentType === CONTENT_TYPES.JSON 
            ? this.jsonAdapter.format(responseData)
            : this.xhtmlAdapter.format(responseData);
        
        return {
            statusCode: httpError.status,
            headers: {
                "Content-Type": contentType,
                ...options.headers
            },
            body
        };
    }
    
    /**
     * Generate a trace ID for error tracking
     */
    private static generateTraceId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    
    /**
     * Build a redirect response
     */
    static redirect(
        location: string,
        options: {
            status?: 301 | 302 | 303 | 307 | 308;
            headers?: Record<string, string>;
        } = {}
    ): ALBResult {
        return {
            statusCode: options.status || 302,
            headers: {
                Location: location,
                ...options.headers
            },
            body: ""
        };
    }
}