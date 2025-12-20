<script lang="ts">
	import type { HalTemplate, HalTemplateProperty } from '@houseofwolves/serverlesslaunchpad.types/hal';
	import { createEventDispatcher } from 'svelte';
	import { AlertCircle } from 'lucide-svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import Button from '$lib/components/ui/button.svelte';

	export let template: HalTemplate;
	export let loading = false;
	export let errors: Record<string, string> = {};
	export let onCancel: (() => void) | undefined = undefined;

	const dispatch = createEventDispatcher<{
		submit: Record<string, any>;
	}>();

	// Form data state
	let formData: Record<string, any> = {};

	// Initialize form data with default values
	$: {
		if (template.properties) {
			template.properties.forEach(prop => {
				if (formData[prop.name] === undefined) {
					formData[prop.name] = prop.value ?? '';
				}
			});
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length === 0) {
			dispatch('submit', formData);
		} else {
			errors = validationErrors;
		}
	}

	function validateForm(): Record<string, string> {
		const validationErrors: Record<string, string> = {};

		template.properties?.forEach(prop => {
			const value = formData[prop.name];

			// Required validation
			if (prop.required && (!value || value === '')) {
				validationErrors[prop.name] = `${prop.prompt || prop.name} is required`;
			}

			// Min/Max length validation
			if (value && typeof value === 'string') {
				if (prop.minLength && value.length < prop.minLength) {
					validationErrors[prop.name] = `Minimum length is ${prop.minLength}`;
				}
				if (prop.maxLength && value.length > prop.maxLength) {
					validationErrors[prop.name] = `Maximum length is ${prop.maxLength}`;
				}
			}

			// Min/Max value validation
			if (value && (prop.type === 'number' || prop.type === 'date')) {
				const numValue = typeof value === 'number' ? value : parseFloat(value);
				if (prop.min !== undefined && numValue < Number(prop.min)) {
					validationErrors[prop.name] = `Minimum value is ${prop.min}`;
				}
				if (prop.max !== undefined && numValue > Number(prop.max)) {
					validationErrors[prop.name] = `Maximum value is ${prop.max}`;
				}
			}

			// Regex validation
			if (value && prop.regex && typeof value === 'string') {
				const regex = new RegExp(prop.regex);
				if (!regex.test(value)) {
					validationErrors[prop.name] = `Invalid format`;
				}
			}

			// Options validation
			if (prop.options && value) {
				const validOptions = prop.options.map(opt => opt.value);
				if (!validOptions.includes(value)) {
					validationErrors[prop.name] = `Invalid selection`;
				}
			}
		});

		return validationErrors;
	}

	function renderField(prop: HalTemplateProperty) {
		const fieldId = `field-${prop.name}`;
		const hasError = errors[prop.name];
		const errorClass = hasError ? 'input-error' : '';

		switch (prop.type) {
			case 'hidden':
				return { type: 'hidden', inputClass: '' };
			case 'number':
				return { type: 'number', inputClass: `input input-bordered w-full ${errorClass}` };
			case 'date':
				return { type: 'date', inputClass: `input input-bordered w-full ${errorClass}` };
			case 'email':
				return { type: 'email', inputClass: `input input-bordered w-full ${errorClass}` };
			case 'url':
				return { type: 'url', inputClass: `input input-bordered w-full ${errorClass}` };
			case 'tel':
				return { type: 'tel', inputClass: `input input-bordered w-full ${errorClass}` };
			case 'textarea':
				return { type: 'textarea', inputClass: `textarea textarea-bordered w-full ${errorClass}` };
			case 'select':
				return { type: 'select', inputClass: `select select-bordered w-full ${errorClass}` };
			default:
				return { type: 'text', inputClass: `input input-bordered w-full ${errorClass}` };
		}
	}
</script>

<form on:submit={handleSubmit} class="space-y-4">
	{#if template.properties}
		{#each template.properties as prop}
			{@const field = renderField(prop)}
			{@const fieldId = `field-${prop.name}`}

			{#if prop.type === 'hidden'}
				<input
					type="hidden"
					id={fieldId}
					name={prop.name}
					bind:value={formData[prop.name]}
				/>
			{:else if prop.type === 'textarea'}
				<div class="space-y-2">
					<Label for={fieldId}>
						{prop.prompt || prop.name}
						{#if prop.required}<span class="text-destructive">*</span>{/if}
					</Label>
					<Textarea
						id={fieldId}
						name={prop.name}
						bind:value={formData[prop.name]}
						required={prop.required}
						readonly={prop.readOnly}
						minlength={prop.minLength}
						maxlength={prop.maxLength}
						rows={4}
					/>
					{#if errors[prop.name]}
						<p class="text-sm text-destructive flex items-center gap-1">
							<AlertCircle class="h-4 w-4" />
							{errors[prop.name]}
						</p>
					{/if}
				</div>
			{:else if prop.type === 'select'}
				<div class="space-y-2">
					<Label for={fieldId}>
						{prop.prompt || prop.name}
						{#if prop.required}<span class="text-destructive">*</span>{/if}
					</Label>
					<select
						id={fieldId}
						name={prop.name}
						class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
						bind:value={formData[prop.name]}
						required={prop.required}
						disabled={prop.readOnly}
					>
						<option value="">Select...</option>
						{#if prop.options}
							{#each prop.options as option}
								<option value={option.value}>
									{option.prompt || option.value}
								</option>
							{/each}
						{/if}
					</select>
					{#if errors[prop.name]}
						<p class="text-sm text-destructive flex items-center gap-1">
							<AlertCircle class="h-4 w-4" />
							{errors[prop.name]}
						</p>
					{/if}
				</div>
			{:else}
				<div class="space-y-2">
					<Label for={fieldId}>
						{prop.prompt || prop.name}
						{#if prop.required}<span class="text-destructive">*</span>{/if}
					</Label>
					<Input
						type={field.type}
						id={fieldId}
						name={prop.name}
						bind:value={formData[prop.name]}
						required={prop.required}
						readonly={prop.readOnly}
						min={prop.min}
						max={prop.max}
						minlength={prop.minLength}
						maxlength={prop.maxLength}
						pattern={prop.regex}
					/>
					{#if errors[prop.name]}
						<p class="text-sm text-destructive flex items-center gap-1">
							<AlertCircle class="h-4 w-4" />
							{errors[prop.name]}
						</p>
					{/if}
				</div>
			{/if}
		{/each}
	{/if}

	<div class="flex gap-2 justify-end pt-4">
		{#if onCancel}
			<Button
				type="button"
				variant="outline"
				on:click={onCancel}
				disabled={loading}
			>
				Cancel
			</Button>
		{/if}
		<Button
			type="submit"
			disabled={loading}
		>
			{loading ? 'Submitting...' : template.title || 'Submit'}
		</Button>
	</div>
</form>
