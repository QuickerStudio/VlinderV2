// Test to understand how tool-parser handles nested XML for replacements parameter

const xml = `<tool name="multi_replace_string_in_file">
  <explanation>Test replacements</explanation>
  <replacements>
    <replacement>
      <filePath>test1.txt</filePath>
      <oldString>old1</oldString>
      <newString>new1</newString>
    </replacement>
    <replacement>
      <filePath>test2.txt</filePath>
      <oldString>old2</oldString>
      <newString>new2</newString>
    </replacement>
  </replacements>
</tool>`;

console.log('Testing XML parsing...\n');
console.log('Input XML:');
console.log(xml);
console.log('\n---\n');

// Simulate what tool-parser does:
// 1. When it sees <replacements>, it sets currentParam = 'replacements'
// 2. Then it collects everything until </replacements> as a string
// 3. This string includes the nested <replacement> tags

// Extract what would be in the replacements parameter
const replacementsMatch = xml.match(/<replacements>([\s\S]*?)<\/replacements>/);
if (replacementsMatch) {
    const replacementsContent = replacementsMatch[1];
    console.log('What tool-parser passes to schema (replacements parameter):');
    console.log(JSON.stringify(replacementsContent));
    console.log('\n---\n');
    
    // Now test our XML parsing function
    const replacementRegex = /<replacement>([\s\S]*?)<\/replacement>/g;
    const replacements = [];
    let match;
    
    while ((match = replacementRegex.exec(replacementsContent)) !== null) {
        const replacementContent = match[1];
        
        const filePathMatch = replacementContent.match(/<filePath>([\s\S]*?)<\/filePath>/);
        const oldStringMatch = replacementContent.match(/<oldString>([\s\S]*?)<\/oldString>/);
        const newStringMatch = replacementContent.match(/<newString>([\s\S]*?)<\/newString>/);
        
        if (filePathMatch && oldStringMatch && newStringMatch) {
            replacements.push({
                filePath: filePathMatch[1].trim(),
                oldString: oldStringMatch[1],
                newString: newStringMatch[1],
            });
        }
    }
    
    console.log('Parsed replacements:');
    console.log(JSON.stringify(replacements, null, 2));
    console.log('\nSuccess! Parsed', replacements.length, 'replacements');
} else {
    console.log('ERROR: Could not find <replacements> tag');
}

