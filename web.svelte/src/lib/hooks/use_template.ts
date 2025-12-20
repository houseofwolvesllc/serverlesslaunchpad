import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { halClient } from '$lib/hal_forms_client';
import { toastStore } from '$lib/stores/toast_store';
import { logger } from '$lib/logging';

/**
 * Execute a HAL-FORMS template
 *
 * @param template - The HAL template to execute
 * @param data - The form data to submit
 * @returns Promise with the result
 */
export async function executeTemplate<T = any>(
	template: HalTemplate,
	data: Record<string, any>
): Promise<T> {
	try {
		logger.info('Executing template', { template: template.title, method: template.method });

		const result = await halClient.executeTemplate(template, data);

		logger.info('Template executed successfully', { template: template.title });
		return result as T;
	} catch (error: any) {
		logger.error('Template execution failed', {
			template: template.title,
			error: error.message,
		});

		// Show error toast
		const errorMessage = error.detail || error.message || 'Operation failed';
		toastStore.error(errorMessage);

		throw error;
	}
}

/**
 * Validate template data before submission
 *
 * @param template - The HAL template
 * @param data - The form data to validate
 * @returns Validation errors (empty object if valid)
 */
export function validateTemplateData(
	template: HalTemplate,
	data: Record<string, any>
): Record<string, string> {
	const errors: Record<string, string> = {};

	template.properties?.forEach(prop => {
		const value = data[prop.name];

		// Required validation
		if (prop.required && (!value || value === '')) {
			errors[prop.name] = `${prop.prompt || prop.name} is required`;
		}

		// Type validations
		if (value) {
			// String validations
			if (typeof value === 'string') {
				if (prop.minLength && value.length < prop.minLength) {
					errors[prop.name] = `Minimum length is ${prop.minLength}`;
				}
				if (prop.maxLength && value.length > prop.maxLength) {
					errors[prop.name] = `Maximum length is ${prop.maxLength}`;
				}
				if (prop.regex) {
					const regex = new RegExp(prop.regex);
					if (!regex.test(value)) {
						errors[prop.name] = 'Invalid format';
					}
				}
			}

			// Number validations
			if (prop.type === 'number') {
				const numValue = typeof value === 'number' ? value : parseFloat(value);
				if (isNaN(numValue)) {
					errors[prop.name] = 'Must be a number';
				} else {
					if (prop.min !== undefined && numValue < Number(prop.min)) {
						errors[prop.name] = `Minimum value is ${prop.min}`;
					}
					if (prop.max !== undefined && numValue > Number(prop.max)) {
						errors[prop.name] = `Maximum value is ${prop.max}`;
					}
				}
			}

			// Options validation (select)
			if (prop.options) {
				const validOptions = prop.options.map(opt => opt.value);
				if (!validOptions.includes(value)) {
					errors[prop.name] = 'Invalid selection';
				}
			}
		}
	});

	return errors;
}
