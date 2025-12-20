import { ResponseData } from "../base_controller";

/**
 * Helper to check if data is a HalObject
 */
function isHalObject(data: any): data is { _links?: any; _embedded?: any; _templates?: any; [key: string]: any } {
    return data && typeof data === 'object' && ('_links' in data || '_embedded' in data);
}

/**
 * XHTML format adapter for hypermedia responses
 * Works exclusively with HAL (Hypertext Application Language) structure
 */
export class XhtmlAdapter {
    private readonly namespace = "https://github.com/houseofwolvesllc/serverlesslaunchpad#";

    /**
     * Format response data as XHTML with RDFa
     */
    format(response: ResponseData): string {
        if (response.error) {
            return this.formatError(response);
        }

        return this.formatSuccess(response);
    }

    /**
     * Format successful response as XHTML
     */
    private formatSuccess(response: ResponseData): string {
        const data = response.data;
        const title = this.extractTitle(data);
        const content = this.formatContent(response);

        return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(title)}</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        dl { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        dt { font-weight: bold; margin-top: 10px; }
        dd { margin-left: 20px; margin-bottom: 10px; }
        nav ul { list-style: none; padding: 0; }
        nav li { display: inline-block; margin-right: 15px; }
        nav a { color: #0066cc; text-decoration: none; }
        nav a:hover { text-decoration: underline; }
        form { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
        form label { display: block; margin: 10px 0 5px; font-weight: bold; }
        form input, form select, form textarea { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 3px; }
        form button { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        form button:hover { background: #0052a3; }
        .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
        .collection-item { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
${content}
</body>
</html>`;
    }

    /**
     * Extract title from HAL object or use default
     */
    private extractTitle(data: any): string {
        if (isHalObject(data)) {
            return data.title || data.name || "Serverless Launchpad API";
        }
        return "Serverless Launchpad API";
    }

    /**
     * Format error response as XHTML
     */
    private formatError(response: ResponseData): string {
        const error = response.error!;
        const title = `Error - ${error.title}`;

        const violationsHtml = error.violations?.length
            ? `
            <dt>Violations</dt>
            <dd>
                <ul>
                    ${error.violations
                        .map(
                            (v) =>
                                `<li property="slp:violation" data-field="${this.escapeHtml(
                                    v.field
                                )}">${this.escapeHtml(v.message)}</li>`
                        )
                        .join("\n                    ")}
                </ul>
            </dd>`
            : "";

        const content = `
    <div class="error" xmlns:slp="${this.namespace}" typeof="slp:Error" resource="${this.escapeHtml(
            error.instance || ""
        )}">
        <h1>${this.escapeHtml(error.title)}</h1>
        <dl>
            <dt>Type</dt>
            <dd property="slp:type">${this.escapeHtml(this.getErrorTypeName(error.status))}</dd>

            <dt>Status</dt>
            <dd property="slp:status">${error.status}</dd>

            <dt>Title</dt>
            <dd property="slp:title">${this.escapeHtml(error.title)}</dd>

            ${
                error.detail
                    ? `
            <dt>Detail</dt>
            <dd property="slp:detail">${this.escapeHtml(error.detail)}</dd>`
                    : ""
            }

            ${
                error.instance
                    ? `
            <dt>Instance</dt>
            <dd property="slp:instance">${this.escapeHtml(error.instance)}</dd>`
                    : ""
            }

            <dt>Timestamp</dt>
            <dd property="slp:timestamp">${error.timestamp || new Date().toISOString()}</dd>

            <dt>Trace ID</dt>
            <dd property="slp:traceId">${error.traceId || this.generateTraceId()}</dd>
            ${violationsHtml}
        </dl>
    </div>`;

        return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(title)}</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #c00; }
        dl { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        dt { font-weight: bold; margin-top: 10px; }
        dd { margin-left: 20px; margin-bottom: 10px; }
        nav ul { list-style: none; padding: 0; }
        nav li { display: inline-block; margin-right: 15px; }
        nav a { color: #0066cc; text-decoration: none; }
        nav a:hover { text-decoration: underline; }
        .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
${content}
</body>
</html>`;
    }

    /**
     * Format main content based on HAL response data
     */
    private formatContent(response: ResponseData): string {
        const data = response.data;

        if (!isHalObject(data)) {
            // Simple non-HAL value
            return `
    <div xmlns:slp="${this.namespace}">
        <h1>Result</h1>
        <p>${this.escapeHtml(String(data))}</p>
    </div>`;
        }

        // HAL object - extract components
        const selfHref = data._links?.self?.href || "";
        const title = data.title || data.name || "Resource";

        // Check if this is a collection (has _embedded)
        if (data._embedded) {
            return this.formatCollection(data, title, selfHref);
        }

        // Single resource
        return this.formatResource(data, title, selfHref);
    }

    /**
     * Format a HAL collection
     */
    private formatCollection(data: any, title: string, resourceUri: string): string {
        // Get the first embedded collection
        const embeddedKey = Object.keys(data._embedded)[0];
        const items = embeddedKey ? data._embedded[embeddedKey] : [];

        return `
    <div xmlns:slp="${this.namespace}" typeof="slp:Collection" resource="${this.escapeHtml(resourceUri)}">
        <h1>${this.escapeHtml(title)}</h1>
        ${data.count !== undefined ? `<p>Count: ${data.count}</p>` : ""}
        <div class="collection">
            ${Array.isArray(items) ? items.map((item) => this.formatCollectionItem(item)).join("\n            ") : ""}
        </div>
        ${this.formatHalTemplates(data._templates)}
        ${this.formatHalLinks(data._links)}
    </div>`;
    }

    /**
     * Format a single HAL resource
     */
    private formatResource(data: any, title: string, resourceUri: string): string {
        return `
    <div xmlns:slp="${this.namespace}" typeof="slp:Resource" resource="${this.escapeHtml(resourceUri)}">
        <h1>${this.escapeHtml(title)}</h1>
        ${this.formatEntity(data)}
        ${this.formatHalTemplates(data._templates)}
        ${this.formatHalLinks(data._links)}
    </div>`;
    }

    /**
     * Format a collection item
     */
    private formatCollectionItem(item: any): string {
        return `
            <div class="collection-item" typeof="slp:Resource">
                ${this.formatEntity(item)}
            </div>`;
    }

    /**
     * Format an entity as definition list (excludes HAL reserved properties)
     */
    private formatEntity(entity: any): string {
        const { _links, _embedded, _templates, ...properties } = entity;

        const propertyItems = Object.entries(properties)
            .map(([key, value]) => {
                const displayKey = this.humanizeKey(key);
                const displayValue = this.formatValue(value);
                return `
            <dt>${this.escapeHtml(displayKey)}</dt>
            <dd property="slp:${key}">${displayValue}</dd>`;
            })
            .join("");

        return `<dl>${propertyItems}
        </dl>`;
    }

    /**
     * Format a value for display
     */
    private formatValue(value: any): string {
        if (value === null || value === undefined) {
            return "<em>None</em>";
        }

        if (Array.isArray(value)) {
            return `
                <ul>
                    ${value.map((v) => `<li>${this.escapeHtml(String(v))}</li>`).join("\n                    ")}
                </ul>`;
        }

        if (typeof value === "object") {
            return this.formatEntity(value);
        }

        return this.escapeHtml(String(value));
    }

    /**
     * Format HAL _links as navigation
     */
    private formatHalLinks(links?: any): string {
        if (!links || typeof links !== 'object') return "";

        const linkEntries = Object.entries(links)
            .filter(([rel]) => rel !== 'self') // Skip self link
            .map(([rel, link]: [string, any]) => {
                const href = Array.isArray(link) ? link[0]?.href : link?.href;
                const title = Array.isArray(link) ? link[0]?.title : link?.title;
                const displayTitle = title || this.humanizeKey(rel);

                if (!href) return '';

                return `<li><a href="${this.escapeHtml(href)}" rel="slp:${rel}">${this.escapeHtml(displayTitle)}</a></li>`;
            })
            .filter(Boolean);

        if (linkEntries.length === 0) return "";

        return `
        <nav>
            <h2>Links</h2>
            <ul>
            ${linkEntries.join("\n            ")}
            </ul>
        </nav>`;
    }

    /**
     * Format HAL-FORMS _templates as forms
     */
    private formatHalTemplates(templates?: any): string {
        if (!templates || typeof templates !== 'object') return "";

        const forms = Object.entries(templates)
            .map(([name, template]: [string, any]) => {
                const method = template.method?.toUpperCase() || 'POST';
                const target = template.target || '';
                const title = template.title || this.humanizeKey(name);

                const fields = template.properties
                    ?.map((prop: any) => {
                        const inputType = this.getInputType(prop.type);
                        const required = prop.required ? "required" : "";
                        const value = prop.value ? `value="${this.escapeHtml(String(prop.value))}"` : "";
                        const prompt = prop.prompt || this.humanizeKey(prop.name);

                        return `
            <label for="${this.escapeHtml(prop.name)}">${this.escapeHtml(prompt)}${
                            prop.required ? " *" : ""
                        }</label>
            <input type="${inputType}" id="${this.escapeHtml(prop.name)}" name="${this.escapeHtml(
                            prop.name
                        )}" ${required} ${value} />`;
                    })
                    .join("") || "";

                return `
        <form action="${this.escapeHtml(target)}" method="${method}" ${
                    template.contentType ? `enctype="${this.escapeHtml(template.contentType)}"` : ""
                }>
            <h3>${this.escapeHtml(title)}</h3>
            ${fields}
            <button type="submit">${this.escapeHtml(title)}</button>
        </form>`;
            })
            .join("");

        return forms ? `<div class="templates">${forms}</div>` : "";
    }

    /**
     * Get HTML input type for a field type
     */
    private getInputType(fieldType?: string): string {
        switch (fieldType) {
            case "email":
                return "email";
            case "password":
                return "password";
            case "number":
                return "number";
            case "date":
                return "date";
            case "datetime":
                return "datetime-local";
            case "url":
                return "url";
            case "tel":
                return "tel";
            default:
                return "text";
        }
    }

    /**
     * Convert a key to human-readable format
     */
    private humanizeKey(key: string): string {
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
            .trim();
    }

    /**
     * Get error type name from status code
     */
    private getErrorTypeName(status: number): string {
        switch (status) {
            case 400:
                return "ValidationError";
            case 401:
                return "AuthenticationError";
            case 403:
                return "AuthorizationError";
            case 404:
                return "NotFoundError";
            case 409:
                return "ConflictError";
            case 422:
                return "BusinessRuleError";
            default:
                return "ServerError";
        }
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(str: string): string {
        const div = Object.assign(global.document?.createElement?.("div") || {}, { textContent: str });
        return (
            div.innerHTML ||
            str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
        );
    }

    /**
     * Generate a trace ID
     */
    private generateTraceId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
