import * as path from 'path';
import { serializeError } from 'serialize-error';
import dedent from 'dedent';

import { getReadablePath } from '../../../utils';
import { BaseAgentTool } from '../../base-agent.tool';
import { ReadImageToolParams } from '../../schema/read-image';
import {
	readImageFromPath,
	getImageMetadata,
	isSupportedImageFormat,
	checkImageQuality,
	optimizeImageForClaude,
	bufferToDataUrl,
} from '../../../../../utils/process-images';
import * as fs from 'fs/promises';

/**
 * Tool for reading images from the file system
 * Converts images to base64 format for use in AI messages
 */
export class ReadImageTool extends BaseAgentTool<ReadImageToolParams> {
	async execute() {
		const { input, ask, say } = this.params;
		const {
			path: relPath,
			get_metadata,
			auto_optimize = true,
			max_dimension = 1568,
			quality = 85,
		} = input;

		try {
			// Resolve absolute path
			const absolutePath = path.resolve(this.cwd, relPath);
			const readablePath = getReadablePath(relPath, this.cwd);

			// Validate file format (Anthropic Claude API supported formats)
			if (!isSupportedImageFormat(absolutePath)) {
				const errorMsg = `Unsupported image format. File: ${readablePath}. Supported formats: PNG, JPG, JPEG, WebP, GIF (compatible with Anthropic Claude API)`;
				await say('error', errorMsg);
				return this.toolResponse('error', errorMsg);
			}

			// Check image quality first
			let qualityReport: any = null;
			try {
				qualityReport = await checkImageQuality(absolutePath);

				// Show warnings if image is not optimal
				if (!qualityReport.isOptimal) {
					const warningMsg = dedent`
						⚠️ Image Quality Warning for ${readablePath}:

						${qualityReport.warnings.join('\n')}

						💡 Recommendations:
						${qualityReport.recommendations.join('\n')}

						📊 Current: ${qualityReport.currentDimensions.width}x${qualityReport.currentDimensions.height}px
						${qualityReport.recommendedDimensions ? `📊 Recommended: ${qualityReport.recommendedDimensions.width}x${qualityReport.recommendedDimensions.height}px` : ''}
						📈 Estimated: ${qualityReport.estimatedTokens} tokens (~$${qualityReport.estimatedCost.toFixed(4)})

						${auto_optimize ? '✅ Auto-optimization is enabled. The image will be optimized automatically.' : '⚠️ Auto-optimization is disabled. Consider enabling it for better performance.'}
					`;
					await say('info', warningMsg);
				}
			} catch (error) {
				// Quality check failed, but continue with image reading
				await say(
					'info',
					`Could not check image quality: ${error instanceof Error ? error.message : String(error)}`
				);
			}

			// Read image and optionally optimize
			let imageData: string;
			let metadata: any = null;
			let optimizationApplied = false;

			try {
				// Read original image buffer
				const originalBuffer = await fs.readFile(absolutePath);
				const originalFormat = path.extname(absolutePath).slice(1);

				// Optimize if enabled
				if (auto_optimize) {
					try {
						const { buffer: optimizedBuffer, mimeType } =
							await optimizeImageForClaude(originalBuffer, originalFormat, {
								maxWidth: max_dimension,
								maxHeight: max_dimension,
								jpegQuality: quality,
								webpQuality: quality,
							});

						imageData = bufferToDataUrl(optimizedBuffer, mimeType);
						optimizationApplied = true;

						// Get metadata from optimized image if requested
						if (get_metadata) {
							const { Jimp } = await import('jimp');
							const optimizedImage = await Jimp.read(optimizedBuffer);
							metadata = {
								format: originalFormat,
								size: optimizedBuffer.length,
								width: optimizedImage.bitmap.width,
								height: optimizedImage.bitmap.height,
								mimeType,
								optimized: true,
								originalSize: originalBuffer.length,
								originalDimensions: qualityReport?.currentDimensions,
							};
						}
					} catch (optimizeError) {
						// Optimization failed, fall back to original
						await say(
							'info',
							`Image optimization failed, using original: ${optimizeError instanceof Error ? optimizeError.message : String(optimizeError)}`
						);
						imageData = await readImageFromPath(absolutePath);
						optimizationApplied = false;

						if (get_metadata) {
							metadata = await getImageMetadata(absolutePath);
						}
					}
				} else {
					// No optimization, use original
					imageData = await readImageFromPath(absolutePath);

					if (get_metadata) {
						metadata = await getImageMetadata(absolutePath);
					}
				}
			} catch (error) {
				const errorMsg = `Failed to read image: ${error instanceof Error ? error.message : String(error)}`;
				await say('error', errorMsg);
				return this.toolResponse('error', errorMsg);
			}

			// Ask for approval to use the image
			const { response, text, images } = await ask(
				'tool',
				{
					tool: {
						tool: 'read_image',
						path: readablePath,
						approvalState: 'pending',
						imageData: imageData.substring(0, 100) + '...', // Show preview
						metadata,
						ts: this.ts,
					},
				},
				this.ts
			);

			if (response !== 'yesButtonTapped') {
				await this.params.updateAsk(
					'tool',
					{
						tool: {
							tool: 'read_image',
							path: readablePath,
							approvalState: 'rejected',
							imageData: imageData.substring(0, 100) + '...',
							metadata,
							userFeedback: text,
							ts: this.ts,
						},
					},
					this.ts
				);

				if (response === 'messageResponse') {
					await say(
						'user_feedback',
						text ?? 'The user denied this operation.',
						images
					);
					return this.toolResponse('feedback', text, images);
				}

				return this.toolResponse(
					'error',
					'Image read operation cancelled by user.'
				);
			}

			// Update approval state
			await this.params.updateAsk(
				'tool',
				{
					tool: {
						tool: 'read_image',
						path: readablePath,
						approvalState: 'approved',
						imageData: imageData.substring(0, 100) + '...',
						metadata,
						ts: this.ts,
					},
				},
				this.ts
			);

			// Prepare response message
			let responseMsg = dedent`Successfully read image from ${readablePath}`;

			if (metadata) {
				responseMsg += dedent`

					Image Metadata:
					- Format: ${metadata.format.toUpperCase()}
					- Size: ${(metadata.size / 1024).toFixed(2)} KB
					${metadata.width && metadata.height ? `- Dimensions: ${metadata.width}x${metadata.height}px` : ''}
					- MIME Type: ${metadata.mimeType}
				`;

				if (metadata.optimized) {
					const sizeSaved = metadata.originalSize - metadata.size;
					const percentSaved = ((sizeSaved / metadata.originalSize) * 100).toFixed(1);
					responseMsg += dedent`

						✅ Image Optimization Applied:
						- Original Size: ${(metadata.originalSize / 1024).toFixed(2)} KB
						- Optimized Size: ${(metadata.size / 1024).toFixed(2)} KB
						- Saved: ${(sizeSaved / 1024).toFixed(2)} KB (${percentSaved}%)
						${metadata.originalDimensions ? `- Original Dimensions: ${metadata.originalDimensions.width}x${metadata.originalDimensions.height}px` : ''}
						- Optimized Dimensions: ${metadata.width}x${metadata.height}px
					`;
				}
			}

			if (optimizationApplied && !metadata) {
				responseMsg += dedent`

					✅ Image has been optimized for Claude API (resized to ≤${max_dimension}px, compressed)
				`;
			}

			responseMsg += dedent`

				The image has been loaded and is now available as base64 data.
				You can include this image in your next message by referencing it.
			`;

			return this.toolResponse('success', responseMsg, [imageData]);
		} catch (error) {
			const errorMsg = `Unexpected error reading image: ${error instanceof Error ? error.message : String(error)}`;
			await say('error', errorMsg);
			return this.toolResponse('error', errorMsg);
		}
	}
}

