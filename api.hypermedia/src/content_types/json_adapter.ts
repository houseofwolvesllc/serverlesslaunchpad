import { ResponseData } from "../base_controller";
import { HalObject } from "./hal_adapter";

/**
 * JSON/HAL format adapter for hypermedia responses
 * Uses the HAL (Hypertext Application Language) specification
 */
export class JsonAdapter {
    /**
     * Format response data as HAL JSON
     */
    format(response: ResponseData): string {
        if (response.error) {
            return this.formatError(response);
        }

        return this.formatSuccess(response);
    }

    /**
     * Check if data is a HalObject (has HAL reserved properties or is a HAL adapter instance)
     */
    private isHalObject(data: any): data is HalObject {
        return (
            data &&
            typeof data === "object" &&
            (data._links !== undefined ||
                data._embedded !== undefined ||
                data._templates !== undefined ||
                data.constructor?.name?.endsWith("Adapter"))
        );
    }

    /**
     * Format successful response as HAL
     */
    private formatSuccess(response: ResponseData): string {
        // Only support HalObject path - all responses must use HAL adapters
        if (!this.isHalObject(response.data)) {
            throw new Error(
                "Response data must be a HalObject. Use a HAL adapter to structure your response."
            );
        }

        return JSON.stringify(response.data, null, 2);
    }

    /**
     * Format error response as HAL
     */
    private formatError(response: ResponseData): string {
        const error = response.error!;

        const errorObject: any = {
            status: error.status,
            title: error.title,
            detail: error.detail,
            instance: error.instance,
            timestamp: error.timestamp || new Date().toISOString(),
            traceId: error.traceId || this.generateTraceId(),
            _links: {
                home: { href: "/" },
                sitemap: { href: "/sitemap", title: "Navigation" }
            }
        };

        // Add violations if present
        if (error.violations?.length) {
            errorObject.violations = error.violations;
        }

        return JSON.stringify(errorObject, null, 2);
    }

    /**
     * Generate a trace ID for error tracking
     */
    private generateTraceId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
