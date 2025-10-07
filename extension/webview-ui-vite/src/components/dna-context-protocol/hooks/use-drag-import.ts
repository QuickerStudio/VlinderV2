import { useCallback, useRef } from 'react';

interface DragImportOptions {
  onImport: (code: string, filename: string) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

export function useDragImport({
  onImport,
  onError,
  onInfo,
}: DragImportOptions) {
  const dragCounterRef = useRef(0);

  // Smart Mermaid code extraction
  const extractMermaidCode = useCallback(
    (content: string, filename: string): string | null => {
      const trimmedContent = content.trim();

      // 1. Check if it's pure Mermaid code (starts with diagram type)
      const mermaidTypes = [
        'graph',
        'flowchart',
        'sequenceDiagram',
        'classDiagram',
        'stateDiagram',
        'erDiagram',
        'journey',
        'gantt',
        'pie',
        'gitgraph',
        'mindmap',
        'timeline',
        'sankey',
        'block',
        'architecture',
        'c4Context',
      ];

      const firstLine = trimmedContent.split('\n')[0].toLowerCase().trim();
      const isPureMermaid = mermaidTypes.some(
        (type) => firstLine.startsWith(type) || firstLine.startsWith(type + ':')
      );

      if (isPureMermaid) {
        return trimmedContent;
      }

      // 2. Extract Mermaid code blocks from Markdown
      const mermaidBlockRegex = /```(?:mermaid|mer)\s*\n([\s\S]*?)\n```/gi;
      const matches = [...content.matchAll(mermaidBlockRegex)];

      if (matches.length > 0) {
        // If there are multiple code blocks, take the first one
        const extractedCode = matches[0][1].trim();
        if (matches.length > 1) {
          onInfo(
            `Detected ${matches.length} Mermaid code blocks, imported the first one`
          );
        }
        return extractedCode;
      }

      // 3. Try to detect unmarked code blocks (in ``` but without mermaid identifier)
      const codeBlockRegex = /```\s*\n([\s\S]*?)\n```/gi;
      const codeMatches = [...content.matchAll(codeBlockRegex)];

      for (const match of codeMatches) {
        const code = match[1].trim();
        const codeFirstLine = code.split('\n')[0].toLowerCase().trim();
        const isMermaidCode = mermaidTypes.some(
          (type) =>
            codeFirstLine.startsWith(type) ||
            codeFirstLine.startsWith(type + ':')
        );

        if (isMermaidCode) {
          onInfo('Detected unmarked Mermaid code block, auto-identified');
          return code;
        }
      }

      // 4. Finally try the entire file content (might be Mermaid without code block wrapper)
      if (
        filename.toLowerCase().includes('mermaid') ||
        filename.endsWith('.mmd')
      ) {
        return trimmedContent;
      }

      return null;
    },
    [onInfo]
  );

  // Handle file reading
  const handleFileRead = useCallback(
    (file: File) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            onError('File content is empty');
            return;
          }

          const mermaidCode = extractMermaidCode(content, file.name);

          if (mermaidCode) {
            onImport(mermaidCode, file.name);
            onInfo(`✅ Successfully imported file: ${file.name}`);
          } else {
            onError(`❌ No valid Mermaid code found in file "${file.name}"`);
          }
        } catch (error) {
          onError(
            `❌ Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      };

      reader.onerror = () => {
        onError(`❌ Error occurred while reading file "${file.name}"`);
      };

      reader.readAsText(file, 'utf-8');
    },
    [extractMermaidCode, onImport, onError, onInfo]
  );

  // Validate file type
  const isValidFile = useCallback(
    (file: File): boolean => {
      const validExtensions = ['.md', '.mmd', '.txt', '.mermaid'];
      const validTypes = ['text/plain', 'text/markdown', 'text/x-markdown'];

      const hasValidExtension = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

      const hasValidType = validTypes.includes(file.type) || file.type === '';

      // File size limit (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        onError('❌ File too large, please select a file smaller than 5MB');
        return false;
      }

      return hasValidExtension || hasValidType;
    },
    [onError]
  );

  // Drag enter
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    // Add drag styling
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }, []);

  // Drag hover
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Set drag effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // Drag leave
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    // Only remove styling when completely left
    if (dragCounterRef.current === 0) {
      const target = e.currentTarget as HTMLElement;
      target.classList.remove('drag-over');
    }
  }, []);

  // Drag drop
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;

      // Remove drag styling
      const target = e.currentTarget as HTMLElement;
      target.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        onError('❌ No files detected');
        return;
      }

      if (files.length > 1) {
        onInfo(
          '⚠️ Multiple files detected, only the first file will be imported'
        );
      }

      const file = files[0];

      if (!isValidFile(file)) {
        onError(
          `❌ Unsupported file type: ${file.name}\nSupported formats: .md, .mmd, .txt, .mermaid`
        );
        return;
      }

      onInfo(`📁 Reading file: ${file.name}...`);
      handleFileRead(file);
    },
    [isValidFile, handleFileRead, onError, onInfo]
  );

  // Helper function to bind drag events
  const bindDragEvents = useCallback(
    (element: HTMLElement) => {
      element.addEventListener('dragenter', handleDragEnter);
      element.addEventListener('dragover', handleDragOver);
      element.addEventListener('dragleave', handleDragLeave);
      element.addEventListener('drop', handleDrop);

      // Return cleanup function
      return () => {
        element.removeEventListener('dragenter', handleDragEnter);
        element.removeEventListener('dragover', handleDragOver);
        element.removeEventListener('dragleave', handleDragLeave);
        element.removeEventListener('drop', handleDrop);
      };
    },
    [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]
  );

  return {
    bindDragEvents,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
  };
}
