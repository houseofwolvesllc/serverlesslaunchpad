import { ResponseData } from "../base_controller";

/**
 * XHTML format adapter for hypermedia responses
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
        const title = response.metadata?.title || "Serverless Launchpad API";
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
        ${this.formatNavigation(response.links)}
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
     * Format main content based on response data
     */
    private formatContent(response: ResponseData): string {
        const resourceType = response.metadata?.resourceType || "Resource";
        const resourceUri = response.metadata?.resourceUri || "";

        let content = "";

        // Format data based on type
        if (Array.isArray(response.data)) {
            // Collection
            content = `
    <div xmlns:slp="${this.namespace}" typeof="slp:Collection" resource="${this.escapeHtml(resourceUri)}">
        <h1>${this.escapeHtml(response.metadata?.title || "Collection")}</h1>
        ${response.metadata?.description ? `<p>${this.escapeHtml(response.metadata.description)}</p>` : ""}
        <div class="collection">
            ${response.data.map((item) => this.formatItem(item, resourceType)).join("\n            ")}
        </div>
        ${this.formatActions(response.actions)}
        ${this.formatNavigation(response.links)}
    </div>`;
        } else if (response.data && typeof response.data === "object") {
            // Single entity
            content = `
    <div xmlns:slp="${this.namespace}" typeof="slp:${resourceType}" resource="${this.escapeHtml(resourceUri)}">
        <h1>${this.escapeHtml(response.metadata?.title || resourceType)}</h1>
        ${response.metadata?.description ? `<p>${this.escapeHtml(response.metadata.description)}</p>` : ""}
        ${this.formatEntity(response.data)}
        ${this.formatActions(response.actions)}
        ${this.formatNavigation(response.links)}
    </div>`;
        } else {
            // Simple value
            content = `
    <div xmlns:slp="${this.namespace}">
        <h1>${this.escapeHtml(response.metadata?.title || "Result")}</h1>
        <p>${this.escapeHtml(String(response.data))}</p>
        ${this.formatNavigation(response.links)}
    </div>`;
        }

        return content;
    }

    /**
     * Format a collection item
     */
    private formatItem(item: any, resourceType: string): string {
        return `
            <div class="collection-item" typeof="slp:${resourceType}">
                ${this.formatEntity(item)}
            </div>`;
    }

    /**
     * Format an entity as definition list
     */
    private formatEntity(entity: any): string {
        const { _links, _actions, _class, _rel, ...properties } = entity;

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
     * Format navigation links
     */
    private formatNavigation(links?: ResponseData["links"]): string {
        if (!links?.length) return "";

        const linkItems = links
            .map((link) => {
                const rel = Array.isArray(link.rel) ? link.rel.join(" ") : link.rel;
                const title = link.title || this.humanizeKey(rel);
                return `<li><a href="${this.escapeHtml(link.href)}" rel="slp:${rel}">${this.escapeHtml(
                    title
                )}</a></li>`;
            })
            .join("\n            ");

        return `
        <nav>
            <ul>
            ${linkItems}
            </ul>
        </nav>`;
    }

    /**
     * Format actions as forms
     */
    private formatActions(actions?: ResponseData["actions"]): string {
        if (!actions?.length) return "";

        return actions
            .map((action) => {
                const method = action.method.toUpperCase();
                const fields = action.fields
                    ?.map((field) => {
                        const inputType = this.getInputType(field.type);
                        const required = field.required ? "required" : "";
                        const value = field.value ? `value="${this.escapeHtml(String(field.value))}"` : "";

                        return `
            <label for="${this.escapeHtml(field.name)}">${this.humanizeKey(field.name)}${
                            field.required ? " *" : ""
                        }</label>
            <input type="${inputType}" id="${this.escapeHtml(field.name)}" name="${this.escapeHtml(
                            field.name
                        )}" ${required} ${value} />`;
                    })
                    .join("");

                return `
        <form action="${this.escapeHtml(action.href)}" method="${method}" ${
                    action.type ? `enctype="${this.escapeHtml(action.type)}"` : ""
                }>
            <h3>${this.escapeHtml(action.title)}</h3>
            ${fields || ""}
            <button type="submit">${this.escapeHtml(action.title)}</button>
        </form>`;
            })
            .join("");
    }

    /**
     * Get HTML input type for a field type
     */
    private getInputType(fieldType: string): string {
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
