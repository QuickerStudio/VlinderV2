import React, { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Edit,
  Undo2,
  ExternalLink,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { vscode } from '@/utils/vscode';
import { FileEditorTool as FileEditorToolParams } from 'extension/shared/new-tools';
import { ToolAddons, ToolBlock } from '../chat-tools';
import { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import MarkdownRenderer from '../markdown-renderer';
import { getLanguageFromPath } from '@/utils/get-language-from-path';
import { CodeBlock } from '../code-block';
import { rpcClient } from '@/lib/rpc-client';
import { useExtensionState } from '@/context/extension-state-context';

type ApprovalState = ToolAddons['approvalState'];

export const FileEditorTool: React.FC<FileEditorToolParams & ToolAddons> = memo(
  ({
    path,
    mode = 'whole_write',
    content,
    diff,
    list_versions_output,
    rollback_version,
    notAppliedCount = 0,
    approvalState,
    tool,
    ts,
    ...rest
  }) => {
    const extensionState = useExtensionState();
    const isViewOrRollbackPossible = useMemo(
      () => (mode === 'whole_write' || mode === 'edit') && rest.saved_version,
      [mode, rest.saved_version]
    );
    const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false);

    // Determine displayed content
    let displayedContent = '';
    if (mode === 'list_versions' && list_versions_output) {
      displayedContent = list_versions_output;
    } else if (content) {
      displayedContent = content;
    } else if (diff) {
      displayedContent = diff;
    } else {
      displayedContent = '';
    }

    const totalLines = displayedContent.split('\n').length;

    const handleRollback = () => {
      if (!rest.saved_version) return;
      vscode.postMessage({
        type: 'rollbackToCheckpoint',
        path,
        version: rest.saved_version,
        ts,
      });
      setIsRollbackDialogOpen(false);
    };

    const handleViewFile = () => {
      if (rest.saved_version) {
        vscode.postMessage({
          type: 'viewFile',
          path,
          version: rest.saved_version,
        });
      }
    };

    const handleGitRevert = async () => {
      if (!rest.commitHash) return;
      try {
        const result = await rpcClient.revertToCommit.use({
          commitHash: rest.commitHash,
        });
        if (result.success) {
          console.log(`Successfully reverted to commit ${rest.commitHash}`);
        } else {
          console.error(`Failed to revert: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error reverting to commit: ${error}`);
      }
    };

    // 🎯 Custom right-side action button area
    const renderActionButtons = () => {
      const buttons = [];

      // Git撤销按钮 - 当gitHandlerEnabled为true且有commitHash时显示
      if (
        extensionState.gitHandlerEnabled &&
        rest.commitHash &&
        approvalState === 'approved'
      ) {
        buttons.push(
          <Tooltip key='git-revert'>
            <TooltipTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={handleGitRevert}
                title='Revert to Git Node'
              >
                <Undo2 className='h-4 w-4 text-cyan-500' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='left'>Revert to Git Node</TooltipContent>
          </Tooltip>
        );
      }

      if (approvalState === 'pending') {
        buttons.push(
          // Approve icon button
          <Button
            key='approve'
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
            title='Approve Changes'
          >
            <Check className='h-4 w-4' />
          </Button>,

          // Reject icon button
          <Button
            key='reject'
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
            title='Reject Changes'
          >
            <X className='h-4 w-4' />
          </Button>
        );
      }

      return buttons.length > 0 ? (
        <div className='flex items-center space-x-2'>{buttons}</div>
      ) : null;
    };

    // Determine mode label
    let modeLabel = '';
    switch (mode) {
      case 'edit':
        modeLabel = 'Edit';
        break;
      case 'whole_write':
        modeLabel = 'Whole File';
        break;
      case 'rollback':
        modeLabel = 'Rollback';
        break;
      case 'list_versions':
        modeLabel = 'List Versions';
        break;
      default:
        modeLabel = 'Unknown';
    }

    return (
      <ToolBlock
        {...rest}
        ts={ts}
        tool={tool}
        icon={Edit}
        title='File Editor'
        variant='info'
        approvalState={approvalState}
        summary={`${path} (${modeLabel})`} // Display file path and mode in single-row layout
        customActions={renderActionButtons()} // 🎯 Add custom action buttons
        collapsible={true}
      >
        <div className='flex flex-col space-y-2'>
          <div className='flex items-center gap-2 flex-wrap'>
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
            <Badge variant='outline'>{modeLabel}</Badge>
            {notAppliedCount > 0 && (
              <Badge variant='destructive' className='animate-pulse'>
                {notAppliedCount} changes not applied
              </Badge>
            )}
          </div>

          <ScrollArea className='h-24 rounded border bg-background p-2'>
            <ScrollBar orientation='vertical' />
            <ScrollBar orientation='horizontal' />
            <pre className='text-xs whitespace-pre-wrap'>
              {displayedContent?.trim()}
            </pre>
          </ScrollArea>

          <div className='flex justify-between items-center'>
            <span className='text-xs text-muted-foreground'>{`${totalLines} lines`}</span>
            {/* <div className="flex gap-2 flex-wrap justify-end">
							<Button
								variant="outline"
								size="sm"
								disabled={!isViewOrRollbackPossible}
								onClick={handleViewFile}
								className="flex items-center space-x-1 w-[94px]">
								<ExternalLink className="w-4 h-4" />
								<span>View File</span>
							</Button>
							<Button
								variant="destructive"
								size="sm"
								// temporary disabled
								disabled={true}
								onClick={() => setIsRollbackDialogOpen(true)}
								className="flex items-center space-x-1 w-[94px]">
								<Undo2 className="w-4 h-4" />
								<span>Rollback</span>
							</Button>
						</div> */}
          </div>
        </div>

        <AlertDialog
          open={isRollbackDialogOpen}
          onOpenChange={setIsRollbackDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className='flex items-center space-x-2'>
                <AlertTriangle className='w-5 h-5 text-destructive' />
                <span>Confirm Rollback</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will revert the file to the chosen version. Are you
                sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant='destructive' asChild>
                <AlertDialogAction onClick={handleRollback}>
                  Yes, Roll Back
                </AlertDialogAction>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ToolBlock>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.approvalState === nextProps.approvalState &&
      prevProps.content === nextProps.content &&
      prevProps.diff === nextProps.diff &&
      prevProps.list_versions_output === nextProps.list_versions_output &&
      prevProps.ts === nextProps.ts &&
      prevProps.path === nextProps.path &&
      prevProps.notAppliedCount === nextProps.notAppliedCount &&
      prevProps.mode === nextProps.mode &&
      prevProps.rollback_version === nextProps.rollback_version
    );
  }
);
