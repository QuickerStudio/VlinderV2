/**
 * 手动测试脚本 - 测试真实网站抓取质量
 * 运行: node -r ts-node/register test/extension/manual-fetch-test.ts
 */

import { FetchWebpageTool } from '../../extension/src/agent/v1/tools/runners/fetch-webpage.tool';

// Mock vscode
(global as any).vscode = {
	workspace: {
		workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
	},
};

const mockAsk = async () => ({ response: '', text: '', images: [] });
const mockUpdateAsk = async () => {};
const mockSay = async () => {};
const mockOptions = {
	cwd: '/test/workspace',
	alwaysAllowReadOnly: false,
	alwaysAllowWriteOnly: false,
	MainAgent: {} as any,
	setRunningProcessId: () => {},
};

async function testWebsite(url: string, query?: string) {
	console.log(`\n${'='.repeat(80)}`);
	console.log(`测试网站: ${url}`);
	if (query) console.log(`查询词: ${query}`);
	console.log('='.repeat(80));

	const tool = new FetchWebpageTool(
		{
			name: 'fetch_webpage',
			input: { urls: [url], query },
			ask: mockAsk,
			updateAsk: mockUpdateAsk,
			say: mockSay,
			ts: Date.now(),
			id: 'test-id',
			isLastWriteToFile: false,
		},
		mockOptions
	);

	const startTime = Date.now();
	const result = await tool.execute();
	const duration = Date.now() - startTime;

	console.log(`\n状态: ${result.status}`);
	console.log(`耗时: ${duration}ms`);
	console.log(`内容长度: ${result.text?.length || 0} 字符`);
	
	if (result.status === 'success') {
		console.log(`\n前500字符预览:`);
		console.log(result.text?.substring(0, 500));
		
		// 分析内容质量
		const text = result.text || '';
		const hasMarkdown = text.includes('#') || text.includes('*') || text.includes('[');
		const hasScript = text.includes('<script') || text.includes('</script>');
		const hasStyle = text.includes('<style') || text.includes('</style>');
		const hasXML = text.includes('<webpage_results>');
		
		console.log(`\n内容质量分析:`);
		console.log(`- Markdown格式: ${hasMarkdown ? '✓' : '✗'}`);
		console.log(`- 无Script标签: ${!hasScript ? '✓' : '✗'}`);
		console.log(`- 无Style标签: ${!hasStyle ? '✓' : '✗'}`);
		console.log(`- XML包装: ${hasXML ? '✓' : '✗'}`);
		
		if (query) {
			const hasQuery = text.toLowerCase().includes(query.toLowerCase());
			const hasRelevantSections = text.includes('<relevant_sections');
			console.log(`- 包含查询词: ${hasQuery ? '✓' : '✗'}`);
			console.log(`- 相关片段: ${hasRelevantSections ? '✓' : '✗'}`);
		}
	} else {
		console.log(`\n错误信息:`);
		console.log(result.text);
	}
}

async function main() {
	console.log('开始测试真实网站抓取质量...\n');

	// 测试中文技术网站
	await testWebsite('https://www.csdn.net');
	await testWebsite('https://juejin.cn');
	await testWebsite('https://baike.baidu.com/item/JavaScript');
	await testWebsite('https://www.runoob.com/js/js-intro.html');
	
	// 测试带query的情况
	await testWebsite('https://baike.baidu.com/item/JavaScript', '函数');
	await testWebsite('https://www.runoob.com/js/js-intro.html', '变量');

	console.log('\n\n测试完成！');
}

main().catch(console.error);

