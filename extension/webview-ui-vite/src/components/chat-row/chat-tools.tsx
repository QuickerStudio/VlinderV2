/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Code,
  Copy,
  FileEdit,
  FileText,
  FolderTree,
  HelpCircle,
  Image,
  LoaderPinwheel,
  MessageCircle,
  MessageCircleReply,
  Pencil,
  Play,
  RefreshCw,
  Scissors,
  Search,
  Server,
  Square,
  Terminal,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  AddInterestedFileTool,
  AskFollowupQuestionTool,
  AttemptCompletionTool,
  ChatTool,
  ExecuteCommandTool,
  ExploreRepoFolderTool,
  FileChangePlanTool,
  ListFilesTool,
  ReadFileTool,
  SearchFilesTool,
  SearchSymbolsTool,
  ServerRunnerTool,
  UrlScreenshotTool,
  SubmitReviewTool,
  MoveTool,
  RemoveTool,
  RenameTool,
  GitBashTool,
  KillBashTool,
  ReadProgressTool,
  TerminalTool,
  GetErrorsTool,
  ReplaceStringTool,
  MultiReplaceStringTool,
  InsertEditTool,
  FetchWebpageTool,
  VscodeApiTool,
  GrepSearchTool,
  GetTerminalOutputTool,
  ThinkTool,
  FastEditorTool,
  TimerTool,
  LocalTimeTool,
  PatternSearchTool,
  Context7Tool,
  ReadImageTool,
} from 'extension/shared/new-tools';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { EnhancedWebSearchBlock } from './tools/web-search-tool';
import { FileEditorTool } from './tools/file-editor-tool';
import { SpawnAgentBlock, ExitAgentBlock } from './tools/agent-tools';
import { ThinkToolBlock } from './tools/think-tool';
import { FastEditorToolBlock } from './tools/fast-editor-tool';
import { Context7ToolBlock } from './tools/context7-tool';
import { ReadImageToolBlock } from './tools/read-image-tool';
import MarkdownRenderer from './markdown-renderer';
import { CodeBlock } from './code-block';
import { getLanguageFromPath } from '@/utils/get-language-from-path';
import { rpcClient } from '@/lib/rpc-client';
import { vscode } from '@/utils/vscode';
import { useSound } from '@/hooks/use-sound';

// Helper to parse the simple XML from the tool result
const parseReadProgressXml = (xmlString: string) => {
  const getTagValue = (tagName: string) => {
    const match = xmlString.match(
      new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's')
    );
    return match ? match[1] : '';
  };

  const lines = [...xmlString.matchAll(/<line>(.*?)<\/line>/gs)].map(
    (match) => match[1]
  );

  return {
    status: getTagValue('status'),
    terminal: {
      id: getTagValue('id'),
      name: getTagValue('name'),
      busy: getTagValue('busy'),
      is_hot: getTagValue('is_hot'),
      is_dev_server: getTagValue('is_dev_server'),
      last_command: getTagValue('last_command'),
    },
    dev_server: {
      status: getTagValue('status'),
      url: getTagValue('url'),
      error: getTagValue('error'),
    },
    output: {
      line_count: getTagValue('line_count'),
      showing: getTagValue('showing'),
      lines: lines,
    },
    analysis: {
      process_state: getTagValue('process_state'),
      activity_state: getTagValue('activity_state'),
      recommendation: getTagValue('recommendation'),
    },
  };
};

type ApprovalState = ToolStatus;
export type ToolAddons = {
  approvalState?: ApprovalState;
  ts: number;
  /**
   * If this is a sub message, it will force it to stick to previous tool call in the ui (same message)
   */
  isSubMsg?: boolean;
  userFeedback?: string;
};
type ToolBlockProps = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
  tool: ChatTool['tool'];
  variant:
    | 'default'
    | 'primary'
    | 'info'
    | 'accent'
    | 'info'
    | 'success'
    | 'info'
    | 'destructive';
  summary?: string; // New: Brief information
  collapsible?: boolean; // New: Whether collapsible
  defaultExpanded?: boolean; // New: Default expanded state
  autoCollapseDelay?: number; // New: Auto-collapse delay time (milliseconds)
  customActions?: React.ReactNode; // New: Custom action buttons
  onExpandedChange?: (expanded: boolean) => void; // New: Expanded state change callback
} & ToolAddons;

export const ToolBlock: React.FC<ToolBlockProps> = ({
  icon: Icon,
  title,
  children,
  variant,
  isSubMsg,
  approvalState,
  userFeedback,
  summary,
  collapsible = true,
  defaultExpanded = false,
  autoCollapseDelay,
  customActions,
  onExpandedChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 🎯 Auto-collapse logic - includes success and failure states
  React.useEffect(() => {
    if (
      autoCollapseDelay &&
      (approvalState === 'approved' || approvalState === 'error') &&
      isExpanded
    ) {
      const timer = setTimeout(() => {
        handleExpandedChange(false);
      }, autoCollapseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoCollapseDelay, approvalState, isExpanded]);

  // 🎯 When expanded state changes, notify parent component
  const handleExpandedChange = (expanded: boolean) => {
    setIsExpanded(expanded);
    onExpandedChange?.(expanded);
  };

  variant =
    approvalState === 'loading'
      ? 'info'
      : approvalState === 'error' || approvalState === 'rejected'
        ? 'destructive'
        : approvalState === 'approved'
          ? 'success'
          : variant;
  const stateIcons = {
    pending: <AlertCircle className='w-5 h-5 text-info' />,
    approved: <CheckCircle className='w-5 h-5 text-success' />,
    rejected: <XCircle className='w-5 h-5 text-destructive' />,
    error: <AlertCircle className='w-5 h-5 text-destructive' />,
    loading: <LoaderPinwheel className='w-5 h-5 text-info animate-spin' />,
    feedback: <MessageCircleReply className='w-5 h-5 text-destructive' />,
  };

  if (!approvalState) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-l-4 bg-card text-card-foreground rounded-sm',
        {
          'border-primary': variant === 'primary',
          'border-secondary': variant === 'info',
          'border-accent': variant === 'accent',
          'border-success': variant === 'success',
          'border-info': variant === 'info',
          'border-muted': variant === 'default',
          'border-destructive': variant === 'destructive',
        },
        isSubMsg && '!-mt-5'
      )}
    >
      {/* Flattened single-row layout - clickable to expand/collapse */}
      <div
        className={cn(
          'flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors',
          collapsible && 'cursor-pointer'
        )}
        onClick={() => collapsible && handleExpandedChange(!isExpanded)}
      >
        {/* Left side: Icon + Title + Brief info */}
        <div className='flex items-center flex-1 min-w-0'>
          <Icon
            className={cn('w-5 h-5 mr-2 flex-shrink-0', `text-${variant}`)}
          />
          <h3 className='text-sm font-semibold mr-3 flex-shrink-0'>{title}</h3>
          {summary && (
            <span className='text-xs text-muted-foreground truncate'>
              {summary}
            </span>
          )}
        </div>

        {/* Right side: Custom actions + Status icon + Expand/collapse icon */}
        <div className='flex items-center space-x-2'>
          {/* 🎯 Custom action buttons */}
          {customActions && (
            <div onClick={(e) => e.stopPropagation()}>{customActions}</div>
          )}

          {userFeedback ? (
            <Tooltip>
              <TooltipTrigger>{stateIcons['feedback']}</TooltipTrigger>
              <TooltipContent side='left'>
                The tool got rejected with feedback
              </TooltipContent>
            </Tooltip>
          ) : (
            stateIcons[approvalState]
          )}
          {collapsible &&
            (isExpanded ? (
              <ChevronUp className='w-4 h-4 text-muted-foreground' />
            ) : (
              <ChevronDown className='w-4 h-4 text-muted-foreground' />
            ))}
        </div>
      </div>

      {/* Collapsible detailed content */}
      {collapsible ? (
        <Collapsible open={isExpanded} onOpenChange={handleExpandedChange}>
          <CollapsibleContent className='px-3 pb-3'>
            <div className='text-sm border-t pt-3'>{children}</div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className='px-3 pb-3 text-sm'>{children}</div>
      )}
    </div>
  );
};

