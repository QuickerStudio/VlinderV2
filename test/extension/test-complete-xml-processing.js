/**
 * Test complete XML processing pipeline:
 * 1. XML entity unescaping (&lt;, &gt;, &amp;, etc.)
 * 2. Escape sequence processing (\n, \t, \\, etc.)
 */

function unescapeXml(str) {
	return str
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&'); // Must be last
}

function processEscapeSequences(str) {
	const placeholder = '\x00BACKSLASH\x00';
	return str
		.replace(/\\\\/g, placeholder)
		.replace(/\\n/g, '\n')
		.replace(/\\r/g, '\r')
		.replace(/\\t/g, '\t')
		.replace(/\\b/g, '\b')
		.replace(/\\f/g, '\f')
		.replace(/\\v/g, '\v')
		.replace(/\\0/g, '\0')
		.replace(new RegExp(placeholder, 'g'), '\\');
}

function processString(str) {
	const unescaped = unescapeXml(str);
	const processed = processEscapeSequences(unescaped);
	return processed;
}

console.log('=== Test 1: Basic newline ===');
const test1 = 'line1\\nline2';
const result1 = processString(test1);
console.log('Input:', JSON.stringify(test1));
console.log('Output:', JSON.stringify(result1));
console.log('Has newline:', result1.includes('\n'));
console.log('');

console.log('=== Test 2: XML entities + newline ===');
const test2 = 'line1\\nline2 &amp; more';
const result2 = processString(test2);
console.log('Input:', JSON.stringify(test2));
console.log('Output:', JSON.stringify(result2));
console.log('Has newline:', result2.includes('\n'));
console.log('Has &:', result2.includes('&'));
console.log('');

console.log('=== Test 3: XML entities only ===');
const test3 = '&lt;tag&gt; content &amp; more';
const result3 = processString(test3);
console.log('Input:', JSON.stringify(test3));
console.log('Output:', JSON.stringify(result3));
console.log('Has <:', result3.includes('<'));
console.log('Has >:', result3.includes('>'));
console.log('Has &:', result3.includes('&'));
console.log('');

console.log('=== Test 4: Backslash handling ===');
const test4 = 'path\\\\to\\\\file';
const result4 = processString(test4);
console.log('Input:', JSON.stringify(test4));
console.log('Output:', JSON.stringify(result4));
console.log('Expected: path\\to\\file');
console.log('Match:', result4 === 'path\\to\\file');
console.log('');

console.log('=== Test 5: Complex case ===');
const test5 = 'line1\\nline2\\ttab &lt;tag&gt; &amp; backslash\\\\here';
const result5 = processString(test5);
console.log('Input:', JSON.stringify(test5));
console.log('Output:', JSON.stringify(result5));
console.log('Has newline:', result5.includes('\n'));
console.log('Has tab:', result5.includes('\t'));
console.log('Has <tag>:', result5.includes('<tag>'));
console.log('Has &:', result5.includes('&'));
console.log('Has single backslash:', result5.includes('backslash\\here'));
console.log('');

console.log('=== Test 6: File matching simulation ===');
const fileContent = 'line1\nline2\nline3';
const searchFor = processString('line1\\nline2');
console.log('File content:', JSON.stringify(fileContent));
console.log('Search for:', JSON.stringify(searchFor));
console.log('Match found:', fileContent.includes(searchFor));
console.log('Match index:', fileContent.indexOf(searchFor));

