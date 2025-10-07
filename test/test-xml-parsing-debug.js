// Test XML parsing for multi_replace_string_in_file tool
const { multiReplaceStringTool } = require('./dist/agent/v1/tools/schema/multi-replace-string');

console.log('=== Testing Multi Replace String XML Parsing ===\n');

// Test 1: Simulate what tool-parser sends (nested XML as string)
console.log('Test 1: Nested XML format (what tool-parser sends)');
const nestedXml = `<replacement>
<filePath>test1.txt</filePath>
<oldString>old1</oldString>
<newString>new1</newString>
</replacement>
<replacement>
<filePath>test2.txt</filePath>
<oldString>old2</oldString>
<newString>new2</newString>
</replacement>`;

try {
  const result1 = multiReplaceStringTool.schema.schema.parse({
    explanation: 'Test nested XML',
    replacements: nestedXml,
  });
  console.log('✅ Success! Parsed replacements:', result1.replacements.length);
  console.log('   First replacement:', result1.replacements[0]);
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n---\n');

// Test 2: Array format (for testing)
console.log('Test 2: Array format (direct)');
try {
  const result2 = multiReplaceStringTool.schema.schema.parse({
    explanation: 'Test array',
    replacements: [
      { filePath: 'test1.txt', oldString: 'old1', newString: 'new1' },
      { filePath: 'test2.txt', oldString: 'old2', newString: 'new2' },
    ],
  });
  console.log('✅ Success! Parsed replacements:', result2.replacements.length);
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n---\n');

// Test 3: Empty string (what might be causing the error)
console.log('Test 3: Empty string');
try {
  const result3 = multiReplaceStringTool.schema.schema.parse({
    explanation: 'Test empty',
    replacements: '',
  });
  console.log('✅ Success! Parsed replacements:', result3.replacements.length);
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n---\n');

// Test 4: Undefined (what the error shows)
console.log('Test 4: Undefined (current error)');
try {
  const result4 = multiReplaceStringTool.schema.schema.parse({
    explanation: 'Test undefined',
    replacements: undefined,
  });
  console.log('✅ Success! Parsed replacements:', result4.replacements.length);
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n---\n');

// Test 5: Missing replacements field entirely
console.log('Test 5: Missing replacements field');
try {
  const result5 = multiReplaceStringTool.schema.schema.parse({
    explanation: 'Test missing',
  });
  console.log('✅ Success! Parsed replacements:', result5.replacements.length);
} catch (error) {
  console.log('❌ Failed:', error.message);
}

console.log('\n=== Test Complete ===');

