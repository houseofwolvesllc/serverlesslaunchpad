import { Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ALBResult } from "aws-lambda";
import { BaseController } from "../base_controller";
import { ExtendedALBEvent } from "../extended_alb_event";
import { Route } from "../router";
import { SitemapAdapter } from "./sitemap_adapter";

@Injectable()
export class SitemapController extends BaseController {
    @Route("GET", "/sitemap")
    async getSitemap(event: ExtendedALBEvent): Promise<ALBResult> {
        // Extract user from authenticated request context (optional)
        const user = (event as any).user;

        const adapter = new SitemapAdapter(user);
        return this.success(event, adapter);
    }
}
