/**
 * Manual test to check Context7 API output quality
 * This test calls the real Context7 API directly to verify output structure and content quality
 * 
 * Run with: node test/manual/context7-api-test.js
 */

const RESOLVE_API_URL = 'https://api.context7.com/v1/resolve';
const DOCS_API_URL = 'https://api.context7.com/v1/docs';

async function fetchWithTimeout(url, options, timeout = 30000) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

async function resolveLibraryId(libraryName) {
	console.log(`  → Resolving library: "${libraryName}"`);
	
	const response = await fetchWithTimeout(
		`${RESOLVE_API_URL}?name=${encodeURIComponent(libraryName)}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		}
	);

	if (!response.ok) {
		throw new Error(`Resolution failed: HTTP ${response.status}`);
	}

	const data = await response.json();
	console.log(`  ✓ Resolved to: ${data.libraryId}`);
	return data.libraryId;
}

async function fetchDocumentation(libraryId, topic, tokens = 5000) {
	console.log(`  → Fetching documentation for: ${libraryId}`);
	if (topic) console.log(`    Topic: ${topic}`);
	console.log(`    Max tokens: ${tokens}`);

	let url = `${DOCS_API_URL}?libraryId=${encodeURIComponent(libraryId)}&tokens=${tokens}`;
	if (topic) {
		url += `&topic=${encodeURIComponent(topic)}`;
	}

	const response = await fetchWithTimeout(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Documentation fetch failed: HTTP ${response.status}`);
	}

	const data = await response.json();
	console.log(`  ✓ Documentation fetched: ${data.documentation?.length || 0} characters`);
	return data.documentation;
}

function escapeXml(text) {
	if (!text) return '';
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function formatDocumentation(libraryName, libraryId, topic, documentation) {
	let xml = '<context7_documentation>\n';
	xml += `  <library_name>${escapeXml(libraryName)}</library_name>\n`;
	xml += `  <library_id>${escapeXml(libraryId)}</library_id>\n`;
	if (topic) {
		xml += `  <topic>${escapeXml(topic)}</topic>\n`;
	}
	xml += `  <documentation>\n${escapeXml(documentation)}\n  </documentation>\n`;
	xml += '</context7_documentation>';
	return xml;
}

async function runTest(testCase) {
	console.log(`\n${'='.repeat(80)}`);
	console.log(`Test: ${testCase.name}`);
	console.log(`${'='.repeat(80)}`);

	try {
		const { libraryName, topic, tokens } = testCase.params;

		// Resolve library ID if needed
		let libraryId;
		if (libraryName.startsWith('/')) {
			console.log(`  → Using provided library ID: ${libraryName}`);
			libraryId = libraryName;
		} else {
			libraryId = await resolveLibraryId(libraryName);
		}

		// Fetch documentation
		const documentation = await fetchDocumentation(libraryId, topic, tokens);

		// Format as XML
		const xmlOutput = formatDocumentation(libraryName, libraryId, topic, documentation);

		// Analyze output
		console.log(`\n--- Output Analysis ---`);
		console.log(`✓ XML length: ${xmlOutput.length} characters`);
		console.log(`✓ Documentation length: ${documentation.length} characters`);
		console.log(`✓ Documentation lines: ${documentation.split('\n').length} lines`);

		// Check for expected content
		if (testCase.expectedContent) {
			console.log(`\n--- Expected Content Check ---`);
			for (const expectedText of testCase.expectedContent) {
				const hasContent = documentation.toLowerCase().includes(expectedText.toLowerCase());
				console.log(`  ${hasContent ? '✅' : '❌'} Contains "${expectedText}"`);
			}
		}

		// Check content quality indicators
		console.log(`\n--- Content Quality Indicators ---`);
		const hasCodeBlocks = documentation.includes('```') || documentation.includes('`');
		const hasHeadings = documentation.includes('#') || documentation.includes('##');
		const hasExamples = documentation.toLowerCase().includes('example') ||
			documentation.toLowerCase().includes('usage');
		const hasLinks = documentation.includes('http') || documentation.includes('[');
		const hasNewlines = documentation.includes('\n');
		const wordCount = documentation.split(/\s+/).length;

		console.log(`  ${hasCodeBlocks ? '✅' : '❌'} Has code blocks`);
		console.log(`  ${hasHeadings ? '✅' : '❌'} Has headings`);
		console.log(`  ${hasExamples ? '✅' : '❌'} Has examples`);
		console.log(`  ${hasLinks ? '✅' : '❌'} Has links`);
		console.log(`  ${hasNewlines ? '✅' : '❌'} Has proper formatting (newlines)`);
		console.log(`  ✓ Word count: ${wordCount} words`);

		// Show sample of documentation
		console.log(`\n--- Documentation Sample (first 800 chars) ---`);
		console.log(documentation.substring(0, 800));
		if (documentation.length > 800) {
			console.log('\n... (truncated)');
		}

		// Show XML structure sample
		console.log(`\n--- XML Output Sample (first 1000 chars) ---`);
		console.log(xmlOutput.substring(0, 1000));
		if (xmlOutput.length > 1000) {
			console.log('\n... (truncated)');
		}

		console.log(`\n✅ Test completed successfully`);

	} catch (error) {
		console.error(`\n❌ Test failed:`, error.message);
		if (error.stack) {
			console.error(`Stack trace:`, error.stack);
		}
	}
}

async function main() {
	console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   Context7 API Output Quality Test                        ║
║                                                                            ║
║  This test calls the real Context7 API to verify:                         ║
║  - Output structure and XML formatting                                    ║
║  - Content quality and completeness                                       ║
║  - Presence of expected information                                       ║
║  - Documentation usefulness                                               ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

	const testCases = [
		{
			name: 'React hooks documentation',
			params: {
				libraryName: 'react',
				topic: 'hooks',
				tokens: 3000,
			},
			expectedContent: ['useState', 'useEffect', 'hook'],
		},
		{
			name: 'Express routing documentation',
			params: {
				libraryName: 'express',
				topic: 'routing',
				tokens: 2000,
			},
			expectedContent: ['route', 'get', 'post'],
		},
		{
			name: 'TypeScript general documentation',
			params: {
				libraryName: 'typescript',
				tokens: 5000,
			},
			expectedContent: ['type', 'interface'],
		},
	];

	console.log(`Running ${testCases.length} test cases...\n`);

	for (const testCase of testCases) {
		await runTest(testCase);
		// Wait a bit between requests to avoid rate limiting
		await new Promise(resolve => setTimeout(resolve, 2000));
	}

	console.log(`\n${'='.repeat(80)}`);
	console.log(`All tests completed!`);
	console.log(`${'='.repeat(80)}\n`);
}

// Run the tests
main().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});

