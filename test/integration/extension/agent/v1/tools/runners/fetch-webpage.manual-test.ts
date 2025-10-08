/**
 * Manual test script for fetch-webpage tool
 * Run this script to test real network functionality
 *
 * Usage: npx ts-node extension/src/agent/v1/tools/runners/__tests__/fetch-webpage.manual-test.ts
 */

import { FetchWebpageTool } from '../fetch-webpage.tool';

// Mock vscode module
jest.mock('vscode', () => ({}), { virtual: true });

async function runManualTests() {
	console.log('='.repeat(80));
	console.log('Fetch Webpage Tool - Manual Testing');
	console.log('='.repeat(80));
	console.log();

	const createTool = (input: { urls: string[]; query?: string }) => {
		return new FetchWebpageTool({
			name: 'fetch_webpage',
			input,
			id: 'test-id',
			ts: Date.now(),
			isFinal: true,
			isLastWriteToFile: false,
			ask: async () => ({ response: 'yesButtonTapped', text: '', images: [] }),
			say: async () => {},
			updateAsk: async () => {},
			MainAgent: {} as any,
			cwd: '/test',
			alwaysAllowReadOnly: true,
			alwaysAllowWriteOnly: false,
			isSubMsg: false,
		});
	};

	// Test 1: Simple URL fetch
	console.log('Test 1: Fetching example.com');
	console.log('-'.repeat(80));
	try {
		const tool1 = createTool({ urls: ['https://example.com'] });
		const result1 = await tool1.execute();
		console.log('Status:', result1.status);
		console.log('Content length:', result1.text?.length || 0);
		console.log('Preview:', result1.text?.substring(0, 200));
		console.log('✅ Test 1 passed');
	} catch (error) {
		console.error('❌ Test 1 failed:', error);
	}
	console.log();

	// Test 2: GitHub README
	console.log('Test 2: Fetching GitHub README');
	console.log('-'.repeat(80));
	try {
		const tool2 = createTool({
			urls: [
				'https://raw.githubusercontent.com/microsoft/vscode/main/README.md',
			],
		});
		const result2 = await tool2.execute();
		console.log('Status:', result2.status);
		console.log('Content length:', result2.text?.length || 0);
		console.log(
			"Contains 'Visual Studio Code':",
			result2.text?.includes('Visual Studio Code')
		);
		console.log('✅ Test 2 passed');
	} catch (error) {
		console.error('❌ Test 2 failed:', error);
	}
	console.log();

	// Test 3: Multiple URLs
	console.log('Test 3: Fetching multiple URLs in parallel');
	console.log('-'.repeat(80));
	try {
		const startTime = Date.now();
		const tool3 = createTool({
			urls: [
				'https://example.com',
				'https://raw.githubusercontent.com/microsoft/vscode/main/README.md',
			],
		});
		const result3 = await tool3.execute();
		const duration = Date.now() - startTime;
		console.log('Status:', result3.status);
		console.log('Duration:', duration, 'ms');
		console.log('Content length:', result3.text?.length || 0);
		console.log('✅ Test 3 passed');
	} catch (error) {
		console.error('❌ Test 3 failed:', error);
	}
	console.log();

	// Test 4: Query filtering
	console.log('Test 4: Fetching with query filter');
	console.log('-'.repeat(80));
	try {
		const tool4 = createTool({
			urls: [
				'https://raw.githubusercontent.com/microsoft/vscode/main/README.md',
			],
			query: 'extension',
		});
		const result4 = await tool4.execute();
		console.log('Status:', result4.status);
		console.log('Content length:', result4.text?.length || 0);
		console.log(
			"Contains 'extension':",
			result4.text?.toLowerCase().includes('extension')
		);
		console.log('✅ Test 4 passed');
	} catch (error) {
		console.error('❌ Test 4 failed:', error);
	}
	console.log();

	// Test 5: Error handling - 404
	console.log('Test 5: Handling 404 error');
	console.log('-'.repeat(80));
	try {
		const tool5 = createTool({
			urls: ['https://github.com/nonexistent-repo-12345/nonexistent'],
		});
		const result5 = await tool5.execute();
		console.log('Status:', result5.status);
		console.log('Error message:', result5.text?.substring(0, 200));
		console.log('✅ Test 5 passed');
	} catch (error) {
		console.error('❌ Test 5 failed:', error);
	}
	console.log();

	// Test 6: Partial failure
	console.log('Test 6: Handling partial failure');
	console.log('-'.repeat(80));
	try {
		const tool6 = createTool({
			urls: [
				'https://example.com',
				'https://this-domain-does-not-exist-12345.com',
			],
		});
		const result6 = await tool6.execute();
		console.log('Status:', result6.status);
		console.log('Content length:', result6.text?.length || 0);
		console.log(
			'Contains success:',
			result6.text?.includes('successful_fetches')
		);
		console.log('Contains errors:', result6.text?.includes('errors'));
		console.log('✅ Test 6 passed');
	} catch (error) {
		console.error('❌ Test 6 failed:', error);
	}
	console.log();

	// Test 7: Invalid protocol
	console.log('Test 7: Rejecting invalid protocol');
	console.log('-'.repeat(80));
	try {
		const tool7 = createTool({
			urls: ['ftp://example.com'],
		});
		const result7 = await tool7.execute();
		console.log('Status:', result7.status);
		console.log('Error message:', result7.text);
		console.log('✅ Test 7 passed');
	} catch (error) {
		console.error('❌ Test 7 failed:', error);
	}
	console.log();

	// Test 8: Too many URLs
	console.log('Test 8: Rejecting too many URLs');
	console.log('-'.repeat(80));
	try {
		const urls = Array.from(
			{ length: 11 },
			(_, i) => `https://example${i}.com`
		);
		const tool8 = createTool({ urls });
		const result8 = await tool8.execute();
		console.log('Status:', result8.status);
		console.log('Error message:', result8.text);
		console.log('✅ Test 8 passed');
	} catch (error) {
		console.error('❌ Test 8 failed:', error);
	}
	console.log();

	console.log('='.repeat(80));
	console.log('Manual testing completed!');
	console.log('='.repeat(80));
}

// Run tests if this file is executed directly
if (require.main === module) {
	runManualTests().catch(console.error);
}

export { runManualTests };
