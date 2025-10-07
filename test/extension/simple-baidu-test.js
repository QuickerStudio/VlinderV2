/**
 * Simple test to check Baidu Baike HTML structure
 */

async function test() {
	try {
		console.log('Fetching Baidu Baike...');
		const response = await fetch('https://baike.baidu.com/item/JavaScript');
		const html = await response.text();
		
		console.log('\n=== HTML Stats ===');
		console.log('Total length:', html.length);
		
		// Test patterns
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		console.log('\n<body> match:', bodyMatch ? bodyMatch[1].length + ' chars' : 'NO MATCH');
		
		const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
		console.log('<main> match:', mainMatch ? mainMatch[1].length + ' chars' : 'NO MATCH');
		
		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
		console.log('<article> match:', articleMatch ? articleMatch[1].length + ' chars' : 'NO MATCH');
		
		// Check for common Baidu Baike containers
		const lemmaMatch = html.match(/<div[^>]*class="[^"]*lemma[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
		console.log('class="*lemma*" match:', lemmaMatch ? lemmaMatch[1].length + ' chars' : 'NO MATCH');
		
		// Save for inspection
		const fs = require('fs');
		fs.writeFileSync('Pattern-Search-test-file/baidu-debug.html', html);
		console.log('\n✅ Saved to Pattern-Search-test-file/baidu-debug.html');
		
		// Show first 2000 chars
		console.log('\n=== First 2000 chars ===');
		console.log(html.substring(0, 2000));
		
	} catch (error) {
		console.error('Error:', error.message);
	}
}

test();

