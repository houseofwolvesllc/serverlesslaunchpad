import { JsonAdapter } from './json_adapter';
import { ResponseData } from '../base_controller';

/**
 * HAL+JSON format adapter
 * Extends JsonAdapter to handle HAL-specific structures
 *
 * HAL objects are expected to have a toJSON() method that returns
 * the complete HAL representation including _links, _embedded, and _templates.
 */
export class HalJsonAdapter extends JsonAdapter {
    /**
     * Format HAL object as JSON with proper serialization
     *
     * @param response - Response data containing HAL object or error
     * @returns JSON string representation
     */
    format(response: ResponseData): string {
        if (response.error) {
            // Use base adapter for errors
            return super.format(response);
        }

        const halObject = response.data;

        // HAL objects should have toJSON() method
        if (halObject && typeof halObject === 'object' && 'toJSON' in halObject && typeof halObject.toJSON === 'function') {
            return JSON.stringify(halObject.toJSON(), null, 2);
        }

        // Fallback to simple JSON for non-HAL objects
        return super.format(response);
    }
}
