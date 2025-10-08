import * as vscode from 'vscode';
import fs from 'fs/promises';
import * as path from 'path';
import { Jimp } from 'jimp';
import * as webp from 'webp-wasm';

/**
 * Get Jimp instance (for testing)
 */
export async function getJimp() {
	return Jimp;
}

/**
 * Image metadata interface
 */
export interface ImageMetadata {
	width?: number;
	height?: number;
	size: number;
	format: string;
	mimeType: string;
	fileName: string;
	filePath: string;
}

/**
 * Select images from file system using VS Code's file picker
 * Supports formats compatible with Anthropic Claude API: JPEG, PNG, GIF, WebP
 * @returns Array of base64-encoded data URLs
 */
export async function selectImages(): Promise<string[]> {
	const options: vscode.OpenDialogOptions = {
		canSelectMany: true,
		openLabel: 'Select Images',
		filters: {
			// Anthropic Claude API supported formats
			Images: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
		},
	};

	const fileUris = await vscode.window.showOpenDialog(options);

	if (!fileUris || fileUris.length === 0) {
		return [];
	}

	return await Promise.all(
		fileUris.map(async (uri) => {
			const imagePath = uri.fsPath;
			const buffer = await fs.readFile(imagePath);
			const base64 = buffer.toString('base64');
			const mimeType = getMimeType(imagePath);
			const dataUrl = `data:${mimeType};base64,${base64}`;
			return dataUrl;
		})
	);
}

/**
 * Read a single image from file path and convert to base64 data URL
 * @param filePath - Path to the image file
 * @returns Base64-encoded data URL
 */
