/**
 * React测试：FastEditorToolBlock组件
 * 测试fast_editor工具的前端UI组件
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// 模拟组件依赖
const MockFiles = () => <div data-testid="files-icon">Files</div>;
const MockChevronDown = () => <div data-testid="chevron-down">ChevronDown</div>;
const MockChevronUp = () => <div data-testid="chevron-up">ChevronUp</div>;
const MockCheckCircle2 = () => (
	<div data-testid="check-circle">CheckCircle2</div>
);
const MockXCircle = () => <div data-testid="x-circle">XCircle</div>;
const MockAlertCircle = () => <div data-testid="alert-circle">AlertCircle</div>;

const MockButton = ({ children, onClick, variant, size, className }: any) => (
	<button
		data-testid="toggle-button"
		onClick={onClick}
		data-variant={variant}
		data-size={size}
		className={className}
	>
		{children}
	</button>
);

const MockBadge = ({ children, variant, className }: any) => (
	<span data-testid="badge" data-variant={variant} className={className}>
		{children}
	</span>
);

// 创建测试版本的FastEditorToolBlock组件
interface FastEditorTool {
	edits: Array<{
		path: string;
		oldString: string;
		newString: string;
	}>;
	explanation?: string;
	results?: Array<{
		path: string;
		success: boolean;
		error?: string;
	}>;
	successCount?: number;
	failureCount?: number;
}

interface FastEditorToolProps extends FastEditorTool {
	approvalState?: 'pending' | 'loading' | 'approved' | 'error' | 'rejected';
	ts: number;
}

const FastEditorToolBlock: React.FC<FastEditorToolProps> = ({
	edits,
	explanation,
	results,
	successCount,
	failureCount,
	approvalState,
	ts,
}) => {
	const [isExpanded, setIsExpanded] = React.useState(true);

	// Determine the visual state based on approval state
	const getStateStyles = () => {
		switch (approvalState) {
			case 'pending':
				return {
					borderColor: 'border-yellow-500/50',
					bgColor: 'bg-yellow-50/50 dark:bg-yellow-950/20',
					iconColor: 'text-yellow-600 dark:text-yellow-400',
					headerBg: 'bg-yellow-100/50 dark:bg-yellow-900/30',
				};
			case 'loading':
				return {
					borderColor: 'border-blue-500/50',
					bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
					iconColor: 'text-blue-600 dark:text-blue-400',
					headerBg: 'bg-blue-100/50 dark:bg-blue-900/30',
				};
			case 'error':
			case 'rejected':
				return {
					borderColor: 'border-red-500/50',
					bgColor: 'bg-red-50/50 dark:bg-red-950/20',
					iconColor: 'text-red-600 dark:text-red-400',
					headerBg: 'bg-red-100/50 dark:bg-red-900/30',
				};
			case 'approved':
			default:
				return {
					borderColor: 'border-green-500/50',
					bgColor: 'bg-green-50/50 dark:bg-green-950/20',
					iconColor: 'text-green-600 dark:text-green-400',
					headerBg: 'bg-green-100/50 dark:bg-green-900/30',
				};
		}
	};

	const styles = getStateStyles();

	// Get status message
	const getStatusMessage = () => {
		if (approvalState === 'pending') {
			return 'Awaiting approval';
		} else if (approvalState === 'loading') {
			return 'Applying edits...';
		} else if (approvalState === 'rejected') {
			return 'Rejected by user';
		} else if (results) {
			if (failureCount === 0) {
				return `Successfully edited ${successCount} file${successCount !== 1 ? 's' : ''}`;
			} else if (successCount === 0) {
				return `Failed to edit ${failureCount} file${failureCount !== 1 ? 's' : ''}`;
			} else {
				return `Edited ${successCount} of ${edits.length} files (${failureCount} failed)`;
			}
		} else {
			return `Edit ${edits.length} file${edits.length !== 1 ? 's' : ''}`;
		}
	};

	return (
		<div
			data-testid="edit-files-tool"
			className={`my-3 rounded-lg border-2 overflow-hidden transition-all duration-200 ${styles.borderColor} ${styles.bgColor}`}
		>
			{/* Header */}
			<div
				data-testid="tool-header"
				className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none ${styles.headerBg}`}
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center space-x-3">
					<MockFiles />
					<div className="flex flex-col">
						<span className="font-semibold text-sm" data-testid="tool-title">
							Edit Files
						</span>
						<span
							className="text-xs text-muted-foreground"
							data-testid="status-message"
						>
							{getStatusMessage()}
						</span>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{results && (
						<div
							className="flex items-center space-x-2"
							data-testid="result-badges"
						>
							{successCount! > 0 && (
								<MockBadge
									variant="outline"
									className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
								>
									{successCount} ✓
								</MockBadge>
							)}
							{failureCount! > 0 && (
								<MockBadge
									variant="outline"
									className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
								>
									{failureCount} ✗
								</MockBadge>
							)}
						</div>
					)}
					<MockButton variant="ghost" size="sm" className="h-8 w-8 p-0">
						{isExpanded ? <MockChevronUp /> : <MockChevronDown />}
					</MockButton>
				</div>
			</div>

			{/* Content */}
			{isExpanded && (
				<div className="px-4 py-3 space-y-3" data-testid="tool-content">
					{/* Explanation */}
					{explanation && (
						<div
							className="text-sm text-muted-foreground italic border-l-2 border-border pl-3"
							data-testid="explanation"
						>
							{explanation}
						</div>
					)}

					{/* Loading State */}
					{approvalState === 'loading' && (
						<div
							className="flex items-center space-x-2"
							data-testid="loading-state"
						>
							<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
							<span className="text-sm text-muted-foreground">
								Applying edits...
							</span>
						</div>
					)}

					{/* Edits List */}
					<div className="space-y-2" data-testid="edits-list">
						{edits.map((edit, index) => {
							const result = results?.find((r) => r.path === edit.path);
							const isSuccess = result?.success;
							const hasResult = result !== undefined;

							return (
								<div
									key={index}
									data-testid={`edit-item-${index}`}
									className={`rounded-md border p-3 space-y-2 ${
										hasResult
											? isSuccess
												? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20'
												: 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20'
											: 'border-border bg-background/50'
									}`}
								>
									{/* File Path */}
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											{hasResult && (
												<>
													{isSuccess ? <MockCheckCircle2 /> : <MockXCircle />}
												</>
											)}
											<span
												className="font-mono text-sm font-medium"
												data-testid={`file-path-${index}`}
											>
												{edit.path}
											</span>
										</div>
										<MockBadge variant="outline" className="text-xs">
											{index + 1} of {edits.length}
										</MockBadge>
									</div>

									{/* Replacement Details */}
									<div className="space-y-1 text-xs">
										<div className="flex items-start space-x-2">
											<span className="text-muted-foreground shrink-0">
												Find:
											</span>
											<code
												className="bg-muted px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 break-all"
												data-testid={`old-string-${index}`}
											>
												{edit.oldString.length > 100
													? `${edit.oldString.substring(0, 100)}...`
													: edit.oldString}
											</code>
										</div>
										<div className="flex items-start space-x-2">
											<span className="text-muted-foreground shrink-0">
												Replace:
											</span>
											<code
												className="bg-muted px-1.5 py-0.5 rounded text-green-600 dark:text-green-400 break-all"
												data-testid={`new-string-${index}`}
											>
												{edit.newString.length > 100
													? `${edit.newString.substring(0, 100)}...`
													: edit.newString}
											</code>
										</div>
									</div>

									{/* Error Message */}
									{result && !result.success && result.error && (
										<div
											className="flex items-start space-x-2 mt-2 pt-2 border-t border-red-300 dark:border-red-700"
											data-testid={`error-message-${index}`}
										>
											<MockAlertCircle />
											<span className="text-xs text-red-600 dark:text-red-400">
												{result.error}
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Rejected State */}
					{approvalState === 'rejected' && (
						<div
							className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-2"
							data-testid="rejected-message"
						>
							<MockXCircle />
							<span>User rejected the file edits</span>
						</div>
					)}

					{/* Timestamp */}
					<div
						className="text-xs text-muted-foreground pt-2 border-t border-border/30"
						data-testid="timestamp"
					>
						{new Date(ts).toLocaleTimeString()}
					</div>
				</div>
			)}
		</div>
	);
};

describe('FastEditorToolBlock', () => {
	const defaultProps: FastEditorToolProps = {
		edits: [
			{
				path: 'src/components/Header.tsx',
				oldString:
					"import { Button } from '../../../../../../extension/src/agent/v1/tools/../../../../../extension/src/agent/v1/tools/runners/Button'",
				newString: "import { Button } from '@/components/ui/button'",
			},
			{
				path: 'src/components/Footer.tsx',
				oldString:
					"import { Button } from '../../../../../../extension/src/agent/v1/tools/../../../../../extension/src/agent/v1/tools/runners/Button'",
				newString: "import { Button } from '@/components/ui/button'",
			},
		],
		explanation:
			'Update all Button imports to use the new centralized UI component path',
		approvalState: 'pending',
		ts: 12345,
	};

	describe('基本渲染', () => {
		test('应该渲染所有基本信息', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			expect(screen.getByTestId('tool-title')).toHaveTextContent('Edit Files');
			expect(screen.getByTestId('explanation')).toHaveTextContent(
				defaultProps.explanation!
			);
			expect(screen.getByTestId('edits-list')).toBeInTheDocument();
		});

		test('应该显示正确的文件数量', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Edit 2 files'
			);
		});

		test('应该显示所有编辑项', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			expect(screen.getByTestId('edit-item-0')).toBeInTheDocument();
			expect(screen.getByTestId('edit-item-1')).toBeInTheDocument();
			expect(screen.getByTestId('file-path-0')).toHaveTextContent(
				'src/components/Header.tsx'
			);
			expect(screen.getByTestId('file-path-1')).toHaveTextContent(
				'src/components/Footer.tsx'
			);
		});
	});

	describe('状态显示', () => {
		test('应该显示pending状态', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Awaiting approval'
			);
		});

		test('应该显示loading状态', () => {
			const loadingProps = {
				...defaultProps,
				approvalState: 'loading' as const,
			};

			render(<FastEditorToolBlock {...loadingProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Applying edits...'
			);
			expect(screen.getByTestId('loading-state')).toBeInTheDocument();
		});

		test('应该显示rejected状态', () => {
			const rejectedProps = {
				...defaultProps,
				approvalState: 'rejected' as const,
			};

			render(<FastEditorToolBlock {...rejectedProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Rejected by user'
			);
			expect(screen.getByTestId('rejected-message')).toBeInTheDocument();
		});

		test('应该显示成功状态', () => {
			const successProps = {
				...defaultProps,
				approvalState: 'approved' as const,
				results: [
					{ path: 'src/components/Header.tsx', success: true },
					{ path: 'src/components/Footer.tsx', success: true },
				],
				successCount: 2,
				failureCount: 0,
			};

			render(<FastEditorToolBlock {...successProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Successfully edited 2 files'
			);
			expect(screen.getByTestId('result-badges')).toBeInTheDocument();
		});

		test('应该显示部分成功状态', () => {
			const partialProps = {
				...defaultProps,
				approvalState: 'error' as const,
				results: [
					{ path: 'src/components/Header.tsx', success: true },
					{
						path: 'src/components/Footer.tsx',
						success: false,
						error: 'File not found',
					},
				],
				successCount: 1,
				failureCount: 1,
			};

			render(<FastEditorToolBlock {...partialProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Edited 1 of 2 files (1 failed)'
			);
		});

		test('应该显示全部失败状态', () => {
			const failedProps = {
				...defaultProps,
				approvalState: 'error' as const,
				results: [
					{
						path: 'src/components/Header.tsx',
						success: false,
						error: 'File not found',
					},
					{
						path: 'src/components/Footer.tsx',
						success: false,
						error: 'String not found',
					},
				],
				successCount: 0,
				failureCount: 2,
			};

			render(<FastEditorToolBlock {...failedProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Failed to edit 2 files'
			);
		});
	});

	describe('编辑详情显示', () => {
		test('应该显示查找和替换字符串', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			expect(screen.getByTestId('old-string-0')).toHaveTextContent(
				"import { Button } from '../../../../../../extension/src/agent/v1/tools/../../../../../extension/src/agent/v1/tools/runners/Button'"
			);
			expect(screen.getByTestId('new-string-0')).toHaveTextContent(
				"import { Button } from '@/components/ui/button'"
			);
		});

		test('应该截断长字符串', () => {
			const longStringProps = {
				...defaultProps,
				edits: [
					{
						path: 'test.ts',
						oldString: 'a'.repeat(150),
						newString: 'b'.repeat(150),
					},
				],
			};

			render(<FastEditorToolBlock {...longStringProps} />);

			expect(screen.getByTestId('old-string-0')).toHaveTextContent(
				'a'.repeat(100) + '...'
			);
			expect(screen.getByTestId('new-string-0')).toHaveTextContent(
				'b'.repeat(100) + '...'
			);
		});

		test('应该显示错误消息', () => {
			const errorProps = {
				...defaultProps,
				results: [
					{
						path: 'src/components/Header.tsx',
						success: false,
						error: 'File not found',
					},
					{ path: 'src/components/Footer.tsx', success: true },
				],
				successCount: 1,
				failureCount: 1,
			};

			render(<FastEditorToolBlock {...errorProps} />);

			expect(screen.getByTestId('error-message-0')).toBeInTheDocument();
			expect(screen.getByTestId('error-message-0')).toHaveTextContent(
				'File not found'
			);
		});
	});

	describe('交互功能', () => {
		test('应该支持展开/收起', async () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			// 初始状态应该是展开的
			expect(screen.getByTestId('tool-content')).toBeInTheDocument();

			// 点击头部收起
			fireEvent.click(screen.getByTestId('tool-header'));

			await waitFor(() => {
				expect(screen.queryByTestId('tool-content')).not.toBeInTheDocument();
			});

			// 再次点击展开
			fireEvent.click(screen.getByTestId('tool-header'));

			await waitFor(() => {
				expect(screen.getByTestId('tool-content')).toBeInTheDocument();
			});
		});

		test('应该显示时间戳', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			expect(screen.getByTestId('timestamp')).toBeInTheDocument();
		});
	});

	describe('边界情况', () => {
		test('应该处理单个文件编辑', () => {
			const singleFileProps = {
				...defaultProps,
				edits: [
					{
						path: 'single.ts',
						oldString: 'old',
						newString: 'new',
					},
				],
			};

			render(<FastEditorToolBlock {...singleFileProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Edit 1 file'
			);
		});

		test('应该处理没有explanation的情况', () => {
			const noExplanationProps = {
				...defaultProps,
				explanation: undefined,
			};

			render(<FastEditorToolBlock {...noExplanationProps} />);

			expect(screen.queryByTestId('explanation')).not.toBeInTheDocument();
		});

		test('应该处理空的编辑数组', () => {
			const emptyEditsProps = {
				...defaultProps,
				edits: [],
			};

			render(<FastEditorToolBlock {...emptyEditsProps} />);

			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Edit 0 files'
			);
		});

		test('应该正确处理单复数形式', () => {
			// 测试单数
			const singleProps = {
				...defaultProps,
				edits: [defaultProps.edits[0]],
				results: [{ path: 'src/components/Header.tsx', success: true }],
				successCount: 1,
				failureCount: 0,
			};

			render(<FastEditorToolBlock {...singleProps} />);
			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Successfully edited 1 file'
			);

			// 测试复数
			const { rerender } = render(<div />);
			const pluralProps = {
				...defaultProps,
				results: [
					{ path: 'src/components/Header.tsx', success: true },
					{ path: 'src/components/Footer.tsx', success: true },
				],
				successCount: 2,
				failureCount: 0,
			};

			rerender(<FastEditorToolBlock {...pluralProps} />);
			expect(screen.getByTestId('status-message')).toHaveTextContent(
				'Successfully edited 2 files'
			);
		});
	});

	describe('样式状态', () => {
		test('应该应用正确的pending样式', () => {
			render(<FastEditorToolBlock {...defaultProps} />);

			const toolElement = screen.getByTestId('edit-files-tool');
			expect(toolElement).toHaveClass('border-yellow-500/50');
		});

		test('应该应用正确的loading样式', () => {
			const loadingProps = {
				...defaultProps,
				approvalState: 'loading' as const,
			};

			render(<FastEditorToolBlock {...loadingProps} />);

			const toolElement = screen.getByTestId('edit-files-tool');
			expect(toolElement).toHaveClass('border-blue-500/50');
		});

		test('应该应用正确的success样式', () => {
			const successProps = {
				...defaultProps,
				approvalState: 'approved' as const,
			};

			render(<FastEditorToolBlock {...successProps} />);

			const toolElement = screen.getByTestId('edit-files-tool');
			expect(toolElement).toHaveClass('border-green-500/50');
		});

		test('应该应用正确的error样式', () => {
			const errorProps = {
				...defaultProps,
				approvalState: 'error' as const,
			};

			render(<FastEditorToolBlock {...errorProps} />);

			const toolElement = screen.getByTestId('edit-files-tool');
			expect(toolElement).toHaveClass('border-red-500/50');
		});
	});
});

describe('FastEditorToolBlock 集成测试', () => {
	test('完整的用户交互流程', async () => {
		const props = {
			edits: [
				{
					path: 'package.json',
					oldString: '"version": "1.0.0"',
					newString: '"version": "1.1.0"',
				},
			],
			explanation: 'Bump version to 1.1.0',
			approvalState: 'pending' as const,
			ts: Date.now(),
		};

		const { rerender } = render(<FastEditorToolBlock {...props} />);

		// 1. 初始pending状态
		expect(screen.getByTestId('status-message')).toHaveTextContent(
			'Awaiting approval'
		);

		// 2. 用户批准，变为loading状态
		rerender(<FastEditorToolBlock {...props} approvalState="loading" />);
		expect(screen.getByTestId('loading-state')).toBeInTheDocument();

		// 3. 编辑完成，显示结果
		rerender(
			<FastEditorToolBlock
				{...props}
				approvalState="approved"
				results={[{ path: 'package.json', success: true }]}
				successCount={1}
				failureCount={0}
			/>
		);
		expect(screen.getByTestId('status-message')).toHaveTextContent(
			'Successfully edited 1 file'
		);
		expect(screen.getByTestId('result-badges')).toBeInTheDocument();

		// 4. 测试展开/收起功能
		expect(screen.getByTestId('tool-content')).toBeInTheDocument();

		fireEvent.click(screen.getByTestId('tool-header'));
		await waitFor(() => {
			expect(screen.queryByTestId('tool-content')).not.toBeInTheDocument();
		});
	});

	test('错误处理流程', () => {
		const errorProps = {
			edits: [
				{
					path: 'missing.ts',
					oldString: 'old content',
					newString: 'new content',
				},
			],
			explanation: 'Test error handling',
			approvalState: 'error' as const,
			results: [
				{
					path: 'missing.ts',
					success: false,
					error: 'File not found: missing.ts',
				},
			],
			successCount: 0,
			failureCount: 1,
			ts: Date.now(),
		};

		render(<FastEditorToolBlock {...errorProps} />);

		expect(screen.getByTestId('status-message')).toHaveTextContent(
			'Failed to edit 1 file'
		);
		expect(screen.getByTestId('error-message-0')).toHaveTextContent(
			'File not found: missing.ts'
		);
	});
});
