import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import * as monaco from 'monaco-editor';
import { cn } from '@/lib/utils';
import { useVSCodeTheme } from '@/hooks/use-vscode-theme';
import { formatMermaidCode } from '../hooks/mermaid-formatter';

interface MermaidMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  containerWidth?: number; // Add container width prop for layout updates
}

export interface MermaidMonacoEditorRef {
  insertSnippet: (snippet: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  formatDocument: () => void;
}

// Register Mermaid language
monaco.languages.register({ id: 'mermaid' });

// Define Mermaid syntax highlighting
monaco.languages.setMonarchTokensProvider('mermaid', {
  tokenizer: {
    root: [
      // Graph types
      [
        /\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gitgraph|pie|quadrantChart|requirement|mindmap|timeline|zenuml|sankey|block-beta)\b/,
        'keyword',
      ],

      // Directions
      [/\b(TD|TB|BT|RL|LR)\b/, 'keyword.direction'],

      // Node shapes and connections
      [/-->|---|-\.-|==>|===|-.->|<-->|<--->|x--x|o--o/, 'operator.connection'],
      [/\|[^|]*\|/, 'string.label'],

      // Node definitions with shapes
      [/\w+\[\[.*?\]\]/, 'entity.name.function.subroutine'],
      [/\w+\[.*?\]/, 'entity.name.function.rectangle'],
      [/\w+\(.*?\)/, 'entity.name.function.rounded'],
      [/\w+\{.*?\}/, 'entity.name.function.diamond'],
      [/\w+\(\(.*?\)\)/, 'entity.name.function.circle'],
      [/\w+\(\(\(.*?\)\)\)/, 'entity.name.function.doublecircle'],
      [/\w+\(\[.*?\]\)/, 'entity.name.function.stadium'],
      [/\w+\[\(.*?\)\]/, 'entity.name.function.cylindrical'],
      [/\w+\{\{.*?\}\}/, 'entity.name.function.hexagon'],
      [/\w+\[\/.*?\/\]/, 'entity.name.function.parallelogram'],
      [/\w+\[\/.*?\\\]/, 'entity.name.function.trapezoid'],

      // Base64 image data (collapsed display)
      [/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{50,}/, 'string.base64'],

      // HTML content in quotes
      [/"<[^"]*>"/, 'string.html'],
      [/'<[^']*>'/, 'string.html'],

      // Comments
      [/%%.*$/, 'comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],

      // Node IDs
      [/\b[A-Za-z_][A-Za-z0-9_]*\b/, 'variable.name'],

      // Numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],

      // Whitespace
      [/[ \t\r\n]+/, ''],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],
  },
});

// Define custom theme for Mermaid
monaco.editor.defineTheme('mermaid-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
    { token: 'keyword.direction', foreground: 'c586c0', fontStyle: 'bold' },
    { token: 'operator.connection', foreground: 'd4d4d4', fontStyle: 'bold' },
    { token: 'string.label', foreground: 'ce9178' },
    { token: 'entity.name.function.rectangle', foreground: '4ec9b0' },
    { token: 'entity.name.function.rounded', foreground: '4fc1ff' },
    { token: 'entity.name.function.diamond', foreground: 'ffcc02' },
    { token: 'entity.name.function.circle', foreground: 'ff6b6b' },
    { token: 'entity.name.function.doublecircle', foreground: 'ff8cc8' },
    { token: 'entity.name.function.stadium', foreground: '51cf66' },
    { token: 'entity.name.function.subroutine', foreground: 'ffd43b' },
    { token: 'entity.name.function.cylindrical', foreground: '74c0fc' },
    { token: 'entity.name.function.hexagon', foreground: 'ff922b' },
    { token: 'entity.name.function.parallelogram', foreground: 'b197fc' },
    { token: 'entity.name.function.trapezoid', foreground: 'ffc9c9' },
    { token: 'string.base64', foreground: '808080', fontStyle: 'italic' },
    { token: 'string.html', foreground: 'ce9178' },
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'variable.name', foreground: '9cdcfe' },
    { token: 'number', foreground: 'b5cea8' },
  ],
  colors: {},
});

