import { ALBEvent, ALBResult } from "aws-lambda";
import { BaseController } from "./base_controller.js";
import { Route } from "./router.js";

/**
 * Root endpoint controller
 */
export class RootController extends BaseController {
    /**
     * Root endpoint showing available actions based on auth state
     * Example: GET /
     */
    @Route("GET", "/")
    async getRoot(event: ALBEvent): Promise<ALBResult> {
        return this.success(event, { message: "Welcome to Serverless Launchpad API" });
    }
}
