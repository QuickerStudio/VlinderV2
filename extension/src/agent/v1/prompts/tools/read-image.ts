import { ToolPromptSchema } from '../utils/utils';

export const readImagePrompt: ToolPromptSchema = {
	name: 'read_image',
	description: `Read an image file from the file system and convert it to base64 format for use in messages or analysis.

**🚀 NEW: Automatic Image Optimization** - Images are automatically optimized for Claude API (resized to ≤1568px, compressed) to reduce latency and cost without losing model performance.`,
	parameters: {
		path: {
			type: 'string',
			description: 'Path to the image file relative to the current working directory. Supports: png, jpg, jpeg, webp, gif (Anthropic Claude API compatible formats)',
			required: true,
		},
		get_metadata: {
			type: 'boolean',
			description: 'If true, returns image metadata (dimensions, size, format) along with the image data',
			required: false,
		},
		auto_optimize: {
			type: 'boolean',
			description: 'If true (default), automatically optimizes the image for Claude API (resizes to ≤1568px, compresses). Recommended to keep enabled for best performance and cost.',
			required: false,
		},
		max_dimension: {
			type: 'number',
			description: 'Maximum width or height in pixels (default: 1568). Images larger than this will be resized while preserving aspect ratio. Based on Anthropic recommendations.',
			required: false,
		},
		quality: {
			type: 'number',
			description: 'Compression quality for JPEG/WebP images (1-100, default: 85). Higher values mean better quality but larger file size. 80-90 is recommended.',
			required: false,
		},
	},
	capabilities: [
		'Read images from the file system',
		'Support for Anthropic Claude API compatible formats: PNG, JPG, JPEG, WebP, GIF',
		'Automatic optimization for Claude API best practices (enabled by default)',
		'Quality checking with warnings and recommendations',
		'Convert images to base64 data URLs',
		'Optionally retrieve image metadata (dimensions, size, format)',
		'Validate image format before reading',
	],
	examples: [
		{
			description: 'Read a screenshot for analysis',
			output: `<read_image>
<path>screenshots/error-message.png</path>
</read_image>`,
		},
		{
			description: 'Read an image with metadata',
			output: `<read_image>
<path>assets/logo.png</path>
<get_metadata>true</get_metadata>
</read_image>`,
		},
		{
			description: 'Read without auto-optimization (use original image)',
			output: `<read_image>
<path>assets/high-res-photo.jpg</path>
<auto_optimize>false</auto_optimize>
</read_image>`,
		},
		{
			description: 'Read with custom optimization settings',
			output: `<read_image>
<path>screenshots/large-screenshot.png</path>
<max_dimension>1200</max_dimension>
<quality>90</quality>
<get_metadata>true</get_metadata>
</read_image>`,
		},
		{
			description: 'Read a diagram for understanding',
			output: `<read_image>
<path>docs/architecture-diagram.jpg</path>
</read_image>`,
		},
		{
			description: 'Read multiple images (use multiple tool calls)',
			output: `<read_image>
<path>screenshots/before.png</path>
</read_image>
<read_image>
<path>screenshots/after.png</path>
</read_image>`,
		},
	],
	usageNotes: `**Best Practices:**
1. Use relative paths from the current working directory
2. Ensure the file is a supported format (png, jpg, jpeg, webp, gif)
3. Keep auto-optimization enabled (default) for best performance and cost
4. Trust the optimization: images ≤1568px provide the same model performance as larger images
5. Pay attention to warnings about image size/dimensions

**When to Use:**
✅ Analyze images (screenshots, diagrams, charts)
✅ Include images in your response
✅ Verify image contents
✅ Get image information (dimensions, size, format)
✅ Compare images visually

❌ Do NOT use for non-image files (use read_file instead)
❌ Do NOT use just to check if image exists (use list_files instead)
❌ Do NOT use for extremely large images (>5MB)

**Limitations:**
- File size: Very large images (>5MB) may be rejected by Claude API
- Format support: Only PNG, JPG, JPEG, WebP, GIF (Anthropic Claude API compatible)
- Read-only: Cannot modify or create images
- No manual OCR needed: Claude has native OCR capabilities
- Dimension limits: Images >8000px rejected; >1568px auto-resized

**Notes:**
- Automatic optimization enabled by default (resize to ≤1568px, compress with quality 85)
- No performance loss: Per Anthropic docs, images >1568px provide no additional model performance
- Cost savings: Optimization reduces token usage (tokens = width × height / 750)
- Images converted to base64 data URLs: data:image/png;base64,<base64-data>
- Quality warnings shown if image is too small (<200px), too large (>1568px), or exceeds size limits (>5MB)`,
};