monaco.editor.defineTheme('mermaid-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
    { token: 'keyword.direction', foreground: 'af00db', fontStyle: 'bold' },
    { token: 'operator.connection', foreground: '000000', fontStyle: 'bold' },
    { token: 'string.label', foreground: 'a31515' },
    { token: 'entity.name.function.rectangle', foreground: '267f99' },
    { token: 'entity.name.function.rounded', foreground: '0451a5' },
    { token: 'entity.name.function.diamond', foreground: 'ca5010' },
    { token: 'entity.name.function.circle', foreground: 'e31e24' },
    { token: 'entity.name.function.doublecircle', foreground: 'd73a49' },
    { token: 'entity.name.function.stadium', foreground: '22863a' },
    { token: 'entity.name.function.subroutine', foreground: 'b08800' },
    { token: 'entity.name.function.cylindrical', foreground: '032f62' },
    { token: 'entity.name.function.hexagon', foreground: 'd73a49' },
    { token: 'entity.name.function.parallelogram', foreground: '6f42c1' },
    { token: 'entity.name.function.trapezoid', foreground: 'e36209' },
    { token: 'string.base64', foreground: '808080', fontStyle: 'italic' },
    { token: 'string.html', foreground: 'a31515' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'string', foreground: 'a31515' },
    { token: 'variable.name', foreground: '001080' },
    { token: 'number', foreground: '098658' },
  ],
  colors: {},
});

export const MermaidMonacoEditor = forwardRef<
  MermaidMonacoEditorRef,
  MermaidMonacoEditorProps
>(({ value, onChange, className, placeholder, containerWidth }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const theme = useVSCodeTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      insertSnippet: (snippet: string) => {
        if (!editorRef.current) return;

        const selection = editorRef.current.getSelection();
        const model = editorRef.current.getModel();

        if (selection && model) {
          editorRef.current.executeEdits('insert-snippet', [
            {
              range: selection,
              text: snippet,
            },
          ]);
          editorRef.current.focus();
        }
      },
      undo: () => {
        if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'undo', null);
        }
      },
      redo: () => {
        if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'redo', null);
        }
      },
      canUndo: () => {
        if (!editorRef.current) return false;
        return editorRef.current.getAction('undo')?.isSupported() ?? false;
      },
      canRedo: () => {
        if (!editorRef.current) return false;
        return editorRef.current.getAction('redo')?.isSupported() ?? false;
      },
      formatDocument: () => {
        if (!editorRef.current) return;

        const model = editorRef.current.getModel();
        if (!model) return;

        const currentValue = model.getValue();

        try {
          const formattedValue = formatMermaidCode(currentValue);

          if (formattedValue !== currentValue) {
            // 应用格式化后的代码
            const fullRange = model.getFullModelRange();
            editorRef.current.executeEdits('format-document', [
              {
                range: fullRange,
                text: formattedValue,
              },
            ]);
          }
        } catch (error) {
          console.error('格式化失败:', error);
        }

        editorRef.current.focus();
      },
    }),
    []
  );

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language: 'mermaid',
      theme: theme.kind?.includes('light') ? 'mermaid-light' : 'mermaid-dark',
      automaticLayout: false, // We'll handle layout manually for better control
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      folding: true,
      foldingStrategy: 'auto',
      showFoldingControls: 'always',
      bracketPairColorization: { enabled: true },
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      placeholder: placeholder || 'Enter Mermaid code here...',
    });

    // Handle content changes
    const model = editorRef.current.getModel();
    const onChangeSubscription = model?.onDidChangeContent(() => {
      const newValue = model?.getValue() || '';
      onChange(newValue);
    });

    // Initial layout
    setTimeout(() => {
      editorRef.current?.layout();
    }, 0);

    return () => {
      onChangeSubscription?.dispose();
      editorRef.current?.dispose();
    };
  }, []);

  // Update theme when VSCode theme changes
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      theme: theme.kind?.includes('light') ? 'mermaid-light' : 'mermaid-dark',
    });
  }, [theme]);

  // Update value when prop changes
  useEffect(() => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (model && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [value]);

  // Handle container width changes
  useEffect(() => {
    if (!editorRef.current || containerWidth === undefined) return;

    // Use a small timeout to batch multiple rapid changes during dragging
    const timeoutId = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    }, 16); // ~60fps for smooth updates during dragging

    return () => clearTimeout(timeoutId);
  }, [containerWidth]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        setTimeout(() => {
          editorRef.current?.layout();
        }, 0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle Base64 collapse
  const toggleBase64Collapse = () => {
    setIsCollapsed(!isCollapsed);
    // This would need additional implementation to actually collapse Base64 data
    // For now, it's a placeholder for future enhancement
  };

  // Check if there are Base64 images in the code
  const hasBase64Images = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/.test(
    value
  );

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Base64 collapse toggle */}
      {hasBase64Images && (
        <div className='absolute top-2 right-2 z-10'>
          <button
            onClick={toggleBase64Collapse}
            className='px-2 py-1 text-xs rounded border bg-background hover:bg-accent border-border flex items-center gap-1'
            title={
              isCollapsed ? 'Expand Base64 images' : 'Collapse Base64 images'
            }
          >
            <span
              className={`codicon codicon-${isCollapsed ? 'expand-all' : 'collapse-all'}`}
            ></span>
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className='w-full h-full'
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          color: 'var(--vscode-editor-foreground)',
        }}
      />
    </div>
  );
});
