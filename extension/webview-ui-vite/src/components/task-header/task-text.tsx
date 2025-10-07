import {
  extractAdditionalContext,
  extractFilesFromContext,
  extractUrlsFromContext,
} from '@/utils/extract-attachments';
import React from 'react';
import AttachmentsList, { FileItem, UrlItem } from '../chat-row/file-list';

interface TaskTextProps {
  text?: string;
}

const TaskText: React.FC<TaskTextProps> = ({ text }) => {
  const parts = extractAdditionalContext(text || '');
  let filesCut: FileItem[] = [];
  if (parts[1]) {
    filesCut = extractFilesFromContext(parts[1]);
  }
  let urlsCut: UrlItem[] = [];
  if (parts[1]) {
    urlsCut = extractUrlsFromContext(parts[1]);
  }

  return (
    <>
      <div
        className='w-full relative'
        style={{
          height: '24px', // 固定高度，适合1行文本
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 1, // 限制为1行
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            fontSize: '14px', // 固定字体大小，不使用var(--vscode-font-size)
            lineHeight: '1.4', // 固定行高
            fontWeight: 'bold', // 设置为粗体
            color: '#dd357bff', // 亮粉色
          }}
        >
          {parts[0]?.trim()}
        </div>
        <AttachmentsList files={filesCut} urls={urlsCut} />
      </div>
    </>
  );
};

export default TaskText;