export async function readImageFromPath(filePath: string): Promise<string> {
	try {
		const buffer = await fs.readFile(filePath);
		const base64 = buffer.toString('base64');
		const mimeType = getMimeType(filePath);
		const dataUrl = `data:${mimeType};base64,${base64}`;
		return dataUrl;
	} catch (error) {
		throw new Error(
			`Failed to read image from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Read multiple images from file paths
 * @param filePaths - Array of file paths
 * @returns Array of base64-encoded data URLs
 */
export async function readImagesFromPaths(
	filePaths: string[]
): Promise<string[]> {
	return await Promise.all(
		filePaths.map((filePath) => readImageFromPath(filePath))
	);
}

/**
 * Get image metadata without loading the full image
 * @param filePath - Path to the image file
 * @returns Image metadata
 */
export async function getImageMetadata(
	filePath: string
): Promise<ImageMetadata> {
	const stats = await fs.stat(filePath);
	const buffer = await fs.readFile(filePath);
	const mimeType = getMimeType(filePath);
	const format = path.extname(filePath).toLowerCase().slice(1);

	// Extract dimensions from image buffer (basic implementation)
	const dimensions = extractImageDimensions(buffer, format);

	return {
		width: dimensions?.width,
		height: dimensions?.height,
		size: stats.size,
		format,
		mimeType,
		fileName: path.basename(filePath),
		filePath,
	};
}

/**
 * Extract image dimensions from buffer (basic implementation for common formats)
 * @param buffer - Image file buffer
 * @param format - Image format (png, jpg, etc.)
 * @returns Width and height if extractable
 */
function extractImageDimensions(
	buffer: Buffer,
	format: string
): { width: number; height: number } | null {
	try {
		if (format === 'png' && buffer.length >= 24) {
			// PNG format: width at bytes 16-19, height at bytes 20-23
			const width = buffer.readUInt32BE(16);
			const height = buffer.readUInt32BE(20);
			return { width, height };
		} else if (
			(format === 'jpg' || format === 'jpeg') &&
			buffer.length >= 2
		) {
			// JPEG format is more complex, basic implementation
			// Look for SOF0 (Start of Frame) marker
			for (let i = 0; i < buffer.length - 9; i++) {
				if (buffer[i] === 0xff && buffer[i + 1] === 0xc0) {
					const height = buffer.readUInt16BE(i + 5);
					const width = buffer.readUInt16BE(i + 7);
					return { width, height };
				}
			}
		}
		// For other formats or if extraction fails, return null
		return null;
	} catch (error) {
		return null;
	}
}

/**
 * Get MIME type from file path
 * Supports formats compatible with Anthropic Claude API: JPEG, PNG, GIF, WebP
 * @param filePath - Path to the image file
 * @returns MIME type string
 */
function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case '.png':
			return 'image/png';
		case '.jpeg':
		case '.jpg':
			return 'image/jpeg';
		case '.webp':
			return 'image/webp';
		case '.gif':
			return 'image/gif';
		default:
			throw new Error(`Unsupported file type: ${ext}`);
	}
}

/**
 * Compress images by reducing quality/size
 * Currently returns images as-is, but validates size limits
 * @param images - Array of base64-encoded data URLs
 * @param maxSizeBytes - Maximum size per image in bytes (default: 5MB)
 * @returns Array of compressed/validated images
 */
export async function compressImages(
	images: string[],
	maxSizeBytes: number = 5 * 1024 * 1024
): Promise<string[]> {
	return images.map((image) => {
		// Calculate approximate size of base64 string
		const base64Data = image.split(',')[1] || image;
		const sizeBytes = (base64Data.length * 3) / 4;

		if (sizeBytes > maxSizeBytes) {
			vscode.window.showWarningMessage(
				`Image size (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB). Consider using a smaller image.`
			);
		}

		// TODO: Implement actual image compression using sharp or similar library
		// For now, just return the original image
		return image;
	});
}

/**
 * Read image from clipboard (if available)
 * @returns Base64-encoded data URL or null if no image in clipboard
 */
export async function readImageFromClipboard(): Promise<string | null> {
	try {
		// VS Code doesn't have direct clipboard image access
		// This would require a native module or extension API enhancement
		vscode.window.showInformationMessage(
			'Clipboard image reading is not yet supported. Please use the file picker to select images.'
		);
		return null;
	} catch (error) {
		console.error('Failed to read image from clipboard:', error);
		return null;
	}
}

/**
 * Validate if a file is a supported image format
 * Supports formats compatible with Anthropic Claude API: JPEG, PNG, GIF, WebP
 * @param filePath - Path to the file
 * @returns True if the file is a supported image format
 */
export function isSupportedImageFormat(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	// Anthropic Claude API supported formats only
	return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

/**
 * Convert image buffer to base64 data URL
 * @param buffer - Image buffer
 * @param mimeType - MIME type of the image
 * @returns Base64-encoded data URL
 */
export function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
	const base64 = buffer.toString('base64');
	return `data:${mimeType};base64,${base64}`;
}

/**
 * Image quality report interface
 */
export interface ImageQualityReport {
	isOptimal: boolean;
	warnings: string[];
	recommendations: string[];
	estimatedTokens: number;
	estimatedCost: number;
	currentDimensions: { width: number; height: number };
	recommendedDimensions?: { width: number; height: number };
}

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	jpegQuality?: number;
	pngCompressionLevel?: number;
	webpQuality?: number;
	preferWebP?: boolean; // Prefer WebP format for best compression
}

/**
 * Check image quality and provide recommendations
 * Based on Anthropic Claude API best practices
 * @param filePath - Path to the image file
 * @returns Quality report with warnings and recommendations
 */
export async function checkImageQuality(
	filePath: string
): Promise<ImageQualityReport> {
	const metadata = await getImageMetadata(filePath);
	const warnings: string[] = [];
	const recommendations: string[] = [];

	const { width = 0, height = 0, size } = metadata;
	const pixels = width * height;

	// Check dimensions - based on official Anthropic documentation
	if (width < 200 || height < 200) {
		warnings.push(
			'⚠️ Image is too small (<200px on any edge), may degrade Claude performance'
		);
		recommendations.push(
			'💡 Use a higher resolution image (≥200px on all edges)'
		);
	}

	if (width > 1568 || height > 1568) {
		warnings.push(
			'⚠️ Image is larger than recommended (>1568px), will increase latency'
		);
		recommendations.push(
			'💡 Resize to ≤1568px to reduce latency without losing model performance'
		);
	}

	if (width > 8000 || height > 8000) {
		warnings.push(
			'❌ Image is too large (>8000px), will be rejected by Claude API'
		);
		recommendations.push('💡 Resize to ≤1568px for optimal performance');
	}

	// Check file size
	if (size > 5 * 1024 * 1024) {
		warnings.push(
			'⚠️ Image is larger than 5MB, may be rejected by Claude API'
		);
		recommendations.push('💡 Compress or resize the image to reduce file size');
	}

	// Calculate tokens and cost (based on official formula: tokens = width * height / 750)
	const estimatedTokens = Math.ceil(pixels / 750);
	const estimatedCost = (estimatedTokens / 1000000) * 3; // $3 per million input tokens (Claude Sonnet 3.7)

	// Calculate recommended dimensions if needed
	let recommendedDimensions: { width: number; height: number } | undefined;
	if (width > 1568 || height > 1568) {
		const aspectRatio = width / height;
		if (aspectRatio > 1) {
			// Landscape
			recommendedDimensions = {
				width: 1568,
				height: Math.round(1568 / aspectRatio),
			};
		} else {
			// Portrait or square
			recommendedDimensions = {
				width: Math.round(1568 * aspectRatio),
				height: 1568,
			};
		}
	}

	return {
		isOptimal: warnings.length === 0,
		warnings,
		recommendations,
		estimatedTokens,
		estimatedCost,
		currentDimensions: { width, height },
		recommendedDimensions,
	};
}

/**
 * Optimize image for Claude API using Jimp with WebP support
 * - Resizes to optimal dimensions (≤1568x1568 by default)
 * - Converts to WebP for best compression (or JPEG/PNG as fallback)
 * - Supports concurrent processing via Promise.all
 * - Works in both browser and Node.js
 *
 * @param buffer - Original image buffer
 * @param originalFormat - Original image format (e.g., 'jpeg', 'png', 'webp')
 * @param options - Optimization options
 * @returns Optimized image buffer and new MIME type
 */
export async function optimizeImageForClaude(
	buffer: Buffer,
	originalFormat: string,
	options: ImageOptimizationOptions = {}
): Promise<{ buffer: Buffer; mimeType: string }> {
	// Default options based on Anthropic recommendations
	const {
		maxWidth = 1568,
		maxHeight = 1568,
		jpegQuality = 85,
		webpQuality = 85,
		preferWebP = true, // WebP provides 3-6x better compression
	} = options;

	try {
		// Load image with Jimp (async operation - can be parallelized)
		const image = await Jimp.read(buffer);

		// Get original dimensions
		const width = image.bitmap.width;
		const height = image.bitmap.height;

		// Check if resize is needed
		const needsResize = width > maxWidth || height > maxHeight;

		// Determine MIME type based on format
		const format = originalFormat.toLowerCase();
		let mimeType: string;

		if (format === 'jpeg' || format === 'jpg') {
			mimeType = 'image/jpeg';
		} else if (format === 'png') {
			mimeType = 'image/png';
		} else if (format === 'webp') {
			mimeType = 'image/webp';
		} else if (format === 'gif') {
			// Convert GIF to PNG for better quality
			mimeType = 'image/png';
		} else {
			// Default to JPEG for unknown formats
			mimeType = 'image/jpeg';
		}

		// If no resize needed and format is already optimal, return original
		if (!needsResize && (format === 'jpeg' || format === 'jpg' || format === 'png')) {
			return {
				buffer,
				mimeType,
			};
		}

		// Resize if needed (preserving aspect ratio)
		if (needsResize) {
			// scaleToFit automatically preserves aspect ratio
			image.scaleToFit({ w: maxWidth, h: maxHeight });
		}

		// Convert to buffer based on format preference
		let optimizedBuffer: Buffer;
		let outputMimeType: string;

		if (preferWebP) {
			// WebP provides best compression (3-6x better than PNG)
			// Convert Jimp image to ImageData format for webp-wasm
			const imageData = {
				data: new Uint8ClampedArray(image.bitmap.data),
				width: image.bitmap.width,
				height: image.bitmap.height,
			};

			// Encode to WebP using webp-wasm
			optimizedBuffer = await webp.encode(imageData, { quality: webpQuality });
			outputMimeType = 'image/webp';
		} else if (format === 'png' || format === 'gif') {
			// PNG format (for transparency)
			optimizedBuffer = await image.getBuffer('image/png');
			outputMimeType = 'image/png';
		} else {
			// JPEG format (default for photos)
			optimizedBuffer = await image.getBuffer('image/jpeg', { quality: jpegQuality });
			outputMimeType = 'image/jpeg';
		}

		// If optimized buffer is larger than original, return original
		if (optimizedBuffer.length > buffer.length) {
			return {
				buffer,
				mimeType: format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg',
			};
		}

		return {
			buffer: optimizedBuffer,
			mimeType: outputMimeType,
		};
	} catch (error) {
		// If optimization fails, return original
		console.error('Image optimization failed:', error);
		const format = originalFormat.toLowerCase();
		return {
			buffer,
			mimeType: `image/${format}`,
		};
	}
}

/**
 * Get optimal dimensions for an image
 * @param width - Original width
 * @param height - Original height
 * @param maxDimension - Maximum dimension (default: 1568)
 * @returns Optimal dimensions preserving aspect ratio
 */
export function getOptimalDimensions(
	width: number,
	height: number,
	maxDimension: number = 1568
): { width: number; height: number } {
	if (width <= maxDimension && height <= maxDimension) {
		return { width, height };
	}

	const aspectRatio = width / height;

	if (aspectRatio > 1) {
		// Landscape
		return {
			width: maxDimension,
			height: Math.round(maxDimension / aspectRatio),
		};
	} else {
		// Portrait or square
		return {
			width: Math.round(maxDimension * aspectRatio),
			height: maxDimension,
		};
	}
}
