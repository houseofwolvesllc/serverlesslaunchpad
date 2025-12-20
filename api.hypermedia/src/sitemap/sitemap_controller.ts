import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { Protected } from "../decorators/protected";
import { ExtendedALBEvent } from "../extended_alb_event";
import { Route, Router } from "../router";
import { SitemapAdapter } from "./sitemap_adapter";

@Injectable()
export class SitemapController extends BaseController {
    constructor(private router: Router) {
        super();
    }

    /**
     * Get sitemap with navigation links
     *
     * ETag Strategy: Hash entire payload since sitemap is derived data
     * (not a stored entity). Returns 304 if payload hasn't changed.
     */
    @Route("GET", "/sitemap")
    @Protected({ allowAnonymous: true })
    async getSitemap(event: ExtendedALBEvent): Promise<ALBResult> {
        // Extract user from authenticated request context (optional)
        // If user is authenticated, authContext.identity will be present
        // If user is anonymous, authContext will be undefined
        const user = event.authContext?.identity;

        const adapter = new SitemapAdapter(user, this.router);

        // Generate ETag by hashing the entire payload
        const etag = this.generateSitemapETag(adapter.toJSON());

        // Check if client has current version
        const notModified = this.checkNotModified(event, etag);
        if (notModified) return notModified;

        return this.success(event, adapter, {
            headers: { 'ETag': etag }
        });
    }

    /**
     * Generate ETag for sitemap by hashing the entire payload.
     * Sitemap is derived data (not a stored entity), so we hash the response.
     */
    private generateSitemapETag(sitemapPayload: any): string {
        const payloadStr = JSON.stringify(sitemapPayload);
        const hash = this.simpleHash(payloadStr);
        return `"sitemap-${hash}"`;
    }
}
