import { ALBEvent, ALBResult } from "aws-lambda";
import { BaseController } from "./base_controller.js";
import { Route } from "./router.js";
import { RootAdapter } from "./root_adapter.js";

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
        const adapter = new RootAdapter();
        return this.success(event, adapter);
    }
}
