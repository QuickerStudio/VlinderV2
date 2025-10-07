/**
 * Test escape sequence processing in multi-replace-string tool
 */

function processEscapeSequences(str) {
	return str
		.replace(/\\n/g, '\n')
		.replace(/\\r/g, '\r')
		.replace(/\\t/g, '\t')
		.replace(/\\b/g, '\b')
		.replace(/\\f/g, '\f')
		.replace(/\\v/g, '\v')
		.replace(/\\0/g, '\0')
		.replace(/\\\\/g, '\\'); // Must be last
}

console.log('=== Test 1: Basic \\n processing ===');
const input1 = 'line1\\nline2';
const output1 = processEscapeSequences(input1);
console.log('Input:', JSON.stringify(input1));
console.log('Output:', JSON.stringify(output1));
console.log('Has newline:', output1.includes('\n'));
console.log('');

console.log('=== Test 2: XML extraction ===');
const xml = `<oldString>line1\\nline2</oldString>`;
const match = xml.match(/<oldString>([\s\S]*?)<\/oldString>/);
if (match) {
	const raw = match[1];
	const processed = processEscapeSequences(raw);
	console.log('Raw from XML:', JSON.stringify(raw));
	console.log('Processed:', JSON.stringify(processed));
	console.log('Has newline:', processed.includes('\n'));
}
console.log('');

console.log('=== Test 3: File matching ===');
const fileContent = 'line1\nline2\nline3';
const searchFor = processEscapeSequences('line1\\nline2');
console.log('File content:', JSON.stringify(fileContent));
console.log('Search for:', JSON.stringify(searchFor));
console.log('Match found:', fileContent.includes(searchFor));
console.log('Match index:', fileContent.indexOf(searchFor));