export const DevServerToolBlock: React.FC<ServerRunnerTool & ToolAddons> = ({
  commandType,
  commandToRun,
  approvalState,

  tool,
  serverName,
  ts,
  output,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = () => {
    switch (commandType) {
      case 'start':
        return Play;
      case 'stop':
        return Square;
      case 'restart':
        return RefreshCw;
      case 'getLogs':
        return FileText;
      default:
        return Server;
    }
  };

  const Icon = getIcon();

  // 🎯 Custom right-side action button area
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Run Server icon button */}
          <Button
            size='sm'
            variant='default'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 Use native constants and logic - send primary button click event
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Run Server'
          >
            <Play className='h-4 w-4' />
          </Button>

          {/* Cancel icon button */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 Use native constants and logic - send secondary button click event
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={Icon}
      title={`Dev Server - ${serverName}`}
      variant='primary'
      approvalState={approvalState}
      summary={commandToRun} // Display command to execute
      customActions={renderActionButtons()} // 🎯 Add custom action buttons
    >
      <div className='bg-muted p-2 rounded font-mono text-xs overflow-x-auto'>
        <span className='text-success'>$</span> {commandToRun}
      </div>

      {approvalState === 'loading' && (
        <div className='mt-2 flex items-center'>
          <span className='text-xs mr-2'>
            Server is {commandType === 'stop' ? 'stopping' : 'starting'}...
          </span>
          <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
        </div>
      )}

      {output && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='flex items-center w-full justify-between'
            >
              <span>View Output</span>
              {isOpen ? (
                <ChevronUp className='h-4 w-4' />
              ) : (
                <ChevronDown className='h-4 w-4' />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2'>
            <ScrollArea className='h-[200px] w-full rounded-md border'>
              <ScrollArea className='h-[200px] w-full rounded-md border'>
                <div className='p-4'>
                  <pre className='text-sm whitespace-pre-wrap text-pretty break-all'>
                    {output}
                  </pre>
                </div>{' '}
                <ScrollBar orientation='vertical' />
              </ScrollArea>

              <ScrollBar orientation='vertical' />
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}

      {approvalState === 'approved' && commandType === 'start' && (
        <p className='text-xs mt-2 text-success'>
          Server started successfully.
        </p>
      )}

      {approvalState === 'approved' && commandType === 'stop' && (
        <p className='text-xs mt-2 text-success'>
          Server stopped successfully.
        </p>
      )}
      {approvalState === 'approved' && commandType === 'restart' && (
        <p className='text-xs mt-2 text-success'>
          Server restarted successfully.
        </p>
      )}
      {approvalState === 'approved' && commandType === 'getLogs' && (
        <p className='text-xs mt-2 text-success'>
          Server logs retrieved successfully.
        </p>
      )}

      {approvalState === 'error' && (
        <p className='text-xs mt-2 text-destructive'>
          An error occurred while {commandType}ing the server.
        </p>
      )}
    </ToolBlock>
  );
};
export const ChatTruncatedBlock = ({ ts }: { ts: number }) => {
  return (
    <ToolBlock
      ts={ts}
      tool='write_to_file'
      icon={Scissors}
      title='Chat Compressed'
      variant='info'
      approvalState='approved'
      isSubMsg={false}
    >
      <div className='space-y-4'>
        <div className='bg-secondary/20 p-3 rounded-md'>
          <p className='text-sm'>
            The conversation history was compressed before reaching the maximum
            context window. Previous content may be unavailable, but the task
            can continue.
          </p>
        </div>
      </div>
    </ToolBlock>
  );
};

export const ChatMaxWindowBlock = ({ ts }: { ts: number }) => (
  <ToolBlock
    icon={AlertCircle}
    title='Maximum Context Reached'
    variant='destructive'
    approvalState='approved'
    isSubMsg={false}
    ts={ts}
    tool='write_to_file'
  >
    <div className='bg-destructive/20 p-3 rounded-md'>
      <p className='text-sm font-medium'>
        This task has reached its maximum context limit and cannot continue.
      </p>
      <p className='text-sm mt-2'>
        Please start a new task to continue working. Your progress has been
        saved.
      </p>
    </div>
  </ToolBlock>
);

export const ExecuteCommandBlock: React.FC<
  ExecuteCommandTool &
    ToolAddons & {
      hasNextMessage?: boolean;
    }
> = ({ command, output, approvalState, tool, ts, ...rest }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    if (command) {
      navigator.clipboard.writeText(command);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  // 🎯 自定义右侧操作按钮区域
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Run Command 图标按钮 */}
          <Button
            size='sm'
            variant='default'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 使用原生常量和逻辑 - 发送主按钮点击事件
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Run Command'
          >
            <Play className='h-4 w-4' />
          </Button>

          {/* Cancel 图标按钮 */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 使用原生常量和逻辑 - 发送次按钮点击事件
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={Terminal}
      title='Execute Command'
      variant='info'
      approvalState={approvalState}
      summary={`$ ${command}`} // Display command in single-row layout
      customActions={renderActionButtons()} // 🎯 Add custom action buttons
      collapsible={true}
    >
      <div className='space-y-3'>
        <div className='bg-muted p-2 rounded font-mono text-xs overflow-x-auto flex items-center justify-between group relative'>
          <pre className='whitespace-pre-wrap text-pretty break-all'>
            <span className='text-success'>$</span> {command}
          </pre>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1'
            onClick={handleCopy}
            title='Copy command'
          >
            {isCopied ? (
              <CheckCircle className='h-4 w-4 text-success' />
            ) : (
              <ClipboardCheck className='h-4 w-4' />
            )}
          </Button>
        </div>

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Executing command...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {output && (
          <ScrollArea className='h-[200px] w-full rounded-md border'>
            <div className='bg-secondary/20 p-3 rounded-md text-sm'>
              <pre className='whitespace-pre-wrap text-pretty break-all'>
                {output}
              </pre>
            </div>
            <ScrollBar orientation='vertical' />
          </ScrollArea>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Command executed successfully.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            An error occurred while executing the command.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

export const ListFilesBlock: React.FC<ListFilesTool & ToolAddons> = ({
  path,
  recursive,
  approvalState,
  tool,
  ts,
  content,
  ...rest
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={FolderTree}
      title='List Files'
      variant='info'
      approvalState={approvalState}
    >
      <p className='text-xs'>
        <span className='font-semibold'>Folder:</span> {path}
      </p>
      <p className='text-xs'>
        <span className='font-semibold'>Include subfolders:</span>{' '}
        {recursive || 'No'}
      </p>
      {content && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='flex items-center w-full justify-between'
            >
              <span>View Output</span>
              {isOpen ? (
                <ChevronUp className='h-4 w-4' />
              ) : (
                <ChevronDown className='h-4 w-4' />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2'>
            <ScrollArea className='h-[200px] w-full rounded-md border'>
              <div className='bg-secondary/20 p-3 rounded-md text-sm'>
                <pre className='whitespace-pre-wrap text-pretty break-all'>
                  {content}
                </pre>
              </div>
              <ScrollBar orientation='vertical' />
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </ToolBlock>
  );
};

export const ExploreRepoFolderBlock: React.FC<
  ExploreRepoFolderTool & ToolAddons
> = ({ path, approvalState, tool, ts, ...rest }) => (
  <ToolBlock
    {...rest}
    ts={ts}
    tool={tool}
    icon={Code}
    title='Explore Repository Folder'
    variant='accent'
    approvalState={approvalState}
  >
    <p className='text-xs'>
      <span className='font-semibold'>Scanning folder:</span> {path}
    </p>
  </ToolBlock>
);

export const SearchFilesBlock: React.FC<SearchFilesTool & ToolAddons> = ({
  path,
  regex,
  filePattern,
  approvalState,
  content: output,
  tool,
  ts,
  ...rest
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={Search}
      title='Search Files'
      variant='info'
      approvalState={approvalState}
    >
      <p className='text-xs'>
        <span className='font-semibold'>Search in:</span> {path}
      </p>
      <p className='text-xs'>
        <span className='font-semibold'>Look for:</span> {regex}
      </p>
      {filePattern && (
        <p className='text-xs'>
          <span className='font-semibold'>File types:</span> {filePattern}
        </p>
      )}
      {output && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='flex items-center w-full justify-between'
            >
              <span>View Output</span>
              {isOpen ? (
                <ChevronUp className='h-4 w-4' />
              ) : (
                <ChevronDown className='h-4 w-4' />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2'>
            <ScrollArea className='h-[200px] w-full rounded-md border'>
              <div className='bg-secondary/20 p-3 rounded-md text-sm'>
                <pre className='whitespace-pre-wrap text-pretty'>{output}</pre>
              </div>
              <ScrollBar orientation='vertical' />
              <ScrollBar orientation='horizontal' />
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </ToolBlock>
  );
};

const CodeBlockMemorized = React.memo(
  ({ content, path }: { content: string; path: string }) => {
    return (
      <ScrollArea className='h-[200px] w-full rounded-md border'>
        <CodeBlock language={path} children={content} />
        <ScrollBar orientation='vertical' />
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    );
  }
);

export const ReadFileBlock: React.FC<ReadFileTool & ToolAddons> = ({
  path,
  approvalState,
  content,
  tool,
  ts,
  ...rest
}) => {
  const pathEnding = useMemo(() => getLanguageFromPath(path), [path]);

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={FileText}
      title='Read File'
      variant='primary'
      approvalState={approvalState}
      summary={path} // Display file path in single-row layout
      collapsible={true}
    >
      <div className='space-y-3'>
        <p className='text-xs'>
          <span className='font-semibold'>File:</span>
          <Button
            onClick={() => {
              rpcClient.openFile.use({ filePath: path });
            }}
            variant='link'
            size='sm'
            className='ml-1 text-start'
          >
            {path}
          </Button>
        </p>

        {content && content.length > 0 && (
          <div>
            {/* Use optimized code block component */}
            <CodeBlockMemorized content={content} path={pathEnding ?? 'text'} />
          </div>
        )}
      </div>
    </ToolBlock>
  );
};

export type ToolStatus =
  | 'pending'
  | 'rejected'
  | 'approved'
  | 'error'
  | 'loading'
  | undefined;

/**
 * 🎯 Follow-up Question Component - Important question style modification function
 *
 * This is the display component that controls AI follow-up questions
 * Responsible for:
 * - Display and formatting of question content
 * - Logic for auto-collapsing question list after 5 seconds (including success and failure states)
 * - Display of question summary in collapsed state
 *
 * Modifying this component can change:
 * - Question display style and layout
 * - Auto-collapse time (currently 5 seconds)
 * - Question content formatting method
 */
export const AskFollowupQuestionBlock: React.FC<
  AskFollowupQuestionTool & ToolAddons
> = ({
  question,
  approvalState,

  tool,
  ts,
  ...rest
}) => {
  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={HelpCircle}
      title='Follow-up Question'
      variant='info'
      approvalState={approvalState}
      summary={question} // Display question summary in collapsed state
      collapsible={true}
      defaultExpanded={true} // 🎯 Default expanded to show question
      autoCollapseDelay={5000} // 🎯 Auto-collapse after 5 seconds
    >
      <div className='bg-info/20 text-info-foreground p-2 rounded text-xs'>
        <MarkdownRenderer>{question}</MarkdownRenderer>
      </div>
    </ToolBlock>
  );
};

export const AttemptCompletionBlock: React.FC<
  AttemptCompletionTool & ToolAddons
> = ({
  result,
  approvalState,

  tool,
  ts,
  ...rest
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderCopyButton = () => {
    if (!result) return null;

    return (
      <Button
        variant='ghost'
        size='sm'
        onClick={handleCopy}
        className='h-7 w-7 p-0'
        title={copied ? 'Copied!' : 'Copy result'}
      >
        {copied ? (
          <Check className='h-3 w-3' />
        ) : (
          <Copy className='h-3 w-3' />
        )}
      </Button>
    );
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={CheckCircle}
      title='Task Completion'
      variant={
        approvalState === 'approved'
          ? 'success'
          : approvalState === 'rejected'
            ? 'destructive'
            : 'info'
      }
      approvalState={approvalState}
      customActions={renderCopyButton()}
    >
      {/* {command && (
        <div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto mb-2">
          <span className="text-success">$</span> {command}
        </div>
      )} */}
      <div className='bg-background text-foreground p-2 rounded text-xs w-full flex'>
        <MarkdownRenderer markdown={result?.trim()} />
      </div>
    </ToolBlock>
  );
};

export const UrlScreenshotBlock: React.FC<UrlScreenshotTool & ToolAddons> = ({
  url,
  approvalState,

  tool,
  base64Image,
  ts,
  ...rest
}) => (
  <ToolBlock
    {...rest}
    ts={ts}
    tool={tool}
    icon={Image}
    title='URL Screenshot'
    variant='accent'
    approvalState={approvalState}
  >
    <p className='text-xs'>
      <span className='font-semibold'>Website:</span> {url}
    </p>
    {base64Image && (
      <div className='bg-muted rounded-md mt-2 text-xs w-full max-h-40 overflow-auto'>
        <img
          src={`data:image/png;base64,${base64Image}`}
          alt='URL Screenshot'
        />
      </div>
    )}
  </ToolBlock>
);
export const SearchSymbolBlock: React.FC<SearchSymbolsTool & ToolAddons> = ({
  symbolName,
  content,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={Search}
      title='Search Symbols'
      variant='accent'
      approvalState={approvalState}
    >
      <p className='text-xs'>
        <span className='font-semibold'>Symbol:</span> {symbolName}
      </p>
      {content && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='flex items-center w-full justify-between'
            >
              <span>View Results</span>
              {isOpen ? (
                <ChevronUp className='h-4 w-4' />
              ) : (
                <ChevronDown className='h-4 w-4' />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2'>
            <ScrollArea className='h-[200px] w-full rounded-md border'>
              <div className='bg-secondary/20 p-3 rounded-md text-sm'>
                <pre className='whitespace-pre-wrap'>{content}</pre>
              </div>
              <ScrollBar orientation='vertical' />
              <ScrollBar orientation='horizontal' />
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </ToolBlock>
  );
};

export const AddInterestedFileBlock: React.FC<
  AddInterestedFileTool & ToolAddons
> = ({ path, why, approvalState, tool, ts, ...rest }) => (
  <ToolBlock
    {...rest}
    ts={ts}
    tool={tool}
    icon={FileText}
    title='Track File'
    variant='info'
    approvalState={approvalState}
  >
    <p className='text-xs'>
      <span className='font-semibold'>File:</span> {path}
    </p>
    <p className='text-xs'>
      <span className='font-semibold'>Reason:</span> {why}
    </p>
  </ToolBlock>
);

export const FileChangesPlanBlock: React.FC<
  FileChangePlanTool &
    ToolAddons & {
      innerThoughts?: string;
      innerSelfCritique?: string;
      rejectedString?: string;
    }
> = ({
  path,
  what_to_accomplish,
  approvalState,
  tool,
  ts,
  innerThoughts = '',
  innerSelfCritique = '',
  rejectedString,
  ...rest
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = React.useState(false);

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={FileText}
      title='File Changes Plan'
      variant='info'
      approvalState={approvalState}
    >
      <div className='text-xs space-y-3'>
        <div className='space-y-1'>
          <p>
            <span className='font-semibold'>File:</span> {path}
          </p>
          <div>
            <span className='font-semibold'>What to accomplish:</span>
            <div className='mt-1 bg-muted p-2 rounded-md'>
              <MarkdownRenderer markdown={what_to_accomplish?.trim() ?? ''} />
            </div>
          </div>
        </div>

        {(innerThoughts.trim() || innerSelfCritique.trim()) && (
          <Collapsible
            open={isReasoningOpen}
            onOpenChange={setIsReasoningOpen}
            className='border-t pt-3 mt-3'
          >
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='flex items-center w-full justify-between px-0'
              >
                <div className='flex items-center space-x-2'>
                  <MessageCircle className='h-4 w-4 text-info' />
                  <span className='font-medium'>
                    View Vlinder Reasoning Steps
                  </span>
                </div>
                {isReasoningOpen ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='mt-2 space-y-3'>
              {innerThoughts.trim() && (
                <div className='bg-secondary/20 p-2 rounded-md'>
                  <h4 className='font-semibold flex items-center space-x-2 mb-1 text-xs uppercase tracking-wide text-secondary-foreground'>
                    <HelpCircle className='h-3 w-3' />
                    <span>Inner Thoughts</span>
                  </h4>
                  <MarkdownRenderer markdown={innerThoughts.trim()} />
                </div>
              )}
              {innerSelfCritique.trim() && (
                <div className='bg-secondary/20 p-2 rounded-md'>
                  <h4 className='font-semibold flex items-center space-x-2 mb-1 text-xs uppercase tracking-wide text-secondary-foreground'>
                    <AlertCircle className='h-3 w-3' />
                    <span>Inner Self-Critique</span>
                  </h4>
                  <MarkdownRenderer markdown={innerSelfCritique.trim()} />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {rejectedString?.trim() && (
          <div className='bg-destructive/10 border border-destructive rounded-md p-3 mt-3'>
            <div className='flex items-center space-x-2 mb-2 text-destructive'>
              <AlertCircle className='h-4 w-4' />
              <span className='font-semibold text-sm'>Plan Rejected</span>
            </div>
            <p className='text-sm text-destructive-foreground'>
              Vlinder decided to reject the change plan because of:
            </p>
            <div className='bg-destructive/20 p-2 rounded-md mt-2'>
              <MarkdownRenderer markdown={rejectedString.trim()} />
            </div>
          </div>
        )}
      </div>
    </ToolBlock>
  );
};

export const SubmitReviewBlock: React.FC<SubmitReviewTool & ToolAddons> = ({
  review,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={ClipboardCheck}
      title='Submit Review'
      variant='accent'
      approvalState={approvalState}
    >
      <div className='text-xs space-y-3'>
        {review && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='flex items-center w-full justify-between'
              >
                <span>View Review</span>
                {isOpen ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='mt-2'>
              <ScrollArea className='h-[200px] w-full rounded-md border'>
                <div className='bg-secondary/20 p-3 rounded-md text-sm'>
                  <MarkdownRenderer markdown={review} />
                </div>
                <ScrollBar orientation='vertical' />
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </ToolBlock>
  );
};

export const MoveBlock: React.FC<MoveTool & ToolAddons> = ({
  source_path,
  destination_path,
  type,
  overwrite,
  merge,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  // 🎯 自定义右侧操作按钮区域
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Move 图标按钮 */}
          <Button
            size='sm'
            variant='default'
            className='h-8 w-8 p-0'
            onClick={() => {
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Move File/Directory'
          >
            <Play className='h-4 w-4' />
          </Button>

          {/* Cancel 图标按钮 */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={FolderTree}
      title='Move File/Directory'
      variant='info'
      approvalState={approvalState}
      summary={`${source_path} → ${destination_path}`}
      customActions={renderActionButtons()}
      collapsible={true}
    >
      <div className='space-y-3'>
        <div className='text-xs space-y-1'>
          <p>
            <span className='font-semibold'>From:</span> {source_path}
          </p>
          <p>
            <span className='font-semibold'>To:</span> {destination_path}
          </p>
          {type && type !== 'auto' && (
            <p>
              <span className='font-semibold'>Type:</span> {type}
            </p>
          )}
          {overwrite && (
            <p>
              <span className='font-semibold'>Overwrite:</span> Yes
            </p>
          )}
          {merge && (
            <p>
              <span className='font-semibold'>Merge:</span> Yes
            </p>
          )}
        </div>

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Moving...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Move operation completed successfully.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            An error occurred while moving the file/directory.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

export const RemoveBlock: React.FC<RemoveTool & ToolAddons> = ({
  path,
  type,
  recursive,
  force,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  // 🎯 自定义右侧操作按钮区域
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Remove 图标按钮 */}
          <Button
            size='sm'
            variant='destructive'
            className='h-8 w-8 p-0'
            onClick={() => {
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Remove File/Directory'
          >
            <X className='h-4 w-4' />
          </Button>

          {/* Cancel 图标按钮 */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <XCircle className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={X}
      title='Remove File/Directory'
      variant='destructive'
      approvalState={approvalState}
      summary={path}
      customActions={renderActionButtons()}
      collapsible={true}
    >
      <div className='space-y-3'>
        <div className='text-xs space-y-1'>
          <p>
            <span className='font-semibold'>Path:</span> {path}
          </p>
          {type && type !== 'auto' && (
            <p>
              <span className='font-semibold'>Type:</span> {type}
            </p>
          )}
          {recursive !== undefined && (
            <p>
              <span className='font-semibold'>Recursive:</span>{' '}
              {recursive ? 'Yes' : 'No'}
            </p>
          )}
          {force && (
            <p>
              <span className='font-semibold'>Force:</span> Yes
            </p>
          )}
        </div>

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Removing...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive'></div>
          </div>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Remove operation completed successfully.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            An error occurred while removing the file/directory.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

export const GitBashBlock: React.FC<
  GitBashTool &
    ToolAddons & {
      hasNextMessage?: boolean;
    }
> = ({
  command,
  timeout,
  captureOutput,
  output,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    if (command) {
      navigator.clipboard.writeText(command);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 🎯 自定义右侧操作按钮区域
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Run Command 图标按钮 */}
          <Button
            size='sm'
            variant='default'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 使用原生常量和逻辑 - 发送主按钮点击事件
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Run Command'
          >
            <Play className='h-4 w-4' />
          </Button>

          {/* Cancel 图标按钮 */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 使用原生常量和逻辑 - 发送次按钮点击事件
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={Terminal}
      title='Bash'
      variant='info'
      approvalState={approvalState}
      summary={`$ ${command}`} // Display command in single-row layout
      customActions={renderActionButtons()} // 🎯 Add custom action buttons
      collapsible={true}
    >
      <div className='space-y-3'>
        <div className='bg-muted p-2 rounded font-mono text-xs overflow-x-auto flex items-center justify-between group relative'>
          <pre className='whitespace-pre-wrap text-pretty break-all'>
            <span className='text-success'>$</span> {command}
          </pre>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1'
            onClick={handleCopy}
            title='Copy command'
          >
            {isCopied ? (
              <CheckCircle className='h-4 w-4 text-success' />
            ) : (
              <ClipboardCheck className='h-4 w-4' />
            )}
          </Button>
        </div>

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Executing command...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {output && (
          <ScrollArea className='h-[200px] w-full rounded-md border'>
            <div className='bg-secondary/20 p-3 rounded-md text-sm'>
              <pre className='whitespace-pre-wrap text-pretty break-all'>
                {output}
              </pre>
            </div>
            <ScrollBar orientation='vertical' />
          </ScrollArea>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Command executed successfully.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            An error occurred while executing the command.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

export const KillBashBlock: React.FC<
  KillBashTool &
    ToolAddons & {
      hasNextMessage?: boolean;
    }
> = ({
  terminalId,
  terminalName,
  lastCommand,
  isBusy,
  force,
  result,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 🎯 自定义右侧操作按钮区域
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Kill Terminal 图标按钮 */}
          <Button
            size='sm'
            variant='destructive'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 使用原生常量和逻辑 - 发送主按钮点击事件
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Kill Terminal'
          >
            <XCircle className='h-4 w-4' />
          </Button>

          {/* Cancel 图标按钮 */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              // 🎯 使用原生常量和逻辑 - 发送次按钮点击事件
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  // 构建摘要信息
  const terminalIdentifier = terminalName || `Terminal #${terminalId}`;
  const summary = `${terminalIdentifier}${force ? ' (Force)' : ''}`;

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={XCircle}
      title='Kill Terminal'
      variant='destructive'
      approvalState={approvalState}
      summary={summary}
      customActions={renderActionButtons()}
      collapsible={true}
    >
      <div className='space-y-3'>
        {/* Terminal Information */}
        <div className='space-y-2'>
          {terminalId !== undefined && (
            <p className='text-xs'>
              <span className='font-semibold'>Terminal ID:</span> {terminalId}
            </p>
          )}
          {terminalName && (
            <p className='text-xs'>
              <span className='font-semibold'>Terminal Name:</span>{' '}
              {terminalName}
            </p>
          )}
          {lastCommand && (
            <div className='text-xs'>
              <span className='font-semibold'>Last Command:</span>
              <div className='bg-muted p-2 rounded font-mono text-xs overflow-x-auto mt-1'>
                <pre className='whitespace-pre-wrap text-pretty break-all'>
                  <span className='text-success'>$</span> {lastCommand}
                </pre>
              </div>
            </div>
          )}
          {isBusy !== undefined && (
            <p className='text-xs'>
              <span className='font-semibold'>Status:</span>{' '}
              <span
                className={cn(
                  isBusy ? 'text-warning' : 'text-muted-foreground'
                )}
              >
                {isBusy ? 'Busy' : 'Idle'}
              </span>
            </p>
          )}
          {force !== undefined && (
            <p className='text-xs'>
              <span className='font-semibold'>Kill Method:</span>{' '}
              <span
                className={cn(
                  force
                    ? 'text-destructive font-semibold'
                    : 'text-muted-foreground'
                )}
              >
                {force ? 'Force Kill' : 'Graceful Termination'}
              </span>
            </p>
          )}
        </div>

        {/* Loading State */}
        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Terminating terminal...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive'></div>
          </div>
        )}

        {/* Result Output */}
        {result && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='flex items-center w-full justify-between'
              >
                <span>View Details</span>
                {isOpen ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='mt-2'>
              <ScrollArea className='h-[200px] w-full rounded-md border'>
                <div className='bg-secondary/20 p-3 rounded-md text-sm'>
                  <pre className='whitespace-pre-wrap text-pretty break-all'>
                    {result}
                  </pre>
                </div>
                <ScrollBar orientation='vertical' />
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Success State */}
        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Terminal terminated successfully.
          </p>
        )}

        {/* Error State */}
        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            An error occurred while terminating the terminal.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

export const ReadProgressBlock: React.FC<ReadProgressTool & ToolAddons> = ({
  terminalId,
  terminalName,
  includeFullOutput,
  result,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Build summary info
  const terminalIdentifier = terminalName || `Terminal #${terminalId}`;
  const summary = `${terminalIdentifier}${includeFullOutput ? ' (Full Output)' : ' (Recent)'}`;

  // Helper to extract a tag's value from the result string
  const getTagValue = (tagName: string, xmlString: string | undefined) => {
    if (!xmlString) return '';
    const match = xmlString.match(
      new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's')
    );
    return match ? match[1] : '';
  };

  // Parse the XML result when it's available
  const parsedResult = useMemo(() => {
    if (!result) return null;
    try {
      // Make sure to un-escape XML content before parsing sub-fields
      const unescapedResult = result
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      return parseReadProgressXml(unescapedResult);
    } catch (e) {
      console.error('Failed to parse read_progress XML:', e);
      return null;
    }
  }, [result]);

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={RefreshCw}
      title='Read Terminal Progress'
      variant='info'
      approvalState={approvalState || 'approved'}
      summary={summary}
      customActions={null}
      collapsible={true}
    >
      <div className='space-y-3'>
        {/* Terminal Information from props */}
        <div className='space-y-2 border-b pb-2'>
          <p className='text-xs font-semibold'>Request Details</p>
          {terminalId !== undefined && (
            <p className='text-xs'>
              <span className='font-semibold'>Terminal ID:</span> {terminalId}
            </p>
          )}
          {terminalName && (
            <p className='text-xs'>
              <span className='font-semibold'>Terminal Name:</span>{' '}
              {terminalName}
            </p>
          )}
          {includeFullOutput !== undefined && (
            <p className='text-xs'>
              <span className='font-semibold'>Output Mode:</span>{' '}
              <span
                className={cn(
                  includeFullOutput ? 'text-info' : 'text-muted-foreground'
                )}
              >
                {includeFullOutput ? 'Full History' : 'Recent Output'}
              </span>
            </p>
          )}
        </div>

        {/* Loading State */}
        {(approvalState === 'loading' || !result) && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Reading progress...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info'></div>
          </div>
        )}

        {/* Parsed Result Output */}
        {parsedResult && parsedResult.status === 'success' && (
          <div className='space-y-3'>
            {/* Analysis Recommendation */}
            <div className='bg-muted p-2 rounded-md'>
              <p className='text-xs font-semibold'>Analysis</p>
              <p className='text-xs mt-1'>
                {parsedResult.analysis.recommendation}
              </p>
            </div>

            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='flex items-center w-full justify-between -ml-2'
                >
                  <span>View Details</span>
                  {isOpen ? (
                    <ChevronUp className='h-4 w-4' />
                  ) : (
                    <ChevronDown className='h-4 w-4' />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className='mt-2 space-y-3'>
                {/* Terminal Status Details */}
                <div className='space-y-2'>
                  <p className='text-xs font-semibold'>Terminal Status</p>
                  <p className='text-xs'>
                    <span className='font-semibold'>State:</span>{' '}
                    {parsedResult.analysis.process_state}
                  </p>
                  <p className='text-xs'>
                    <span className='font-semibold'>Activity:</span>{' '}
                    {parsedResult.analysis.activity_state}
                  </p>
                  {parsedResult.terminal.last_command && (
                    <p className='text-xs'>
                      <span className='font-semibold'>Last Command:</span>
                      <CodeBlock language='shell'>
                        {parsedResult.terminal.last_command}
                      </CodeBlock>
                    </p>
                  )}
                </div>

                {/* Output Lines */}
                {parsedResult.output.lines.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-xs font-semibold'>
                      Output ({parsedResult.output.showing},{' '}
                      {parsedResult.output.line_count} lines)
                    </p>
                    <ScrollArea className='h-[200px] w-full rounded-md border p-2'>
                      <pre className='text-xs whitespace-pre-wrap break-all'>
                        {parsedResult.output.lines.join('\n')}
                      </pre>
                      <ScrollBar orientation='vertical' />
                    </ScrollArea>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Error display from parsed result */}
        {parsedResult && parsedResult.status === 'error' && (
          <div className='text-xs text-destructive bg-destructive/10 p-2 rounded-md'>
            <p className='font-semibold'>Error</p>
            <p>{getTagValue('error', result)}</p>
          </div>
        )}

        {/* Fallback for parsing errors */}
        {!parsedResult && result && (
          <div className='text-xs text-destructive bg-destructive/10 p-2 rounded-md'>
            <p className='font-semibold'>Error</p>
            <p>Failed to parse tool output.</p>
          </div>
        )}
      </div>
    </ToolBlock>
  );
};

export const TerminalBlock: React.FC<TerminalTool & ToolAddons> = ({
  command,
  shell,
  cwd,
  timeout,
  env,
  captureOutput,
  interactive,
  terminalName,
  reuseTerminal,
  result,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Copy command to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Parse XML result to extract structured data
  const parseResult = (xmlResult: string | undefined) => {
    if (!xmlResult) return null;

    try {
      const statusMatch = xmlResult.match(/<status>(.*?)<\/status>/);
      const terminalIdMatch = xmlResult.match(/<id>(.*?)<\/id>/);
      const terminalNameMatch = xmlResult.match(/<name>(.*?)<\/name>/);
      const shellMatch = xmlResult.match(/<shell>(.*?)<\/shell>/);
      const commandMatch = xmlResult.match(/<command>(.*?)<\/command>/);
      const outputMatch = xmlResult.match(/<output>(.*?)<\/output>/s);
      const messageMatch = xmlResult.match(/<message>(.*?)<\/message>/);
      const elapsedMatch = xmlResult.match(/<elapsed>(.*?)<\/elapsed>/);
      const noteMatch = xmlResult.match(/<note>(.*?)<\/note>/);

      return {
        status: statusMatch?.[1] || 'unknown',
        terminalId: terminalIdMatch?.[1],
        terminalName: terminalNameMatch?.[1],
        shell: shellMatch?.[1],
        command: commandMatch?.[1],
        output: outputMatch?.[1]
          ?.replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&'),
        message: messageMatch?.[1],
        elapsed: elapsedMatch?.[1],
        note: noteMatch?.[1],
      };
    } catch (e) {
      return null;
    }
  };

  const parsedResult = parseResult(result);

  // 自定义右侧操作按钮区域
  const customActions =
    approvalState === 'pending' ? (
      <div className='flex items-center space-x-2'>
        {/* Execute 图标按钮 */}
        <Button
          size='sm'
          variant='default'
          className='h-8 w-8 p-0'
          onClick={() => {
            vscode.postMessage({
              type: 'askResponse',
              askResponse: 'yesButtonTapped',
              text: '',
              images: [],
            });
          }}
          title='Execute Command'
        >
          <Play className='h-4 w-4' />
        </Button>

        {/* Cancel 图标按钮 */}
        <Button
          size='sm'
          variant='outline'
          className='h-8 w-8 p-0'
          onClick={() => {
            vscode.postMessage({
              type: 'askResponse',
              askResponse: 'noButtonTapped',
              text: '',
              images: [],
            });
          }}
          title='Cancel'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>
    ) : null;

  // Helper function to format shell label
  const getShellLabel = (shellType: string | undefined): string => {
    if (!shellType || shellType === 'auto') return 'auto';
    const shellMap: Record<string, string> = {
      powershell: 'PowerShell',
      'git-bash': 'Git Bash',
      cmd: 'CMD',
      bash: 'bash',
      zsh: 'zsh',
      fish: 'fish',
      sh: 'sh',
    };
    return shellMap[shellType] || shellType;
  };

  // Build summary for collapsed state
  const shellLabel = getShellLabel(shell);
  const summary = `[${shellLabel}] ${command}`;

  return (
    <ToolBlock
      icon={Terminal}
      title='Terminal'
      variant='default'
      approvalState={approvalState}
      customActions={customActions}
      summary={summary}
      collapsible={true}
      tool={tool}
      ts={ts}
      {...rest}
    >
      <div className='space-y-3'>
        {/* Command with Shell Label */}
        <div className='space-y-2'>
          <div className='flex items-center space-x-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Command:
            </span>
            <span className='text-xs bg-accent/50 px-2 py-0.5 rounded font-medium'>
              {getShellLabel(shell)}
            </span>
            <span className='text-muted-foreground'>|</span>
            <div className='flex-1 bg-muted px-3 py-1.5 rounded font-mono text-xs overflow-x-auto'>
              {command}
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 flex-shrink-0'
              onClick={handleCopy}
              title='Copy command'
            >
              {isCopied ? (
                <CheckCircle className='h-4 w-4 text-success' />
              ) : (
                <ClipboardCheck className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>

        {/* Working Directory */}
        {cwd && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Directory:
            </span>
            <code className='text-sm bg-muted px-2 py-1 rounded flex-1 break-all'>
              {cwd}
            </code>
          </div>
        )}

        {/* Terminal Name */}
        {terminalName && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Terminal:
            </span>
            <span className='text-sm'>{terminalName}</span>
          </div>
        )}

        {/* Options */}
        {(timeout ||
          interactive ||
          reuseTerminal ||
          captureOutput === false) && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Options:
            </span>
            <div className='flex flex-wrap gap-2'>
              {timeout && timeout !== 30000 && (
                <span className='text-xs bg-muted px-2 py-1 rounded'>
                  Timeout: {timeout}ms
                </span>
              )}
              {interactive && (
                <span className='text-xs bg-muted px-2 py-1 rounded'>
                  Interactive
                </span>
              )}
              {reuseTerminal && (
                <span className='text-xs bg-muted px-2 py-1 rounded'>
                  Reuse Terminal
                </span>
              )}
              {captureOutput === false && (
                <span className='text-xs bg-muted px-2 py-1 rounded'>
                  No Capture
                </span>
              )}
            </div>
          </div>
        )}

        {/* Environment Variables */}
        {env && Object.keys(env).length > 0 && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Env Vars:
            </span>
            <div className='flex flex-wrap gap-1'>
              {Object.entries(env).map(([key, value]) => (
                <span key={key} className='text-xs bg-muted px-2 py-1 rounded'>
                  {key}={value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {parsedResult?.message && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Message:
            </span>
            <span className='text-sm'>{parsedResult.message}</span>
          </div>
        )}

        {/* Execution Time */}
        {parsedResult?.elapsed && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Elapsed:
            </span>
            <span className='text-sm'>{parsedResult.elapsed}</span>
          </div>
        )}

        {/* Note */}
        {parsedResult?.note && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Note:
            </span>
            <span className='text-sm text-yellow-600'>{parsedResult.note}</span>
          </div>
        )}

        {/* Output */}
        {parsedResult?.output && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='w-full justify-between'
              >
                <span className='text-sm font-medium'>Output</span>
                {isOpen ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className='h-[300px] w-full rounded-md border'>
                <pre className='p-4 text-xs whitespace-pre-wrap break-words'>
                  {parsedResult.output}
                </pre>
                <ScrollBar orientation='horizontal' />
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Loading State */}
        {approvalState === 'loading' && !result && (
          <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
            <LoaderPinwheel className='h-4 w-4 animate-spin' />
            <span>Executing command...</span>
          </div>
        )}

        {/* Status Indicators */}
        {parsedResult?.status === 'success' && (
          <div className='flex items-center space-x-2 text-sm text-green-600'>
            <CheckCircle className='h-4 w-4' />
            <span>Command completed successfully</span>
          </div>
        )}

        {parsedResult?.status === 'timeout' && (
          <div className='flex items-center space-x-2 text-sm text-yellow-600'>
            <AlertCircle className='h-4 w-4' />
            <span>Command timed out - may still be running</span>
          </div>
        )}

        {parsedResult?.status === 'interactive' && (
          <div className='flex items-center space-x-2 text-sm text-blue-600'>
            <Terminal className='h-4 w-4' />
            <span>Interactive mode - waiting for user input</span>
          </div>
        )}

        {approvalState === 'error' && (
          <div className='flex items-center space-x-2 text-sm text-red-600'>
            <XCircle className='h-4 w-4' />
            <span>Command execution failed</span>
          </div>
        )}
      </div>
    </ToolBlock>
  );
};

export const RenameBlock: React.FC<RenameTool & ToolAddons> = ({
  path,
  new_name,
  type,
  overwrite,
  approvalState,
  tool,
  ts,
  ...rest
}) => {
  // 🎯 自定义右侧操作按钮区域
  const renderActionButtons = () => {
    if (approvalState === 'pending') {
      return (
        <div className='flex items-center space-x-2'>
          {/* Rename 图标按钮 */}
          <Button
            size='sm'
            variant='default'
            className='h-8 w-8 p-0'
            onClick={() => {
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'yesButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Rename File/Directory'
          >
            <Pencil className='h-4 w-4' />
          </Button>

          {/* Cancel 图标按钮 */}
          <Button
            size='sm'
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => {
              vscode.postMessage({
                type: 'askResponse',
                askResponse: 'noButtonTapped',
                text: '',
                images: [],
              });
            }}
            title='Cancel'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <ToolBlock
      {...rest}
      ts={ts}
      tool={tool}
      icon={Pencil}
      title='Rename File/Directory'
      variant='info'
      approvalState={approvalState}
      summary={`${path} → ${new_name}`}
      customActions={renderActionButtons()}
      collapsible={true}
    >
      <div className='space-y-3'>
        <div className='text-xs space-y-1'>
          <p>
            <span className='font-semibold'>Current Path:</span> {path}
          </p>
          <p>
            <span className='font-semibold'>New Name:</span> {new_name}
          </p>
          {type && type !== 'auto' && (
            <p>
              <span className='font-semibold'>Type:</span> {type}
            </p>
          )}
          {overwrite && (
            <p>
              <span className='font-semibold'>Overwrite:</span> Yes
            </p>
          )}
        </div>

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Renaming...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Rename operation completed successfully.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            An error occurred while renaming the file/directory.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const GetErrorsBlock: React.FC<GetErrorsTool & ToolAddons> = ({
  filePaths,
  content,
  approvalState,
  ts,
}) => {
  // Parse XML content
  const parsedResult = useMemo(() => {
    if (!content) return null;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    const status = xmlDoc.querySelector('status')?.textContent || 'unknown';
    const message = xmlDoc.querySelector('message')?.textContent;
    const totalFiles = xmlDoc.querySelector('total_files')?.textContent;
    const totalErrors = xmlDoc.querySelector('total_errors')?.textContent;
    const totalWarnings = xmlDoc.querySelector('total_warnings')?.textContent;

    const files: Array<{
      path: string;
      diagnostics: Array<{
        severity: string;
        line: string;
        column: string;
        message: string;
        code: string;
      }>;
    }> = [];

    xmlDoc.querySelectorAll('file').forEach((fileNode) => {
      const path = fileNode.querySelector('path')?.textContent || '';
      const diagnostics: (typeof files)[0]['diagnostics'] = [];

      fileNode.querySelectorAll('diagnostic').forEach((diagNode) => {
        diagnostics.push({
          severity: diagNode.querySelector('severity')?.textContent || '',
          line: diagNode.querySelector('line')?.textContent || '',
          column: diagNode.querySelector('column')?.textContent || '',
          message: diagNode.querySelector('message')?.textContent || '',
          code: diagNode.querySelector('code')?.textContent || '',
        });
      });

      files.push({ path, diagnostics });
    });

    return { status, message, totalFiles, totalErrors, totalWarnings, files };
  }, [content]);

  const renderActionButtons = () => {
    return null;
  };

  return (
    <ToolBlock
      ts={ts}
      tool='get_errors'
      icon={AlertCircle}
      title='Get Errors & Warnings'
      variant={
        parsedResult?.totalErrors && parseInt(parsedResult.totalErrors) > 0
          ? 'destructive'
          : 'info'
      }
      approvalState={approvalState}
      summary={
        parsedResult?.totalFiles
          ? `${parsedResult.totalFiles} files: ${parsedResult.totalErrors} errors, ${parsedResult.totalWarnings} warnings`
          : filePaths
            ? `Checking ${filePaths.length} file(s)`
            : 'Checking all files'
      }
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={true}
    >
      <div className='space-y-3'>
        {/* Summary */}
        {parsedResult?.message && !parsedResult.files?.length && (
          <p className='text-sm text-muted-foreground'>
            {parsedResult.message}
          </p>
        )}

        {/* Files with diagnostics */}
        {parsedResult?.files && parsedResult.files.length > 0 && (
          <div className='space-y-3'>
            {parsedResult.files.map((file, fileIdx) => (
              <div key={fileIdx} className='border rounded-md p-3 space-y-2'>
                <div className='flex items-center justify-between'>
                  <code className='text-sm font-semibold'>{file.path}</code>
                  <span className='text-xs text-muted-foreground'>
                    {
                      file.diagnostics.filter((d) => d.severity === 'error')
                        .length
                    }{' '}
                    errors,{' '}
                    {
                      file.diagnostics.filter((d) => d.severity === 'warning')
                        .length
                    }{' '}
                    warnings
                  </span>
                </div>

                <div className='space-y-1'>
                  {file.diagnostics.map((diag, diagIdx) => (
                    <div
                      key={diagIdx}
                      className={cn(
                        'text-xs p-2 rounded',
                        diag.severity === 'error'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-yellow-500/10 text-yellow-700'
                      )}
                    >
                      <div className='flex items-start gap-2'>
                        <span className='font-mono'>
                          {diag.line}:{diag.column}
                        </span>
                        <span className='flex-1'>{diag.message}</span>
                        {diag.code !== 'N/A' && (
                          <span className='text-muted-foreground'>
                            ({diag.code})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Retrieving diagnostics...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to retrieve diagnostics.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const ReplaceStringBlock: React.FC<ReplaceStringTool & ToolAddons> = ({
  explanation,
  filePath,
  oldString,
  newString,
  occurrences,
  approvalState,
  ts,
}) => {
  const [showDiff, setShowDiff] = useState(false);

  const renderActionButtons = () => {
    return (
      <Button variant='ghost' size='sm' onClick={() => setShowDiff(!showDiff)}>
        {showDiff ? 'Hide' : 'Show'} Diff
      </Button>
    );
  };

  return (
    <ToolBlock
      ts={ts}
      tool='replace_string_in_file'
      icon={Pencil}
      title='Replace String'
      variant='info'
      approvalState={approvalState}
      summary={`${filePath}${occurrences ? ` (${occurrences} occurrence${occurrences > 1 ? 's' : ''})` : ''}`}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={true}
    >
      <div className='space-y-3'>
        {/* Explanation */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Reason:
          </span>
          <span className='text-sm'>{explanation}</span>
        </div>

        {/* File Path */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            File:
          </span>
          <code className='text-sm bg-muted px-2 py-1 rounded flex-1 break-all'>
            {filePath}
          </code>
        </div>

        {/* Occurrences */}
        {occurrences !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Occurrences:
            </span>
            <span className='text-sm'>{occurrences}</span>
          </div>
        )}

        {/* Diff View */}
        {showDiff && (
          <div className='space-y-2'>
            <div className='border rounded-md p-3 bg-destructive/5'>
              <div className='text-xs font-semibold text-destructive mb-2'>
                - Old String:
              </div>
              <pre className='text-xs whitespace-pre-wrap break-words font-mono'>
                {oldString}
              </pre>
            </div>
            <div className='border rounded-md p-3 bg-success/5'>
              <div className='text-xs font-semibold text-success mb-2'>
                + New String:
              </div>
              <pre className='text-xs whitespace-pre-wrap break-words font-mono'>
                {newString}
              </pre>
            </div>
          </div>
        )}

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Replacing string...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Successfully replaced {occurrences || ''} occurrence
            {occurrences !== 1 ? 's' : ''}.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to replace string. Check the error message above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const MultiReplaceStringBlock: React.FC<
  MultiReplaceStringTool & ToolAddons
> = ({
  explanation,
  replacements,
  successes,
  failures,
  errors,
  summary,
  approvalState,
  ts,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Safely handle undefined or invalid replacements
  const safeReplacements = Array.isArray(replacements) ? replacements : [];

  // Group replacements by file
  const fileGroups = React.useMemo(() => {
    const groups = new Map<string, typeof safeReplacements>();
    for (const replacement of safeReplacements) {
      const existing = groups.get(replacement.filePath) || [];
      existing.push(replacement);
      groups.set(replacement.filePath, existing);
    }
    return groups;
  }, [safeReplacements]);

  const renderActionButtons = () => {
    return (
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? 'Hide' : 'Show'} Details
      </Button>
    );
  };

  const totalReplacements = safeReplacements.length;
  const fileCount = fileGroups.size;
  const summaryText = `${totalReplacements} replacement${totalReplacements > 1 ? 's' : ''} across ${fileCount} file${fileCount > 1 ? 's' : ''}`;

  // Check if replacements data is invalid
  // BUT: Don't show error during loading/pending states (data might not be ready yet)
  const hasInvalidData = !Array.isArray(replacements) &&
    approvalState !== 'loading' &&
    approvalState !== 'pending';

  // Determine variant based on approval state
  // Let ToolBlock handle the variant logic based on approvalState
  // Use 'info' as default to let ToolBlock's internal logic handle state-based colors
  const variant = hasInvalidData ? 'destructive' : 'info';

  return (
    <ToolBlock
      ts={ts}
      tool='multi_replace_string_in_file'
      icon={Pencil}
      title='Multi Replace String'
      variant={variant}
      approvalState={hasInvalidData ? 'error' : approvalState}
      summary={summaryText}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={true}
    >
      <div className='space-y-3'>
        {/* Show loading state */}
        {approvalState === 'loading' && (
          <div className='bg-info/10 border border-info/30 rounded-md p-3'>
            <div className='flex items-center space-x-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info flex-shrink-0'></div>
              <span className='text-sm text-info'>Applying replacements...</span>
            </div>
          </div>
        )}

        {/* Show error if replacements data is invalid */}
        {hasInvalidData && (
          <div className='bg-destructive/10 border border-destructive/30 rounded-md p-3'>
            <div className='flex items-start space-x-2'>
              <AlertCircle className='h-4 w-4 text-destructive mt-0.5 flex-shrink-0' />
              <div className='space-y-1'>
                <div className='text-sm font-medium text-destructive'>
                  Invalid Tool Data
                </div>
                <div className='text-xs text-muted-foreground'>
                  The replacements data is missing or invalid. This may be due to XML parsing failure.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Reason:
          </span>
          <span className='text-sm'>{explanation || 'No explanation provided'}</span>
        </div>

        {/* Summary Stats */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Summary:
          </span>
          <span className='text-sm'>{summaryText}</span>
        </div>

        {/* Success/Failure Stats */}
        {(successes !== undefined || failures !== undefined) && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Results:
            </span>
            <div className='flex gap-3'>
              {successes !== undefined && (
                <span className='text-sm text-success'>
                  ✓ {successes} succeeded
                </span>
              )}
              {failures !== undefined && failures > 0 && (
                <span className='text-sm text-destructive'>
                  ✗ {failures} failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {errors && errors.length > 0 && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>
              Errors:
            </span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3 space-y-1'>
              {errors.map((error, idx) => (
                <div key={idx} className='text-xs text-destructive font-mono'>
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Replacements */}
        {showDetails && (
          <div className='space-y-3 border-t pt-3'>
            <span className='text-sm font-medium text-muted-foreground'>
              Replacements:
            </span>
            {Array.from(fileGroups.entries()).map(
              ([filePath, fileReplacements]) => (
                <div key={filePath} className='space-y-2'>
                  <div className='text-sm font-medium bg-muted px-2 py-1 rounded'>
                    {filePath} ({fileReplacements.length} replacement
                    {fileReplacements.length > 1 ? 's' : ''})
                  </div>
                  {fileReplacements.map((replacement, idx) => (
                    <div key={idx} className='ml-4 space-y-1'>
                      <div className='border rounded-md p-2 bg-destructive/5'>
                        <div className='text-xs font-semibold text-destructive mb-1'>
                          - Old:
                        </div>
                        <pre className='text-xs whitespace-pre-wrap break-words font-mono'>
                          {replacement.oldString}
                        </pre>
                      </div>
                      <div className='border rounded-md p-2 bg-success/5'>
                        <div className='text-xs font-semibold text-success mb-1'>
                          + New:
                        </div>
                        <pre className='text-xs whitespace-pre-wrap break-words font-mono'>
                          {replacement.newString}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Result Summary */}
        {summary && summary.length > 0 && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Applied Changes:
            </span>
            <div className='bg-success/5 border border-success/20 rounded-md p-3 space-y-1'>
              {summary.map((line, idx) => (
                <div key={idx} className='text-xs font-mono'>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Applying replacements...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && !errors?.length && (
          <p className='text-xs mt-2 text-success'>
            Successfully applied {successes || totalReplacements} replacement
            {(successes || totalReplacements) !== 1 ? 's' : ''}.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Multi-replacement completed with errors. See details above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const InsertEditBlock: React.FC<InsertEditTool & ToolAddons> = ({
  explanation,
  filePath,
  startLine,
  endLine,
  code,
  operationType,
  lineRange,
  approvalState,
  ts,
}) => {
  const [showCode, setShowCode] = useState(false);

  // Defensive programming: handle undefined values from validation errors
  const safeCode = code || '';
  const safeExplanation = explanation || 'No explanation provided';
  const safeFilePath = filePath || 'Unknown file';
  const safeStartLine = startLine || 0;

  const isInsertion = operationType === 'insert' || endLine === undefined;
  const operation = isInsertion ? 'Insert' : 'Replace';
  const range =
    lineRange ||
    (isInsertion ? `line ${safeStartLine}` : `lines ${safeStartLine}-${endLine}`);

  const renderActionButtons = () => {
    return (
      <Button variant='ghost' size='sm' onClick={() => setShowCode(!showCode)}>
        {showCode ? 'Hide' : 'Show'} Code
      </Button>
    );
  };

  const linesOfCode = safeCode.split('\n').length;

  return (
    <ToolBlock
      ts={ts}
      tool='insert_edit_into_file'
      icon={FileEdit}
      title={`${operation} Code`}
      variant='info'
      approvalState={approvalState}
      summary={`${operation} at ${range} in ${filePath}`}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={true}
    >
      <div className='space-y-3'>
        {/* Explanation */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Reason:
          </span>
          <span className='text-sm'>{safeExplanation}</span>
        </div>

        {/* File and Location */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            File:
          </span>
          <span className='text-sm font-mono'>{safeFilePath}</span>
        </div>

        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Location:
          </span>
          <span className='text-sm'>{range}</span>
        </div>

        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Lines:
          </span>
          <span className='text-sm'>
            {linesOfCode} line{linesOfCode !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Code Preview */}
        {showCode && safeCode && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Code:
            </span>
            <div className='border rounded-md p-3 bg-muted/30'>
              <pre className='text-xs whitespace-pre-wrap break-words font-mono overflow-x-auto'>
                {safeCode}
              </pre>
            </div>
          </div>
        )}

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>
              Applying {operation.toLowerCase()}...
            </span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && (
          <p className='text-xs mt-2 text-success'>
            Successfully {isInsertion ? 'inserted' : 'replaced'} code at {range}
            .
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to {operation.toLowerCase()} code. See error details above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const FetchWebpageBlock: React.FC<FetchWebpageTool & ToolAddons> = ({
  urls,
  url,
  query,
  approvalState,
  ts,
}) => {
  // Support both single URL (backward compatibility) and multiple URLs
  const urlList = urls || (url ? [url] : []);
  const urlCount = urlList.length;

  const summary = urlCount > 0
    ? query
      ? `Fetching ${urlCount} URL${urlCount > 1 ? 's' : ''} (filtered by: "${query}")`
      : `Fetching ${urlCount} URL${urlCount > 1 ? 's' : ''}`
    : 'Fetch Web Page';

  return (
    <ToolBlock
      ts={ts}
      tool='fetch_webpage'
      icon={Search}
      title='Fetch Web Page'
      variant='info'
      approvalState={approvalState}
      summary={summary}
      collapsible={true}
      defaultExpanded={false}
    >
      <div className='space-y-1'>
        {/* URLs */}
        {urlList.length > 0 && (
          <div className='flex items-start space-x-2'>
            <span className='text-xs font-medium text-muted-foreground min-w-[60px]'>
              URL{urlList.length > 1 ? 's' : ''}:
            </span>
            <div className='flex-1 space-y-0.5'>
              {urlList.map((urlItem, index) => (
                <a
                  key={index}
                  href={urlItem}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs font-mono text-primary hover:underline break-all block'
                >
                  {urlItem}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Query */}
        {query && (
          <div className='flex items-start space-x-2'>
            <span className='text-xs font-medium text-muted-foreground min-w-[60px]'>
              Query:
            </span>
            <span className='text-xs'>{query}</span>
          </div>
        )}
      </div>
    </ToolBlock>
  );
};

const VscodeApiBlock: React.FC<VscodeApiTool & ToolAddons> = ({
  query,
  results,
  resultCount,
  error,
  approvalState,
  ts,
}) => {
  const [showResults, setShowResults] = useState(false);

  const renderActionButtons = () => {
    if (!results) return null;
    return (
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowResults(!showResults)}
      >
        {showResults ? 'Hide' : 'Show'} Results
      </Button>
    );
  };

  const summary =
    resultCount !== undefined
      ? `Found ${resultCount} result${resultCount !== 1 ? 's' : ''} for "${query}"`
      : `Searching for "${query}"`;

  return (
    <ToolBlock
      ts={ts}
      tool='get_vscode_api'
      icon={Search}
      title='VS Code API Search'
      variant='info'
      approvalState={approvalState}
      summary={summary}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={true}
    >
      <div className='space-y-3'>
        {/* Query */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Query:
          </span>
          <span className='text-sm font-mono'>{query}</span>
        </div>

        {/* Result Count */}
        {resultCount !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Results:
            </span>
            <span className='text-sm'>
              {resultCount} section{resultCount !== 1 ? 's' : ''} found
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>Error:</span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3'>
              <p className='text-xs text-destructive font-mono'>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && showResults && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              API Documentation:
            </span>
            <div className='border rounded-md p-3 bg-muted/30 max-h-96 overflow-y-auto'>
              <pre className='text-xs whitespace-pre-wrap break-words font-mono'>
                {results}
              </pre>
            </div>
          </div>
        )}

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>
              Searching VS Code API documentation...
            </span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && results && (
          <p className='text-xs mt-2 text-success'>
            Successfully found {resultCount} result
            {resultCount !== 1 ? 's' : ''} for "{query}".
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to search VS Code API. See error details above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const GrepSearchBlock: React.FC<GrepSearchTool & ToolAddons> = ({
  query,
  isRegexp,
  includePattern,
  maxResults,
  totalMatches,
  filesMatched,
  matches,
  error,
  approvalState,
  ts,
}) => {
  const [showMatches, setShowMatches] = useState(false);

  const renderActionButtons = () => {
    if (!matches || matches.length === 0) return null;
    return (
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowMatches(!showMatches)}
      >
        {showMatches ? 'Hide' : 'Show'} Matches
      </Button>
    );
  };

  const summary =
    approvalState === 'loading'
      ? `Searching for "${query}"...`
      : totalMatches !== undefined
        ? `Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${filesMatched} file${filesMatched !== 1 ? 's' : ''}`
        : `Searching for "${query}"`;

  return (
    <ToolBlock
      ts={ts}
      tool='grep_search'
      icon={Search}
      title='Grep Search'
      variant='info'
      approvalState={approvalState}
      summary={summary}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={approvalState === 'loading' ? false : true}
    >
      <div className='space-y-3'>
        {/* Query */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
            Query:
          </span>
          <span className='text-sm font-mono'>{query}</span>
        </div>

        {/* Regex mode */}
        {isRegexp !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Mode:
            </span>
            <span className='text-sm'>
              {isRegexp ? 'Regular Expression' : 'Plain Text'}
            </span>
          </div>
        )}

        {/* Include pattern */}
        {includePattern && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Pattern:
            </span>
            <span className='text-sm font-mono'>{includePattern}</span>
          </div>
        )}

        {/* Loading State - Show prominently when searching */}
        {approvalState === 'loading' && (
          <div className='flex items-center space-x-2 p-3 bg-info/10 border border-info/20 rounded-md'>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
            <span className='text-sm'>Searching files...</span>
          </div>
        )}

        {/* Results summary */}
        {totalMatches !== undefined && approvalState !== 'loading' && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
              Results:
            </span>
            <span className='text-sm'>
              {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in{' '}
              {filesMatched} file
              {filesMatched !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>Error:</span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3'>
              <p className='text-xs text-destructive font-mono'>{error}</p>
            </div>
          </div>
        )}

        {/* Matches */}
        {matches && matches.length > 0 && showMatches && approvalState !== 'loading' && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Matches:
            </span>
            <div className='border rounded-md p-3 bg-muted/30 max-h-96 overflow-y-auto space-y-3'>
              {matches.map((match, idx) => (
                <div key={idx} className='space-y-1'>
                  <div className='text-xs font-semibold text-primary'>
                    {match.file}
                  </div>
                  {match.ranges.map((range, rangeIdx) => (
                    <div key={rangeIdx} className='ml-3 text-xs'>
                      <span className='text-muted-foreground'>
                        Line {range.line}, Col {range.column}:
                      </span>
                      <pre className='mt-1 p-2 bg-background rounded text-xs overflow-x-auto'>
                        {range.preview}
                      </pre>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {approvalState === 'approved' && totalMatches !== undefined && (
          <p className='text-xs mt-2 text-success'>
            Search completed successfully. Found {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in{' '}
            {filesMatched} file
            {filesMatched !== 1 ? 's' : ''}.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to search files. See error details above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const PatternSearchBlock: React.FC<PatternSearchTool & ToolAddons> = ({
  searchPattern,
  files,
  caseSensitive,
  contextLinesBefore,
  contextLinesAfter,
  results,
  totalMatches,
  filesSearched,
  error,
  approvalState,
  ts,
}) => {
  const [showResults, setShowResults] = useState(false);

  // Defensive programming: ensure files is always an array
  const safeFiles = Array.isArray(files) ? files : [];
  const safeSearchPattern = searchPattern || 'No pattern provided';
  const hasInvalidData = !Array.isArray(files);

  const renderActionButtons = () => {
    if (!results || results.length === 0) return null;
    return (
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowResults(!showResults)}
      >
        {showResults ? 'Hide' : 'Show'} Results
      </Button>
    );
  };

  const summary =
    approvalState === 'loading'
      ? `Searching for "${safeSearchPattern}"...`
      : totalMatches !== undefined
        ? `Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${filesSearched} file${filesSearched !== 1 ? 's' : ''}`
        : `Searching for "${safeSearchPattern}"`;

  return (
    <ToolBlock
      ts={ts}
      tool='pattern_search'
      icon={Search}
      title='Pattern Search'
      variant='info'
      approvalState={approvalState}
      summary={summary}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={approvalState === 'loading' ? false : true}
    >
      <div className='space-y-3'>
        {/* Validation Error */}
        {hasInvalidData && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>Validation Error:</span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3'>
              <p className='text-xs text-destructive font-mono'>
                Invalid data received. The 'files' parameter should be an array but received: {typeof files}
              </p>
            </div>
          </div>
        )}

        {/* Search Pattern */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[120px]'>
            Pattern:
          </span>
          <span className='text-sm font-mono'>{safeSearchPattern}</span>
        </div>

        {/* Files */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[120px]'>
            Files:
          </span>
          <span className='text-sm'>{safeFiles.length} file{safeFiles.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Case Sensitive */}
        {caseSensitive !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[120px]'>
              Case Sensitive:
            </span>
            <span className='text-sm'>{caseSensitive ? 'Yes' : 'No'}</span>
          </div>
        )}

        {/* Context Lines */}
        {(contextLinesBefore !== undefined || contextLinesAfter !== undefined) && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[120px]'>
              Context Lines:
            </span>
            <span className='text-sm'>
              {contextLinesBefore ?? 5} before, {contextLinesAfter ?? 5} after
            </span>
          </div>
        )}

        {/* Results Summary */}
        {totalMatches !== undefined && filesSearched !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[120px]'>
              Results:
            </span>
            <span className='text-sm'>
              {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in{' '}
              {filesSearched} file{filesSearched !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>Error:</span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3'>
              <p className='text-xs text-destructive font-mono'>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && results.length > 0 && showResults && approvalState !== 'loading' && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Search Results:
            </span>
            <div className='border rounded-md p-3 bg-muted/30 max-h-96 overflow-y-auto'>
              <pre className='text-xs whitespace-pre-wrap font-mono'>{results}</pre>
            </div>
          </div>
        )}

        {approvalState === 'approved' && totalMatches !== undefined && (
          <p className='text-xs mt-2 text-success'>
            Search completed successfully. Found {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in{' '}
            {filesSearched} file{filesSearched !== 1 ? 's' : ''}.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to search files. See error details above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

const GetTerminalOutputBlock: React.FC<GetTerminalOutputTool & ToolAddons> = ({
  terminalId,
  maxChars,
  terminalName,
  shellType,
  outputLength,
  output,
  error,
  approvalState,
  ts,
}) => {
  const [showOutput, setShowOutput] = useState(false);

  const renderActionButtons = () => {
    if (!output || output.length === 0) return null;
    return (
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setShowOutput(!showOutput)}
      >
        {showOutput ? 'Hide' : 'Show'} Output
      </Button>
    );
  };

  const summary = terminalName
    ? `Terminal: ${terminalName}${outputLength !== undefined ? ` (${outputLength} chars)` : ''}`
    : `Terminal Output${outputLength !== undefined ? ` (${outputLength} chars)` : ''}`;

  return (
    <ToolBlock
      ts={ts}
      tool='get_terminal_output'
      icon={Terminal}
      title='Get Terminal Output'
      variant='info'
      approvalState={approvalState}
      summary={summary}
      customActions={renderActionButtons()}
      collapsible={true}
      defaultExpanded={true}
    >
      <div className='space-y-3'>
        {/* Terminal Info */}
        {terminalId !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[100px]'>
              Terminal ID:
            </span>
            <span className='text-sm font-mono'>{terminalId}</span>
          </div>
        )}

        {terminalName && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[100px]'>
              Name:
            </span>
            <span className='text-sm'>{terminalName}</span>
          </div>
        )}

        {shellType && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[100px]'>
              Shell:
            </span>
            <span className='text-sm font-mono'>{shellType}</span>
          </div>
        )}

        {maxChars !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[100px]'>
              Max Chars:
            </span>
            <span className='text-sm'>{maxChars}</span>
          </div>
        )}

        {outputLength !== undefined && (
          <div className='flex items-start space-x-2'>
            <span className='text-sm font-medium text-muted-foreground min-w-[100px]'>
              Output Length:
            </span>
            <span className='text-sm'>{outputLength} characters</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>Error:</span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3'>
              <p className='text-xs text-destructive font-mono'>{error}</p>
            </div>
          </div>
        )}

        {/* Output */}
        {output && showOutput && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Output:
            </span>
            <div className='border rounded-md p-3 bg-muted/30 max-h-96 overflow-y-auto'>
              <pre className='text-xs font-mono whitespace-pre-wrap break-words'>
                {output}
              </pre>
            </div>
          </div>
        )}

        {approvalState === 'loading' && (
          <div className='mt-2 flex items-center'>
            <span className='text-xs mr-2'>Reading terminal output...</span>
            <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary'></div>
          </div>
        )}

        {approvalState === 'approved' && outputLength !== undefined && (
          <p className='text-xs mt-2 text-success'>
            Retrieved {outputLength} characters from terminal.
          </p>
        )}

        {approvalState === 'error' && (
          <p className='text-xs mt-2 text-destructive'>
            Failed to get terminal output. See error details above.
          </p>
        )}
      </div>
    </ToolBlock>
  );
};

// ============================================================================
// LOCAL TIME TOOL BLOCK - Independent component for displaying local time
// ============================================================================

interface LocalTimeToolProps extends LocalTimeTool {
  ts: number;
  approvalState?: ToolStatus;
  tool: 'local_time';
}

/**
 * Local Time Tool Component
 *
 * Displays a static snapshot of local time when the tool was called.
 * Does NOT update in real-time - shows the captured time only.
 *
 * Receives clean 'local_time' tool type from backend - no confusion with timer.
 */
const LocalTimeToolBlock: React.FC<LocalTimeToolProps> = ({
  note,
  localTime,
  approvalState,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format local date time (YYYY-MM-DD HH:MM:SS)
  const formatLocalDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const displayTime = formatLocalDateTime(localTime);

  return (
    <div className='rounded-sm border-l-4 border-l-green-500 bg-card text-card-foreground'>
      {/* Header Row - Clickable to expand/collapse */}
      <div
        className='flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left side: Icon + Title + Time */}
        <div className='flex items-center flex-1 min-w-0'>
          {/* Icon */}
          <CheckCircle className='h-4 w-4 text-green-600' />

          {/* Title */}
          <h3 className='text-sm font-semibold mx-3 flex-shrink-0'>Local Time</h3>

          {/* Time Display */}
          <span className='text-xs text-muted-foreground truncate'>
            <span className='font-mono font-semibold text-green-600 dark:text-green-400'>
              {displayTime}
            </span>
            {note && <> • {note}</>}
          </span>
        </div>

        {/* Right side: Chevron */}
        <div className='flex items-center space-x-2'>
          {isExpanded ? (
            <ChevronUp className='w-4 h-4 text-muted-foreground' />
          ) : (
            <ChevronDown className='w-4 h-4 text-muted-foreground' />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className='px-3 pb-3'>
          <div className='text-sm border-t pt-3 space-y-3'>
            {/* Local Time Display */}
            <div className='flex flex-col items-center justify-center py-4'>
              <span className='text-xs font-semibold text-muted-foreground mb-2'>
                Local Time
              </span>
              <span className='font-mono text-3xl font-bold text-green-600 dark:text-green-400'>
                {displayTime}
              </span>
            </div>

            {/* Note */}
            {note && (
              <p className='text-xs text-center'>
                <span className='font-semibold'>Note:</span> {note}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// ============================================================================
// TIMER TOOL BLOCK - Independent component for countdown timer
// ============================================================================

// Timer has its own internal state, independent of system approvalState
type TimerInternalState = 'running' | 'completed' | 'stopped' | 'error';

interface TimerToolProps extends TimerTool {
  approvalState?: ToolStatus;
  ts: number;
  tool: 'timer';
}

/**
 * Timer Tool Component
 *
 * Independent timer component with its own state management.
 * Does NOT use ToolBlock - has custom styling to match system tools.
 * 
 * Key Design:
 * - Internal state (timerState) controls the UI, NOT system approvalState
 * - Timer naturally counts down to 0 based on startTime/endTime
 * - When countdown reaches 0, automatically switches to 'completed' state
 * - System approvalState is only used for error detection
 */
const TimerToolBlock: React.FC<TimerToolProps> = ({
  duration,
  note,
  startTime,
  endTime,
  approvalState,
  timerStatus,
  ts,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Use timerStatus from backend, fallback to 'running' if not set
  const [timerState, setTimerState] = useState<TimerInternalState>(timerStatus || 'running');

  // Collapsible state
  const [isExpanded, setIsExpanded] = useState(false);

  // Sound hook for playing stop sound
  const { playSound, stopSound } = useSound();

  // Sync with backend timerStatus
  React.useEffect(() => {
    if (timerStatus) {
      setTimerState(timerStatus);
    }
  }, [timerStatus]);

  // Update current time every 100ms when timer is running
  React.useEffect(() => {
    if (timerState === 'running' && startTime && endTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        setCurrentTime(now);

        // Check if timer naturally completed
        if (endTime && now >= endTime) {
          setTimerState('completed');
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [timerState, startTime, endTime]);
  
  // Sync with system approvalState for error states only
  // Don't override stopped or completed states
  React.useEffect(() => {
    if (approvalState === 'error' && timerState !== 'stopped' && timerState !== 'completed') {
      setTimerState('error');
    }
  }, [approvalState, timerState]);

  // Ensure clockTicking sound is stopped when timer is no longer running
  React.useEffect(() => {
    if (timerState !== 'running') {
      // Force stop the ticking sound when timer is not running
      stopSound('clockTicking');
    }
  }, [timerState, stopSound]);

  // Format time in HH:MM:SS:mmm format
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const ms = Math.floor(((totalSeconds % 1) * 1000));
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
  };

  // Format local date time (YYYY-MM-DD HH:MM:SS)
  const formatLocalDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Calculate remaining time based on internal timer state (with milliseconds precision)
  const getRemainingTime = (): number => {
    if (!startTime || !endTime) return duration || 0;

    if (timerState === 'completed') {
      return 0;
    }

    // For stopped state, show the remaining time at the moment it was stopped
    const remaining = Math.max(0, endTime - currentTime);
    return remaining / 1000; // Return with decimal for milliseconds
  };

  // Calculate progress percentage based on internal timer state
  const getProgress = (): number => {
    if (!startTime || !endTime) return 0;

    if (timerState === 'completed') {
      return 100;
    }

    const total = endTime - startTime;
    const elapsed = currentTime - startTime;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  // Calculate display time for countdown timer
  const remainingSeconds = getRemainingTime();
  const displayTime = formatTime(remainingSeconds);
  const progress = getProgress();

  // Handle stop timer
  const handleStopTimer = () => {
    setTimerState('stopped');

    // Stop ticking sound and play pop sound
    stopSound('clockTicking');
    playSound('pop', false, 'timer');

    // Send message to backend to stop the timer
    vscode.postMessage({
      type: 'stopTimer',
      timerId: ts.toString(),
    });
  };

  // Get border color based on timer state
  const getBorderColor = () => {
    switch (timerState) {
      case 'completed':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'stopped':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (timerState) {
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-600' />;
      case 'error':
        return <AlertCircle className='h-4 w-4 text-red-600' />;
      default:
        return <Timer className='h-4 w-4 text-blue-600' />;
    }
  };

  // Get countdown color based on timer state
  const getCountdownColor = () => {
    switch (timerState) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'stopped':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'running':
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  // Get status message with timestamp
  const getStatusMessage = () => {
    const now = Date.now();
    const currentLocalTime = formatLocalDateTime(now);

    switch (timerState) {
      case 'completed':
        return `Timer completed at ${currentLocalTime}`;
      case 'error':
        return `Timer failed at ${currentLocalTime}`;
      case 'stopped':
        return `Timer stopped at ${currentLocalTime}`;
      case 'running':
        return `Timer running - Current time: ${currentLocalTime}`;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      'rounded-sm border-l-4 bg-card text-card-foreground',
      getBorderColor()
    )}>
      {/* Header Row - Clickable to expand/collapse */}
      <div
        className='flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left side: Icon + Title + Summary */}
        <div className='flex items-center flex-1 min-w-0'>
          {/* Icon */}
          {getStatusIcon()}

          {/* Title */}
          <h3 className='text-sm font-semibold mx-3 flex-shrink-0'>Timer</h3>

          {/* Summary - Time + Progress */}
          <span className='text-xs text-muted-foreground truncate'>
            <span className={cn('font-mono font-semibold', getCountdownColor())}>
              {displayTime}
            </span>
            <> • {Math.round(progress)}%</>
            {note && <> • {note}</>}
          </span>
        </div>

        {/* Right side: Stop Button + Status + Chevron */}
        <div className='flex items-center space-x-2'>
          {/* Stop Button */}
          {timerState === 'running' && (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                size='sm'
                variant='ghost'
                className='h-8 w-8 p-0'
                onClick={handleStopTimer}
                title='Stop timer'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          )}

          {/* Chevron Icon */}
          {isExpanded ? (
            <ChevronUp className='w-4 h-4 text-muted-foreground' />
          ) : (
            <ChevronDown className='w-4 h-4 text-muted-foreground' />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className='px-3 pb-3'>
          <div className='text-sm border-t pt-3 space-y-3'>
            {/* Time Display */}
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>
                Time Remaining:
              </span>
              <span className={cn(
                'font-mono text-2xl font-bold tabular-nums',
                timerState === 'completed' ? 'text-green-600' :
                timerState === 'error' ? 'text-red-600' :
                timerState === 'stopped' ? 'text-yellow-600' :
                'text-blue-600'
              )}>
                {displayTime}
              </span>
            </div>

            {/* Progress Bar */}
            {timerState === 'running' && (
              <div className='flex items-center gap-2'>
                <div className='flex-1 h-2 bg-muted rounded-full overflow-hidden'>
                  <div
                    className='h-full transition-all duration-300 bg-blue-500'
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className='text-xs text-muted-foreground whitespace-nowrap min-w-[35px] font-mono'>
                  {Math.round(progress)}%
                </span>
              </div>
            )}

            {/* Status Message */}
            {getStatusMessage() && (
              <p className='text-xs text-muted-foreground'>
                {getStatusMessage()}
              </p>
            )}

            {/* Total Duration */}
            {duration !== undefined && duration > 0 && (
              <p className='text-xs'>
                <span className='font-semibold'>Total Duration:</span> {duration}s ({Math.floor(duration / 3600)}h {Math.floor((duration % 3600) / 60)}m {duration % 60}s)
              </p>
            )}

            {/* Start Time */}
            {startTime && (
              <p className='text-xs'>
                <span className='font-semibold'>Start Time:</span> {formatLocalDateTime(startTime)}
              </p>
            )}

            {/* End Time / ETA */}
            {endTime && (
              <p className='text-xs'>
                <span className='font-semibold'>{timerState === 'running' ? 'Expected End Time:' : 'End Time:'}</span> {formatLocalDateTime(endTime)}
              </p>
            )}

            {/* Note */}
            {note && (
              <p className='text-xs'>
                <span className='font-semibold'>Note:</span> {note}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const ToolRenderer: React.FC<{
  tool: ChatTool;
  hasNextMessage?: boolean;
}> = ({ tool }) => {
  switch (tool.tool) {
    case 'execute_command':
      return <ExecuteCommandBlock hasNextMessage {...tool} />;
    case 'list_files':
      return <ListFilesBlock {...tool} />;
    case 'explore_repo_folder':
      return <ExploreRepoFolderBlock {...tool} />;
    case 'search_files':
      return <SearchFilesBlock {...tool} />;
    case 'read_file':
      return <ReadFileBlock {...tool} />;
    case 'file_editor':
      return <FileEditorTool {...tool} />;
    case 'ask_followup_question':
      return <AskFollowupQuestionBlock {...tool} />;
    case 'attempt_completion':
      return <AttemptCompletionBlock {...tool} />;
    case 'web_search':
      return <EnhancedWebSearchBlock {...tool} />;
    case 'url_screenshot':
      return <UrlScreenshotBlock {...tool} />;
    case 'server_runner':
      return <DevServerToolBlock {...tool} />;
    case 'search_symbol':
      return <SearchSymbolBlock {...tool} />;
    case 'add_interested_file':
      return <AddInterestedFileBlock {...tool} />;
    case 'spawn_agent':
      return <SpawnAgentBlock {...tool} />;
    case 'exit_agent':
      return <ExitAgentBlock {...tool} />;
    case 'submit_review':
      return <SubmitReviewBlock {...tool} />;
    case 'move':
      return <MoveBlock {...tool} />;
    case 'remove':
      return <RemoveBlock {...tool} />;
    case 'rename':
      return <RenameBlock {...tool} />;
    case 'git_bash':
      return <GitBashBlock {...tool} />;
    case 'kill_bash':
      return <KillBashBlock {...tool} />;
    case 'read_progress':
      return <ReadProgressBlock {...tool} />;
    case 'terminal':
      return <TerminalBlock {...tool} />;
    case 'get_errors':
      return <GetErrorsBlock {...tool} />;
    case 'replace_string_in_file':
      return <ReplaceStringBlock {...tool} />;
    case 'multi_replace_string_in_file':
      return <MultiReplaceStringBlock {...tool} />;
    case 'insert_edit_into_file':
      return <InsertEditBlock {...tool} />;
    case 'fetch_webpage':
      return <FetchWebpageBlock {...tool} />;
    case 'get_vscode_api':
      return <VscodeApiBlock {...tool} />;
    case 'grep_search':
      return <GrepSearchBlock {...tool} />;
    case 'pattern_search':
      return <PatternSearchBlock {...tool} />;
    case 'get_terminal_output':
      return <GetTerminalOutputBlock {...tool} />;
    case 'think':
      return <ThinkToolBlock {...tool} />;
    case 'fast_editor':
      return <FastEditorToolBlock {...tool} />;
    case 'local_time':
      // Clean tool type - directly render LocalTimeToolBlock
      return <LocalTimeToolBlock {...tool} />;
    case 'timer':
      // Clean tool type - directly render TimerToolBlock
      return <TimerToolBlock {...tool} />;
    case 'context7':
      return <Context7ToolBlock {...tool} />;
    case 'read_image':
      return <ReadImageToolBlock {...tool} />;
    default:
      return null;
  }
};
