import { HalResourceAdapter } from "../content_types/hal_adapter";

/**
 * HAL adapter for session revocation responses
 */
export class SessionRevocationAdapter extends HalResourceAdapter {
    get _links() {
        return {
            self: this.createLink("/auth/revoke"),
            ...this.getBaseLinks()
        };
    }

    get message() {
        return "Session revoked successfully";
    }
}
