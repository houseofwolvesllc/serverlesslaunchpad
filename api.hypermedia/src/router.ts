import "reflect-metadata";

/**
 * HTTP methods supported by the router
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Route descriptor interface
 */
export interface RouteDescriptor {
    method: HttpMethod;
    path: string;
    controllerClass: new (...args: any[]) => any;
    methodName: string;
    regex: RegExp;
    parameterNames: string[];
    literalSegmentCount: number;
}

/**
 * Route match result
 */
export interface RouteMatch {
    route: RouteDescriptor;
    parameters: Record<string, string>;
}

/**
 * Route metadata key for reflect-metadata
 */
const ROUTE_METADATA_KEY = Symbol('routes');

/**
 * Route decorator that registers routes with method, path, controller class, and method name
 * @param method HTTP method
 * @param path URL path pattern with parameter placeholders like /{userId}/sessions/{sessionId}
 */
export function Route(method: HttpMethod, path: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Get existing routes metadata or initialize empty array
        const routes: RouteDescriptor[] = Reflect.getMetadata(ROUTE_METADATA_KEY, target.constructor) || [];
        
        // Convert path to regex and extract parameter names
        const { regex, parameterNames } = pathToRegex(path);
        
        // Count literal segments for specificity ordering
        const literalSegmentCount = countLiteralSegments(path);
        
        // Create route descriptor
        const route: RouteDescriptor = {
            method,
            path,
            controllerClass: target.constructor,
            methodName: propertyKey,
            regex,
            parameterNames,
            literalSegmentCount
        };
        
        routes.push(route);
        
        // Store updated routes metadata
        Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, target.constructor);
        
        return descriptor;
    };
}

/**
 * Convert a path pattern to a regular expression and extract parameter names
 * @param path Path pattern like /{userId}/sessions/{sessionId}
 * @returns Object with regex and parameter names
 */
function pathToRegex(path: string): { regex: RegExp; parameterNames: string[] } {
    const parameterNames: string[] = [];
    
    // Escape special regex characters except for parameter placeholders
    let regexPattern = path
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\\{([^}]+)\\}/g, (_match, paramName) => {
            parameterNames.push(paramName);
            return '([^/]+)'; // Match any non-slash characters
        });
    
    // Ensure exact match with start and end anchors
    regexPattern = `^${regexPattern}$`;
    
    return {
        regex: new RegExp(regexPattern),
        parameterNames
    };
}

/**
 * Count literal (non-parameter) segments in a path for specificity ordering
 * @param path Path pattern
 * @returns Number of literal segments
 */
function countLiteralSegments(path: string): number {
    return path
        .split('/')
        .filter(segment => segment && !segment.startsWith('{'))
        .length;
}

/**
 * Router implementation for ALB event routing with automatic specificity-based sorting
 */
export class Router {
    private routes: RouteDescriptor[] = [];
    private sorted = false;

    /**
     * Register routes from controller classes using @Route decorators
     * @param controllerClasses Array of controller classes to scan for routes
     */
    registerRoutes(controllerClasses: Array<new (...args: any[]) => any>) {
        this.routes = [];
        
        for (const controllerClass of controllerClasses) {
            const routes: RouteDescriptor[] = Reflect.getMetadata(ROUTE_METADATA_KEY, controllerClass) || [];
            this.routes.push(...routes);
        }
        
        this.sorted = false;
    }

    /**
     * Sort routes by specificity (more literal segments first)
     * Routes with more literal segments get higher priority
     */
    private sortRoutes() {
        if (this.sorted) return;
        
        this.routes.sort((a, b) => {
            // First sort by method for consistent ordering
            if (a.method !== b.method) {
                return a.method.localeCompare(b.method);
            }
            
            // Then sort by specificity (more literal segments first)
            return b.literalSegmentCount - a.literalSegmentCount;
        });
        
        this.sorted = true;
    }

    /**
     * Match a request method and path to a route
     * @param method HTTP method
     * @param path URL path
     * @returns Route match with parameters or null if no match
     */
    match(method: HttpMethod, path: string): RouteMatch | null {
        this.sortRoutes();
        
        for (const route of this.routes) {
            if (route.method === method && route.regex.test(path)) {
                const parameters = this.extractParameters(path, route);
                return { route, parameters };
            }
        }
        
        return null;
    }

    /**
     * Extract path parameters from a matched route
     * @param path URL path
     * @param route Route descriptor
     * @returns Object with parameter name-value pairs
     */
    private extractParameters(path: string, route: RouteDescriptor): Record<string, string> {
        const parameters: Record<string, string> = {};
        const matches = path.match(route.regex);
        
        if (matches) {
            // Skip the first match (full string) and map parameter values
            for (let i = 0; i < route.parameterNames.length; i++) {
                const paramName = route.parameterNames[i];
                const paramValue = matches[i + 1]; // +1 to skip full match
                parameters[paramName] = decodeURIComponent(paramValue);
            }
        }
        
        return parameters;
    }

    /**
     * Get all registered routes (mainly for debugging/testing)
     */
    getRoutes(): RouteDescriptor[] {
        this.sortRoutes();
        return [...this.routes];
    }

    /**
     * Build href from route metadata by controller class and method name
     *
     * This enables reverse routing - generating URLs from route definitions
     * rather than hard-coding paths throughout the codebase.
     *
     * @param controllerClass Controller class with @Route decorators
     * @param methodName Method name with @Route decorator
     * @param parameters Path parameters to interpolate (e.g., { userId: "abc123" })
     * @returns URL path with parameters interpolated
     * @throws Error if route not found or if required parameters are missing
     *
     * @example
     * ```typescript
     * // Given: @Route('GET', '/users/{userId}/sessions/{sessionId}')
     * const href = router.buildHref(SessionsController, 'get', {
     *   userId: 'abc123',
     *   sessionId: 'xyz789'
     * });
     * // Returns: '/users/abc123/sessions/xyz789'
     * ```
     */
    buildHref(
        controllerClass: new (...args: any[]) => any,
        methodName: string,
        parameters: Record<string, string> = {}
    ): string {
        const route = this.routes.find(
            (r) => r.controllerClass === controllerClass && r.methodName === methodName
        );

        if (!route) {
            throw new Error(`Route not found: ${controllerClass.name}.${methodName}`);
        }

        // Interpolate parameters into path template
        let href = route.path;
        for (const [key, value] of Object.entries(parameters)) {
            const placeholder = `{${key}}`;
            if (!href.includes(placeholder)) {
                throw new Error(
                    `Parameter '${key}' not found in route path '${route.path}' for ${controllerClass.name}.${methodName}`
                );
            }
            href = href.replace(placeholder, encodeURIComponent(value));
        }

        // Check for any remaining unfilled parameters
        const remainingParams = href.match(/\{[^}]+\}/g);
        if (remainingParams) {
            throw new Error(
                `Missing required parameters ${remainingParams.join(', ')} for route ${controllerClass.name}.${methodName}`
            );
        }

        return href;
    }
}