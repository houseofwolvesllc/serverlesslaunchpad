import { ResponseData } from '../base_controller';
import { HalObject, HalTemplate, HalTemplateProperty } from './hal_adapter';

/**
 * HAL XHTML format adapter
 * Generically transforms any HAL object to semantic XHTML
 *
 * This adapter provides HAL-specific formatting for hypermedia responses,
 * rendering _links, _embedded, and _templates as semantic HTML5 elements.
 * For error responses, it falls back to basic formatting.
 */
export class HalXhtmlAdapter {
    private readonly halNamespace = "https://github.com/houseofwolvesllc/serverlesslaunchpad#";

    /**
     * Format HAL object as semantic XHTML
     *
     * @param response - Response data containing HAL object or error
     * @returns XHTML string representation
     */
    format(response: ResponseData): string {
        if (response.error) {
            // Render error response
            return this.renderError(response.error);
        }

        const halObject = this.extractHalObject(response.data);

        if (!halObject) {
            // Not a HAL object, render simple response
            return this.renderSimpleResponse(response.data);
        }

        return this.renderHalDocument(halObject);
    }

    /**
     * Extract HAL object (handle toJSON() method)
     */
    private extractHalObject(data: any): HalObject | null {
        if (!data) return null;

        // Check if it has toJSON method
        if (typeof data === 'object' && 'toJSON' in data && typeof data.toJSON === 'function') {
            return data.toJSON();
        }

        // Check if it's already a HAL object
        if (typeof data === 'object' && ('_links' in data || '_embedded' in data || '_templates' in data)) {
            return data as HalObject;
        }

        return null;
    }

