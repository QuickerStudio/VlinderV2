import { z } from 'zod';

/**
 * Schema for read_image tool
 * Allows the agent to read images from the file system and convert them to base64 format
 * Includes automatic optimization for Claude API best practices
 */
export const readImageToolParamsSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the image file relative to the current working directory. Supports: png, jpg, jpeg, webp, gif (Anthropic Claude API compatible formats)'
		),
	get_metadata: z
		.boolean()
		.optional()
		.describe(
			'If true, returns image metadata (dimensions, size, format) along with the image data'
		),
	auto_optimize: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'If true (default), automatically optimizes the image for Claude API (resizes to ≤1568px, compresses). Recommended to keep enabled for best performance and cost.'
		),
	max_dimension: z
		.number()
		.optional()
		.default(1568)
		.describe(
			'Maximum width or height in pixels (default: 1568). Images larger than this will be resized while preserving aspect ratio. Based on Anthropic recommendations.'
		),
	quality: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.default(85)
		.describe(
			'Compression quality for JPEG/WebP images (1-100, default: 85). Higher values mean better quality but larger file size. 80-90 is recommended.'
		),
});

export const readImageTool = {
	schema: {
		name: 'read_image' as const,
		schema: readImageToolParamsSchema,
	},
	examples: [],
};

export type ReadImageToolParams = {
	name: typeof readImageTool.schema.name;
	input: z.infer<typeof readImageToolParamsSchema>;
};

