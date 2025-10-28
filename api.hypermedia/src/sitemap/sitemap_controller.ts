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

    @Route("GET", "/sitemap")
    @Protected({ allowAnonymous: true })
    async getSitemap(event: ExtendedALBEvent): Promise<ALBResult> {
        // Extract user from authenticated request context (optional)
        // If user is authenticated, authContext.identity will be present
        // If user is anonymous, authContext will be undefined
        const user = event.authContext?.identity;

        const adapter = new SitemapAdapter(user, this.router);
        return this.success(event, adapter);
    }
}
