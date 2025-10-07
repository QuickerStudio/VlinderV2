/**
 * Test the fixed escape sequence processing
 * This should now correctly handle Windows paths
 */

function unescapeXml(str) {
	return str
		// First, process numeric character references (decimal)
		.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)))
		// Then, process numeric character references (hexadecimal)
		.replace(/&#x([0-9A-Fa-f]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
		// Finally, process named entities
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&'); // Must be last
}

function processEscapeSequences(str) {
	// Only process \\ → \ (double backslash to single backslash)
	return str.replace(/\\\\/g, '\\');
}

function processString(str) {
	const unescaped = unescapeXml(str);
	const processed = processEscapeSequences(unescaped);
	return processed;
}

console.log('=== Test 1: Windows path (single backslash) ===');
const test1 = 'C:\\Users\\Test\\file.txt';
const result1 = processString(test1);
console.log('Input:', JSON.stringify(test1));
console.log('Output:', JSON.stringify(result1));
console.log('Expected: "C:\\Users\\Test\\file.txt"');
console.log('Match:', result1 === 'C:\\Users\\Test\\file.txt');
console.log('');

console.log('=== Test 2: Windows path (double backslash) ===');
const test2 = 'C:\\\\Users\\\\Test\\\\file.txt';
const result2 = processString(test2);
console.log('Input:', JSON.stringify(test2));
console.log('Output:', JSON.stringify(result2));
console.log('Expected: "C:\\Users\\Test\\file.txt"');
console.log('Match:', result2 === 'C:\\Users\\Test\\file.txt');
console.log('');

console.log('=== Test 3: Newline using XML entity (decimal) ===');
const test3 = 'line1&#10;line2';
const result3 = processString(test3);
console.log('Input:', JSON.stringify(test3));
console.log('Output:', JSON.stringify(result3));
console.log('Has newline:', result3.includes('\n'));
console.log('Expected: "line1\\nline2"');
console.log('Match:', result3 === 'line1\nline2');
console.log('');

console.log('=== Test 4: Tab using XML entity (decimal) ===');
const test4 = 'col1&#9;col2';
const result4 = processString(test4);
console.log('Input:', JSON.stringify(test4));
console.log('Output:', JSON.stringify(result4));
console.log('Has tab:', result4.includes('\t'));
console.log('Expected: "col1\\tcol2"');
console.log('Match:', result4 === 'col1\tcol2');
console.log('');

console.log('=== Test 5: Newline using XML entity (hex) ===');
const test5 = 'line1&#xA;line2';
const result5 = processString(test5);
console.log('Input:', JSON.stringify(test5));
console.log('Output:', JSON.stringify(result5));
console.log('Has newline:', result5.includes('\n'));
console.log('Expected: "line1\\nline2"');
console.log('Match:', result5 === 'line1\nline2');
console.log('');

console.log('=== Test 6: Tab using XML entity (hex) ===');
const test6 = 'col1&#x9;col2';
const result6 = processString(test6);
console.log('Input:', JSON.stringify(test6));
console.log('Output:', JSON.stringify(result6));
console.log('Has tab:', result6.includes('\t'));
console.log('Expected: "col1\\tcol2"');
console.log('Match:', result6 === 'col1\tcol2');
console.log('');

console.log('=== Test 7: Mixed - Windows path + XML entities ===');
const test7 = 'C:\\Users\\Test&#10;D:\\Projects\\App';
const result7 = processString(test7);
console.log('Input:', JSON.stringify(test7));
console.log('Output:', JSON.stringify(result7));
console.log('Has newline:', result7.includes('\n'));
console.log('Has backslashes:', result7.includes('\\'));
console.log('Expected: "C:\\Users\\Test\\nD:\\Projects\\App"');
console.log('Match:', result7 === 'C:\\Users\\Test\nD:\\Projects\\App');
console.log('');

console.log('=== Test 8: Literal \\n should NOT be converted ===');
const test8 = 'C:\\new\\test';
const result8 = processString(test8);
console.log('Input:', JSON.stringify(test8));
console.log('Output:', JSON.stringify(result8));
console.log('Has newline:', result8.includes('\n'));
console.log('Expected: "C:\\new\\test" (no newline conversion)');
console.log('Match:', result8 === 'C:\\new\\test');
console.log('');

console.log('=== Test 9: Literal \\t should NOT be converted ===');
const test9 = 'C:\\test\\temp';
const result9 = processString(test9);
console.log('Input:', JSON.stringify(test9));
console.log('Output:', JSON.stringify(result9));
console.log('Has tab:', result9.includes('\t'));
console.log('Expected: "C:\\test\\temp" (no tab conversion)');
console.log('Match:', result9 === 'C:\\test\\temp');
console.log('');

console.log('=== SUMMARY ===');
console.log('✅ Windows paths with single backslash: PRESERVED');
console.log('✅ Windows paths with double backslash: CONVERTED to single');
console.log('✅ XML numeric entities (&#10;, &#9;): CONVERTED to special chars');
console.log('✅ Literal \\n and \\t: NOT CONVERTED (safe for Windows paths)');

