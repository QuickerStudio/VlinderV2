import { useState, useCallback, useRef } from 'react';
import type { EditHistoryRecord } from '../types';

interface UseEditHistoryOptions {
  maxHistorySize?: number;
  minChangeThreshold?: number; // 最小变化阈值（字符数）
}

export function useEditHistory(options: UseEditHistoryOptions = {}) {
  const { maxHistorySize = 50, minChangeThreshold = 5 } = options;

  const [editHistory, setEditHistory] = useState<EditHistoryRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [nextHistoryId, setNextHistoryId] = useState(1);

  const lastContentRef = useRef<string>('');
  const isUndoRedoOperationRef = useRef(false);
  const lastRecordTimeRef = useRef<number>(0);

  // 分析内容变化类型和程度
  const analyzeContentChange = useCallback(
    (oldContent: string, newContent: string) => {
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');

      const lineDiff = Math.abs(newLines.length - oldLines.length);
      const charDiff = Math.abs(newContent.length - oldContent.length);

      let changeType: 'add' | 'delete' | 'modify' | 'initial' = 'modify';

      if (oldContent === '') {
        changeType = 'initial';
      } else if (newLines.length > oldLines.length) {
        changeType = 'add';
      } else if (newLines.length < oldLines.length) {
        changeType = 'delete';
      }

      return {
        changeType,
        linesChanged: lineDiff,
        charDiff,
        shouldRecord: charDiff >= minChangeThreshold || lineDiff > 0,
      };
    },
    [minChangeThreshold]
  );

  // 生成描述
  const generateDescription = useCallback(
    (changeType: string, linesChanged: number, charDiff: number) => {
      switch (changeType) {
        case 'initial':
          return '初始内容';
        case 'add':
          return linesChanged > 0
            ? `添加 ${linesChanged} 行`
            : `添加 ${charDiff} 字符`;
        case 'delete':
          return linesChanged > 0
            ? `删除 ${linesChanged} 行`
            : `删除 ${charDiff} 字符`;
        case 'modify':
          return `修改内容 (${charDiff > 0 ? '+' : ''}${charDiff} 字符)`;
        default:
          return '编辑内容';
      }
    },
    []
  );

  // 添加新的编辑记录
  const addEditRecord = useCallback(
    (content: string, description?: string) => {
      if (isUndoRedoOperationRef.current) {
        isUndoRedoOperationRef.current = false;
        return;
      }

      const now = Date.now();
      const lastContent = lastContentRef.current;

      // 分析内容变化
      const analysis = analyzeContentChange(lastContent, content);

      // 如果变化太小且时间间隔很短，不记录
      if (!analysis.shouldRecord && now - lastRecordTimeRef.current < 500) {
        lastContentRef.current = content;
        return;
      }

      // 如果内容完全相同，不添加记录
      if (content === lastContent) {
        return;
      }

      const finalDescription =
        description ||
        generateDescription(
          analysis.changeType,
          analysis.linesChanged,
          analysis.charDiff
        );

      const newRecord: EditHistoryRecord = {
        id: `edit-${nextHistoryId}`,
        content,
        timestamp: new Date(),
        description: finalDescription,
        changeType: analysis.changeType,
        linesChanged: analysis.linesChanged,
      };

      setEditHistory((prev) => {
        // 如果当前不在历史记录的末尾，删除当前位置之后的所有记录
        const newHistory =
          currentIndex >= 0 ? prev.slice(0, currentIndex + 1) : prev;

        // 添加新记录
        const updatedHistory = [...newHistory, newRecord];

        // 限制历史记录大小
        if (updatedHistory.length > maxHistorySize) {
          return updatedHistory.slice(-maxHistorySize);
        }

        return updatedHistory;
      });

      setCurrentIndex(() => {
        const newIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
        return Math.min(newIndex, maxHistorySize - 1);
      });

      setNextHistoryId((prev) => prev + 1);
      lastContentRef.current = content;
      lastRecordTimeRef.current = now;
    },
    [
      currentIndex,
      nextHistoryId,
      maxHistorySize,
      analyzeContentChange,
      generateDescription,
    ]
  );

  // 立即添加编辑记录
  const addEditRecordImmediate = useCallback(
    (content: string, description?: string) => {
      addEditRecord(content, description);
    },
    [addEditRecord]
  );

  // 撤销操作
  const undo = useCallback((): string | null => {
    if (currentIndex <= 0) {
      return null;
    }

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    isUndoRedoOperationRef.current = true;

    const record = editHistory[newIndex];
    lastContentRef.current = record.content;
    return record.content;
  }, [currentIndex, editHistory]);

  // 重做操作
  const redo = useCallback((): string | null => {
    if (currentIndex >= editHistory.length - 1) {
      return null;
    }

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    isUndoRedoOperationRef.current = true;

    const record = editHistory[newIndex];
    lastContentRef.current = record.content;
    return record.content;
  }, [currentIndex, editHistory]);

  // 跳转到特定历史记录
  const jumpToHistory = useCallback(
    (recordId: string): string | null => {
      const index = editHistory.findIndex((record) => record.id === recordId);
      if (index === -1) {
        return null;
      }

      setCurrentIndex(index);
      isUndoRedoOperationRef.current = true;

      const record = editHistory[index];
      lastContentRef.current = record.content;
      return record.content;
    },
    [editHistory]
  );

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setEditHistory([]);
    setCurrentIndex(-1);
    setNextHistoryId(1);
    lastContentRef.current = '';
  }, []);

  // 设置为初始点（删除指定记录之后的所有记录）
  const setAsInitialPoint = useCallback(
    (recordId: string) => {
      const recordIndex = editHistory.findIndex(
        (record) => record.id === recordId
      );
      if (recordIndex === -1) return null;

      // 删除指定记录之后的所有记录
      const newHistory = editHistory.slice(0, recordIndex + 1);
      setEditHistory(newHistory);

      // 如果当前索引超出了新的历史长度，调整到最后一个记录
      const newCurrentIndex = Math.min(currentIndex, recordIndex);
      setCurrentIndex(newCurrentIndex);

      // 更新lastContent
      if (newCurrentIndex >= 0 && newCurrentIndex < newHistory.length) {
        lastContentRef.current = newHistory[newCurrentIndex].content;
      }

      return newHistory[recordIndex].content;
    },
    [editHistory, currentIndex]
  );

  // 删除指定记录
  const deleteRecord = useCallback(
    (recordId: string) => {
      const recordIndex = editHistory.findIndex(
        (record) => record.id === recordId
      );
      if (recordIndex === -1) return;

      const newHistory = editHistory.filter((record) => record.id !== recordId);
      setEditHistory(newHistory);

      // 调整当前索引
      if (currentIndex > recordIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (currentIndex === recordIndex) {
        // 如果删除的是当前记录，调整到前一个记录
        const newCurrentIndex = Math.max(-1, recordIndex - 1);
        setCurrentIndex(newCurrentIndex);

        if (newCurrentIndex >= 0 && newCurrentIndex < newHistory.length) {
          lastContentRef.current = newHistory[newCurrentIndex].content;
          return newHistory[newCurrentIndex].content;
        } else {
          lastContentRef.current = '';
          return '';
        }
      }

      return null;
    },
    [editHistory, currentIndex]
  );

  // 切换记录的pin状态
  const togglePinRecord = useCallback(
    (recordId: string) => {
      const recordIndex = editHistory.findIndex(
        (record) => record.id === recordId
      );
      if (recordIndex === -1) return { success: false, isPinned: false };

      const record = editHistory[recordIndex];
      const newIsPinned = !(record.isPinned ?? false);

      // 更新记录的pin状态
      const updatedRecord = { ...record, isPinned: newIsPinned };
      let newHistory = [...editHistory];
      newHistory[recordIndex] = updatedRecord;

      if (newIsPinned) {
        // Pin: 移动到顶部
        newHistory = [
          updatedRecord,
          ...editHistory.filter((r) => r.id !== recordId),
        ];

        // 调整当前索引
        if (currentIndex === recordIndex) {
          setCurrentIndex(0); // 置顶的记录现在在索引0
        } else if (currentIndex < recordIndex) {
          setCurrentIndex(currentIndex + 1); // 其他记录向后移动
        }
      } else {
        // Unpin: 按时间戳重新排序
        const unpinnedHistory = newHistory.filter(
          (r) => !(r.isPinned ?? false) || r.id === recordId
        );
        const pinnedHistory = newHistory.filter(
          (r) => (r.isPinned ?? false) && r.id !== recordId
        );

        // 将unpin的记录按时间戳排序插入到合适位置
        const sortedUnpinned = unpinnedHistory.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        newHistory = [...pinnedHistory, ...sortedUnpinned];

        // 重新计算当前索引
        const newCurrentIndex = newHistory.findIndex(
          (r) => r.id === editHistory[currentIndex]?.id
        );
        if (newCurrentIndex !== -1) {
          setCurrentIndex(newCurrentIndex);
        }
      }

      setEditHistory(newHistory);
      return { success: true, isPinned: newIsPinned };
    },
    [editHistory, currentIndex]
  );

  // 恢复编辑历史
  const restoreHistory = useCallback(
    (history: EditHistoryRecord[], index: number) => {
      // 防御性检查：确保history是有效的数组
      if (!Array.isArray(history)) {
        console.warn('restoreHistory: history is not an array', history);
        return;
      }

      // 过滤和修复无效的历史记录
      const validHistory = history
        .filter((record) => {
          if (!record || typeof record !== 'object') {
            console.warn('restoreHistory: invalid record', record);
            return false;
          }
          return true;
        })
        .map((record) => ({
          id: record.id || `restored-${Date.now()}-${Math.random()}`,
          content: record.content || '',
          timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
          description: record.description || '恢复的记录',
          changeType: record.changeType || ('modify' as const),
          linesChanged: record.linesChanged || 0,
        }));

      setEditHistory(validHistory);

      // 确保index在有效范围内
      const safeIndex = Math.max(-1, Math.min(index, validHistory.length - 1));
      setCurrentIndex(safeIndex);

      // 安全计算nextHistoryId
      try {
        const maxId =
          validHistory.length > 0
            ? Math.max(
                ...validHistory.map((h) => {
                  const idParts = h.id.split('-');
                  const numPart = idParts[idParts.length - 1];
                  return parseInt(numPart) || 0;
                })
              )
            : 0;
        setNextHistoryId(maxId + 1);
      } catch (error) {
        console.warn('restoreHistory: error calculating nextHistoryId', error);
        setNextHistoryId(validHistory.length + 1);
      }

      // 安全设置lastContent
      if (
        safeIndex >= 0 &&
        safeIndex < validHistory.length &&
        validHistory[safeIndex]
      ) {
        lastContentRef.current = validHistory[safeIndex].content || '';
      } else {
        lastContentRef.current = '';
      }
    },
    []
  );

  // 获取当前状态信息
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < editHistory.length - 1;
  const currentRecord = currentIndex >= 0 ? editHistory[currentIndex] : null;

  return {
    // 历史记录数据
    editHistory,
    currentIndex,
    currentRecord,

    // 状态信息
    canUndo,
    canRedo,

    // 操作方法
    addEditRecord,
    addEditRecordImmediate,
    undo,
    redo,
    jumpToHistory,
    clearHistory,
    restoreHistory,
    setAsInitialPoint,
    deleteRecord,
    togglePinRecord,
  };
}
