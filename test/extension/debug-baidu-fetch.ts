/**
 * Debug script to analyze Baidu Baike HTML structure
 */

async function debugBaiduFetch() {
	const url = 'https://baike.baidu.com/item/JavaScript';
	
	console.log('Fetching:', url);
	const response = await fetch(url);
	const html = await response.text();
	
	console.log('\n=== HTML Stats ===');
	console.log('Total HTML length:', html.length);
	
	// Test different content extraction patterns
	const patterns = [
		{ name: '<main>', regex: /<main[^>]*>([\s\S]*?)<\/main>/i },
		{ name: '<article>', regex: /<article[^>]*>([\s\S]*?)<\/article>/i },
		{ name: 'class="*content*"', regex: /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i },
		{ name: 'id="*content*"', regex: /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i },
		{ name: 'class="*main*"', regex: /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/i },
		{ name: 'id="*main*"', regex: /<div[^>]*id="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/i },
		{ name: '<body>', regex: /<body[^>]*>([\s\S]*?)<\/body>/i },
	];
	
	console.log('\n=== Pattern Matching Results ===');
	for (const pattern of patterns) {
		const match = html.match(pattern.regex);
		if (match) {
			console.log(`✅ ${pattern.name}: ${match[1].length} chars`);
			if (match[1].length < 1000) {
				console.log(`   Preview: ${match[1].substring(0, 200)}...`);
			}
		} else {
			console.log(`❌ ${pattern.name}: No match`);
		}
	}
	
	// Save HTML for manual inspection
	const fs = require('fs');
	const path = require('path');
	const outputPath = path.join(__dirname, '../../Pattern-Search-test-file/baidu-baike-debug.html');
	fs.writeFileSync(outputPath, html);
	console.log('\n✅ Full HTML saved to:', outputPath);
}

debugBaiduFetch().catch(console.error);

