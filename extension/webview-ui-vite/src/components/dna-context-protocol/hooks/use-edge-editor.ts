import { useState, useCallback, useRef, useEffect } from 'react';

interface EditingEdge {
  id: string;
  sourceId: string;
  targetId: string;
  originalLabel: string;
  element: SVGElement;
  rect: DOMRect;
}

interface EdgeEditorOptions {
  mermaidCode: string;
  onCodeUpdate: (newCode: string) => void;
  onStatusMessage: (message: string) => void;
  isEnabled?: boolean;
}

export function useEdgeEditor({
  mermaidCode,
  onCodeUpdate,
  onStatusMessage,
  isEnabled = false,
}: EdgeEditorOptions) {
  const [isEdgeEditMode, setIsEdgeEditMode] = useState(false);
  const [editingEdge, setEditingEdge] = useState<EditingEdge | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sourceNode, setSourceNode] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  // 解析连接线标签的正则表达式
  const parseEdgeLabel = useCallback(
    (sourceId: string, targetId: string, code: string): string | null => {
      // 匹配不同类型的连接线标签
      const patterns = [
        // A -->|标签| B
        new RegExp(`${sourceId}\\s*-->\\s*\\|([^|]+)\\|\\s*${targetId}`, 'g'),
        // A <-->|标签| B (双箭头)
        new RegExp(`${sourceId}\\s*<-->\\s*\\|([^|]+)\\|\\s*${targetId}`, 'g'),
        // A --o|标签| B (圆圈箭头)
        new RegExp(`${sourceId}\\s*--o\\s*\\|([^|]+)\\|\\s*${targetId}`, 'g'),
        // A --x|标签| B (叉号箭头)
        new RegExp(`${sourceId}\\s*--x\\s*\\|([^|]+)\\|\\s*${targetId}`, 'g'),
        // A ----->|标签| B (长箭头)
        new RegExp(
          `${sourceId}\\s*----->\\s*\\|([^|]+)\\|\\s*${targetId}`,
          'g'
        ),
        // A --> B : 标签
        new RegExp(`${sourceId}\\s*-->\\s*${targetId}\\s*:\\s*(.+)`, 'g'),
        // A -- 标签 --> B (重要：支持破折号标签格式)
        new RegExp(`${sourceId}\\s*--\\s*([^-]+)\\s*-->\\s*${targetId}`, 'g'),
        // A -.- 标签 -.-> B (虚线)
        new RegExp(
          `${sourceId}\\s*-\\.\\-\\s*([^-]+)\\s*-\\.->\\s*${targetId}`,
          'g'
        ),
        // A === 标签 ==> B (粗线)
        new RegExp(`${sourceId}\\s*===\\s*([^=]+)\\s*==>\\s*${targetId}`, 'g'),
        // A <===|标签|===> B (双向粗线)
        new RegExp(`${sourceId}\\s*<===>\\s*\\|([^|]+)\\|\\s*${targetId}`, 'g'),
      ];

      for (const pattern of patterns) {
        const match = pattern.exec(code);
        if (match && match[1]) {
          return match[1].trim();
        }
      }

      return null;
    },
    []
  );

  // 更新连接线标签
  const updateEdgeLabel = useCallback(
    (
      sourceId: string,
      targetId: string,
      oldLabel: string,
      newLabel: string,
      code: string
    ): string => {
      if (!newLabel.trim()) {
        // 如果新标签为空，移除标签但保留连接
        const patterns = [
          {
            search: new RegExp(
              `(${sourceId}\\s*)-->\\s*\\|[^|]+\\|\\s*(${targetId})`,
              'g'
            ),
            replace: `$1--> $2`,
          },
          {
            search: new RegExp(
              `(${sourceId}\\s*)<-->\\s*\\|[^|]+\\|\\s*(${targetId})`,
              'g'
            ),
            replace: `$1<--> $2`,
          },
          {
            search: new RegExp(
              `(${sourceId}\\s*)--o\\s*\\|[^|]+\\|\\s*(${targetId})`,
              'g'
            ),
            replace: `$1--o $2`,
          },
          {
            search: new RegExp(
              `(${sourceId}\\s*)--x\\s*\\|[^|]+\\|\\s*(${targetId})`,
              'g'
            ),
            replace: `$1--x $2`,
          },
          {
            search: new RegExp(
              `(${sourceId}\\s*)<===>\\s*\\|[^|]+\\|\\s*(${targetId})`,
              'g'
            ),
            replace: `$1<===> $2`,
          },
          {
            search: new RegExp(
              `(${sourceId}\\s*-->\\s*${targetId})\\s*:\\s*.+`,
              'g'
            ),
            replace: `$1`,
          },
          {
            search: new RegExp(
              `(${sourceId}\\s*)--\\s*[^-]+\\s*-->\\s*(${targetId})`,
              'g'
            ),
            replace: `$1--> $2`,
          },
        ];

        let updatedCode = code;
        for (const pattern of patterns) {
          if (pattern.search.test(updatedCode)) {
            updatedCode = updatedCode.replace(pattern.search, pattern.replace);
            break;
          }
        }
        return updatedCode;
      }

      // 替换现有标签
      const patterns = [
        {
          search: new RegExp(
            `(${sourceId}\\s*-->\\s*\\|)([^|]+)(\\|\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*<-->\\s*\\|)([^|]+)(\\|\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*--o\\s*\\|)([^|]+)(\\|\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*--x\\s*\\|)([^|]+)(\\|\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*----->\\s*\\|)([^|]+)(\\|\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*<===>\\s*\\|)([^|]+)(\\|\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*-->\\s*${targetId}\\s*:\\s*)(.+)`,
            'g'
          ),
          replace: `$1${newLabel}`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*--\\s*)([^-]+)(\\s*-->\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*-\\.\\-\\s*)([^-]+)(\\s*-\\.->\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
        {
          search: new RegExp(
            `(${sourceId}\\s*===\\s*)([^=]+)(\\s*==>\\s*${targetId})`,
            'g'
          ),
          replace: `$1${newLabel}$3`,
        },
      ];

      let updatedCode = code;
      for (const pattern of patterns) {
        if (pattern.search.test(updatedCode)) {
          updatedCode = updatedCode.replace(pattern.search, pattern.replace);
          break;
        }
      }

      return updatedCode;
    },
    []
  );

  // 保存编辑
  const saveEdit = useCallback(() => {
    if (!editingEdge) return;

    const newLabel = editLabel.trim();

    if (newLabel === editingEdge.originalLabel) {
      setEditingEdge(null);
      setEditLabel('');
      onStatusMessage('📝 未修改');
      return;
    }

    const updatedCode = updateEdgeLabel(
      editingEdge.sourceId,
      editingEdge.targetId,
      editingEdge.originalLabel,
      newLabel,
      mermaidCode
    );

    onCodeUpdate(updatedCode);
    setEditingEdge(null);
    setEditLabel('');
    onStatusMessage(
      `✅ 已更新连接线: ${editingEdge.sourceId} -> ${editingEdge.targetId}`
    );
  }, [
    editingEdge,
    editLabel,
    mermaidCode,
    updateEdgeLabel,
    onCodeUpdate,
    onStatusMessage,
  ]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingEdge(null);
    setEditLabel('');
    onStatusMessage('❌ 已取消编辑');
  }, [onStatusMessage]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editingEdge) return;

      // 在编辑模式下，阻止其他键盘处理
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      }
    },
    [editingEdge, saveEdit, cancelEdit]
  );

  // 切换连接线编辑模式
  const toggleEdgeEditMode = useCallback(() => {
    setIsEdgeEditMode((prev) => {
      const newMode = !prev;
      if (!newMode) {
        // 退出编辑模式时清理状态
        setEditingEdge(null);
        setEditLabel('');
      }
      onStatusMessage(
        newMode ? '🔗 连接线拖拽模式已开启' : '👁️ 连接线拖拽模式已关闭'
      );
      return newMode;
    });
  }, [onStatusMessage]);

  // 从元素中获取节点ID
  const getNodeIdFromElement = (element: SVGElement): string | null => {
    let current: SVGElement | null = element;
    while (current && current.tagName !== 'svg') {
      const id = current.getAttribute('id');
      if (
        id &&
        (current.classList.contains('node') || current.closest('.node'))
      ) {
        return id.replace(/^flowchart-/, '').replace(/-\d+$/, '');
      }
      current = current.parentElement as SVGElement | null;
    }
    return null;
  };

  // 处理鼠标按下事件，开始连接
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // 只在连接线编辑模式下且是左键点击时处理
      if (!isEnabled || !isEdgeEditMode || e.button !== 0) return;

      const target = e.target as SVGElement;
      const nodeId = getNodeIdFromElement(target);

      if (nodeId) {
        // 阻止事件冒泡，确保只有连接线编辑模式处理此事件
        e.preventDefault();
        e.stopPropagation();

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;

        setSourceNode({ id: nodeId, x, y });
        setConnectionPreview({ x1: x, y1: y, x2: x, y2: y });
        setIsConnecting(true);
        onStatusMessage('🔗 拖拽以连接节点...');
      }
    },
    [isEnabled, isEdgeEditMode, onStatusMessage]
  );

  // 处理鼠标移动事件，更新连接预览
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isConnecting || !sourceNode || !isEdgeEditMode) return;

      e.preventDefault();
      e.stopPropagation();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const x2 = e.clientX - containerRect.left;
      const y2 = e.clientY - containerRect.top;

      setConnectionPreview({ x1: sourceNode.x, y1: sourceNode.y, x2, y2 });
    },
    [isConnecting, sourceNode, isEdgeEditMode]
  );

  // 处理鼠标松开事件，完成连接
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isConnecting || !sourceNode || !isEdgeEditMode) return;

      const target = e.target as SVGElement;
      const targetNodeId = getNodeIdFromElement(target);

      if (targetNodeId && targetNodeId !== sourceNode.id) {
        const newConnection = `\n    ${sourceNode.id} --> ${targetNodeId}`;
        onCodeUpdate(mermaidCode + newConnection);
        onStatusMessage(`✅ 已连接 ${sourceNode.id} -> ${targetNodeId}`);
      } else {
        onStatusMessage('❌ 连接取消');
      }

      setIsConnecting(false);
      setSourceNode(null);
      setConnectionPreview(null);
    },
    [
      isConnecting,
      sourceNode,
      isEdgeEditMode,
      mermaidCode,
      onCodeUpdate,
      onStatusMessage,
    ]
  );

  // 绑定事件监听器
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isEnabled) return;

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isEnabled,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
  ]);

  return {
    containerRef,
    isEdgeEditMode,
    editingEdge,
    editLabel,
    setEditLabel,
    toggleEdgeEditMode,
    saveEdit,
    cancelEdit,
    isEditingEdge: !!editingEdge,
    connectionPreview,
  };
}
