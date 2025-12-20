import { HalResourceAdapter, HalObject } from "./content_types/hal_adapter";

export class RootAdapter extends HalResourceAdapter {
    get message() {
        return "Serverless Launchpad API";
    }

    get _links(): HalObject["_links"] {
        return {
            self: this.createLink("/"),
            docs: this.createLink("/docs", { title: "API Documentation" }),
            health: this.createLink("/health", { title: "Health Check" })
        };
    }

    protected getBaseLinks() {
        return undefined;
    }
}