    /**
     * Render complete XHTML document from HAL object
     */
    private renderHalDocument(hal: HalObject): string {
        const title = this.extractHalTitle(hal);

        return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(title)}</title>
    ${this.renderStyles()}
</head>
<body>
    <article class="hal-resource" vocab="${this.halNamespace}">
        ${this.renderProperties(hal)}
        ${this.renderEmbedded(hal)}
        ${this.renderLinks(hal)}
        ${this.renderTemplates(hal)}
    </article>
</body>
</html>`;
    }

    /**
     * Extract title from HAL object
     */
    private extractHalTitle(hal: HalObject): string {
        return hal.title || hal.name || 'Resource';
    }

    /**
     * Render regular properties (non-HAL keys) as definition list
     */
    private renderProperties(hal: HalObject): string {
        const properties = Object.entries(hal).filter(
            ([key]) => !key.startsWith('_') && key !== 'toJSON'
        );

        if (properties.length === 0) return '';

        const items = properties.map(([key, value]) => {
            const displayValue = this.formatHalValue(value);
            return `    <dt>${this.escapeHtml(key)}</dt>
    <dd property="${this.escapeHtml(key)}">${displayValue}</dd>`;
        }).join('\n');

        return `  <section class="hal-properties">
    <h2>Properties</h2>
    <dl>
${items}
    </dl>
  </section>`;
    }

    /**
     * Format value for display (handles dates, objects, arrays)
     */
    private formatHalValue(value: any): string {
        if (value === null || value === undefined) {
            return '<em>null</em>';
        }

        if (typeof value === 'boolean') {
            return this.escapeHtml(String(value));
        }

        if (typeof value === 'number') {
            return this.escapeHtml(String(value));
        }

        if (typeof value === 'string') {
            // Check if it's an ISO date
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                return `<time datetime="${this.escapeHtml(value)}">${this.escapeHtml(new Date(value).toLocaleString())}</time>`;
            }
            return this.escapeHtml(value);
        }

        if (Array.isArray(value)) {
            return `<code>${this.escapeHtml(JSON.stringify(value))}</code>`;
        }

        if (typeof value === 'object') {
            return `<code>${this.escapeHtml(JSON.stringify(value))}</code>`;
        }

        return this.escapeHtml(String(value));
    }

    /**
     * Render embedded resources as nested articles
     */
    private renderEmbedded(hal: HalObject): string {
        if (!hal._embedded || Object.keys(hal._embedded).length === 0) {
            return '';
        }

        const sections = Object.entries(hal._embedded).map(([rel, data]) => {
            const items = Array.isArray(data) ? data : [data];

            const renderedItems = items.map((item) => {
                const itemHal = typeof item === 'object' && 'toJSON' in item ? item.toJSON() : item;
                return `    <article class="hal-embedded-item" rel="${this.escapeHtml(rel)}">
${this.renderProperties(itemHal)}
${this.renderLinks(itemHal)}
${this.renderTemplates(itemHal)}
    </article>`;
            }).join('\n');

            return `  <section class="hal-embedded" rel="${this.escapeHtml(rel)}">
    <h3>Embedded: ${this.escapeHtml(rel)}</h3>
${renderedItems}
  </section>`;
        }).join('\n');

        return sections;
    }

    /**
     * Render HAL links as navigation
     */
    private renderLinks(hal: HalObject): string {
        if (!hal._links || Object.keys(hal._links).length === 0) {
            return '';
        }

        const links = Object.entries(hal._links).map(([rel, link]) => {
            // Handle both single link and array of links (HAL allows arrays)
            const linkObj = Array.isArray(link) ? link[0] : link;
            const title = linkObj.title || rel;
            return `    <a rel="${this.escapeHtml(rel)}" href="${this.escapeHtml(linkObj.href)}">${this.escapeHtml(title)}</a>`;
        }).join('\n');

        return `  <nav class="hal-links">
    <h3>Links</h3>
${links}
  </nav>`;
    }

    /**
     * Render HAL templates as HTML forms
     */
    private renderTemplates(hal: HalObject): string {
        if (!hal._templates || Object.keys(hal._templates).length === 0) {
            return '';
        }

        const forms = Object.entries(hal._templates).map(([name, template]) => {
            return this.renderTemplate(name, template);
        }).join('\n');

        return `  <section class="hal-templates">
    <h3>Operations</h3>
${forms}
  </section>`;
    }

    /**
     * Render single template as HTML form
     */
    private renderTemplate(name: string, template: HalTemplate): string {
        const method = (template.method || 'POST').toLowerCase();
        const action = template.target || '';
        const title = template.title || name;

        const fields = (template.properties || []).map(prop => {
            return this.renderTemplateProperty(prop);
        }).join('\n');

        return `    <form class="hal-template" data-name="${this.escapeHtml(name)}"
          action="${this.escapeHtml(action)}"
          method="post"
          data-method="${this.escapeHtml(method)}">
      <h4>${this.escapeHtml(title)}</h4>
${fields}
      <button type="submit">${this.escapeHtml(title)}</button>
    </form>`;
    }

    /**
     * Render template property as form field
     */
    private renderTemplateProperty(prop: HalTemplateProperty): string {
        const required = prop.required ? ' required="required"' : '';
        const type = prop.type || 'text';
        const value = prop.value !== undefined ? ` value="${this.escapeHtml(String(prop.value))}"` : '';
        const prompt = prop.prompt || prop.name;

        // Handle select/options
        if (prop.options && prop.options.length > 0) {
            const options = prop.options.map(opt =>
                `        <option value="${this.escapeHtml(opt.value)}">${this.escapeHtml(opt.prompt)}</option>`
            ).join('\n');

            return `      <label>
        ${this.escapeHtml(prompt)}:
        <select name="${this.escapeHtml(prop.name)}"${required}>
${options}
        </select>
      </label>`;
        }

        // Handle textarea
        if (type === 'textarea') {
            return `      <label>
        ${this.escapeHtml(prompt)}:
        <textarea name="${this.escapeHtml(prop.name)}"${required}>${value ? this.escapeHtml(String(prop.value)) : ''}</textarea>
      </label>`;
        }

        // Handle regular input
        return `      <label>
        ${this.escapeHtml(prompt)}:
        <input type="${this.escapeHtml(type)}" name="${this.escapeHtml(prop.name)}"${value}${required} />
      </label>`;
    }

    /**
     * Render embedded CSS styles
     */
    private renderStyles(): string {
        return `<style>
      /* Base Styles */
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
        background: #f5f5f5;
        line-height: 1.6;
        color: #333;
      }

      /* HAL Resource Container */
      .hal-resource {
        background: #fff;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin: 1rem 0;
      }

      /* Headings */
      h1, h2, h3, h4 { color: #333; margin-top: 1.5rem; }
      h1 { font-size: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.25rem; color: #555; }

      /* Properties as Definition List */
      dl {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 0.25rem;
        margin: 1rem 0;
      }
      dt {
        font-weight: bold;
        margin-top: 0.5rem;
        color: #555;
      }
      dd {
        margin: 0.25rem 0 0.5rem 1rem;
      }

      /* Embedded Resources */
      .hal-embedded {
        margin: 2rem 0;
      }
      .hal-embedded-item {
        margin: 1rem 0;
        padding: 1rem;
        background: #f9f9f9;
        border-left: 3px solid #0066cc;
        border-radius: 0.25rem;
      }

      /* Navigation Links */
      .hal-links {
        margin: 1.5rem 0;
        padding: 1rem 0;
        border-top: 1px solid #eee;
      }
      .hal-links a {
        display: inline-block;
        margin: 0.25rem 0.5rem 0.25rem 0;
        padding: 0.5rem 1rem;
        background: #f0f0f0;
        color: #0066cc;
        text-decoration: none;
        border-radius: 0.25rem;
        transition: background 0.2s;
      }
      .hal-links a:hover {
        background: #e0e0e0;
      }

      /* Templates/Forms Section */
      .hal-templates {
        margin: 2rem 0;
        padding-top: 2rem;
        border-top: 2px solid #0066cc;
      }
      .hal-template {
        margin: 1rem 0;
        padding: 1.5rem;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 0.25rem;
      }
      .hal-template h4 {
        margin-top: 0;
        color: #0066cc;
      }

      /* Form Elements */
      .hal-template label {
        display: block;
        margin: 1rem 0 0.25rem 0;
        font-weight: 500;
        color: #333;
      }
      .hal-template input,
      .hal-template textarea,
      .hal-template select {
        display: block;
        width: 100%;
        max-width: 30rem;
        padding: 0.75rem;
        margin: 0.25rem 0 1rem 0;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
        font-family: inherit;
        font-size: 1rem;
      }
      .hal-template input:focus,
      .hal-template textarea:focus,
      .hal-template select:focus {
        outline: none;
        border-color: #0066cc;
        box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
      }
      .hal-template button {
        padding: 0.75rem 1.5rem;
        margin: 1rem 0.5rem 0 0;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 0.25rem;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }
      .hal-template button:hover {
        background: #0052a3;
      }
      .hal-template button:active {
        background: #004080;
      }

      /* Code and Time Elements */
      code {
        background: #f0f0f0;
        padding: 0.125rem 0.25rem;
        border-radius: 0.125rem;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 0.9em;
      }
      time {
        font-style: italic;
        color: #666;
      }

      /* Error Styling */
      .error h1 {
        color: #c00;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        body {
          padding: 0.5rem;
        }
        .hal-resource {
          padding: 1rem;
        }
        h1 {
          font-size: 1.5rem;
        }
        .hal-template input,
        .hal-template textarea,
        .hal-template select {
          max-width: 100%;
        }
      }

      /* Print Styles */
      @media print {
        body {
          background: white;
        }
        .hal-resource {
          box-shadow: none;
        }
        button {
          display: none;
        }
        .hal-links a {
          color: #000;
          text-decoration: underline;
        }
      }
    </style>`;
    }

    /**
     * Escape HTML entities
     */
    private escapeHtml(text: string): string {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Render error response
     */
    private renderError(error: NonNullable<ResponseData['error']>): string {
        return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Error - ${this.escapeHtml(error.title)}</title>
    ${this.renderStyles()}
</head>
<body>
    <article class="hal-resource error">
        <h1>Error: ${this.escapeHtml(error.title)}</h1>
        <dl>
            <dt>Status</dt>
            <dd>${error.status}</dd>
            ${error.detail ? `<dt>Detail</dt><dd>${this.escapeHtml(error.detail)}</dd>` : ''}
            ${error.instance ? `<dt>Instance</dt><dd>${this.escapeHtml(error.instance)}</dd>` : ''}
            ${error.timestamp ? `<dt>Timestamp</dt><dd>${this.escapeHtml(error.timestamp)}</dd>` : ''}
            ${error.traceId ? `<dt>Trace ID</dt><dd>${this.escapeHtml(error.traceId)}</dd>` : ''}
        </dl>
        ${error.violations && error.violations.length > 0 ? `
        <section>
            <h2>Violations</h2>
            <ul>
                ${error.violations.map(v => `<li><strong>${this.escapeHtml(v.field)}</strong>: ${this.escapeHtml(v.message)}</li>`).join('\n')}
            </ul>
        </section>
        ` : ''}
    </article>
</body>
</html>`;
    }

    /**
     * Render simple non-HAL response
     */
    private renderSimpleResponse(data: any): string {
        return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Response</title>
    ${this.renderStyles()}
</head>
<body>
    <article class="hal-resource">
        <h1>Response</h1>
        <pre>${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </article>
</body>
</html>`;
    }
}
