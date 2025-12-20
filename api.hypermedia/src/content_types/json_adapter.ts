import { ResponseData } from "../base_controller";

/**
 * JSON/Siren format adapter for hypermedia responses
 */
export class JsonAdapter {
    /**
     * Format response data as Siren JSON
     */
    format(response: ResponseData): string {
        if (response.error) {
            return this.formatError(response);
        }

        return this.formatSuccess(response);
    }

    /**
     * Format successful response as Siren
     */
    private formatSuccess(response: ResponseData): string {
        const siren: any = {};

        // Handle different data types
        if (Array.isArray(response.data)) {
            // Collection response
            siren.class = ["collection"];
            siren.entities = response.data.map((item) => this.formatEntity(item));
        } else if (response.data && typeof response.data === "object") {
            // Single entity response
            const formatted = this.formatEntity(response.data);
            Object.assign(siren, formatted);
        } else {
            // Simple value response
            siren.properties = { value: response.data };
        }

        // Add links if present
        if (response.links?.length) {
            siren.links = response.links;
        }

        // Add actions if present
        if (response.actions?.length) {
            siren.actions = response.actions;
        }

        return JSON.stringify(siren, null, 2);
    }

    /**
     * Format error response as Siren
     */
    private formatError(response: ResponseData): string {
        const error = response.error!;
        const siren: any = {
            class: ["error", this.getErrorClass(error.status)],
            properties: {
                status: error.status,
                title: error.title,
                detail: error.detail,
                instance: error.instance,
                timestamp: error.timestamp || new Date().toISOString(),
                traceId: error.traceId || this.generateTraceId(),
            },
        };

        // Add violations if present
        if (error.violations?.length) {
            siren.properties.violations = error.violations;
        }

        // Add links
        if (response.links?.length) {
            siren.links = response.links;
        }

        return JSON.stringify(siren, null, 2);
    }

    /**
     * Format an individual entity for Siren
     */
    private formatEntity(entity: any): any {
        // If entity already has Siren structure, return as-is
        if (entity.class || entity.properties || entity.entities) {
            return entity;
        }

        // Extract special fields
        const { _links, _actions, _class, _rel, ...properties } = entity;

        const siren: any = {
            properties,
        };

        // Add class if specified
        if (_class) {
            siren.class = Array.isArray(_class) ? _class : [_class];
        }

        // Add rel if specified (for sub-entities)
        if (_rel) {
            siren.rel = Array.isArray(_rel) ? _rel : [_rel];
        }

        // Add links if specified
        if (_links) {
            siren.links = Array.isArray(_links) ? _links : [_links];
        }

        // Add actions if specified
        if (_actions) {
            siren.actions = Array.isArray(_actions) ? _actions : [_actions];
        }

        return siren;
    }

    /**
     * Get error class name based on status code
     */
    private getErrorClass(status: number): string {
        switch (status) {
            case 400:
                return "validation-error";
            case 401:
                return "authentication-error";
            case 403:
                return "authorization-error";
            case 404:
                return "not-found-error";
            case 409:
                return "conflict-error";
            case 422:
                return "business-rule-error";
            default:
                return "server-error";
        }
    }

    /**
     * Generate a trace ID for error tracking
     */
    private generateTraceId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
