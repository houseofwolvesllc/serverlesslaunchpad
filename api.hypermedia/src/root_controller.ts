import { BaseController } from "./base_controller.js";
import { Route } from "./router.js";
import { ALBEvent } from "aws-lambda";

/**
 * Root endpoint controller
 */
export class RootController extends BaseController {
    /**
     * Root endpoint showing available actions based on auth state
     * Example: GET /
     */
    @Route('GET', '/')
    async getRoot(_event: ALBEvent) {
        // TODO: Implement root endpoint with hypermedia links
        return { message: 'Welcome to Serverless Launchpad API' };
    }
}