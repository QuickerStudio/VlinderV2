import { useState, useRef, useEffect } from 'react';
import type { EditHistoryRecord } from '../types';

interface EditHistoryDropdownProps {
  showEditHistoryDropdown: boolean;
  setShowEditHistoryDropdown: (show: boolean) => void;
  editHistory: EditHistoryRecord[];
  currentIndex: number;
  onJumpToHistory: (recordId: string) => void;
  onClearHistory: () => void;
  onSetAsInitialPoint: (recordId: string) => void;
  onDeleteRecord: (recordId: string) => void;
  onPinRecord: (recordId: string) => void;
}

export function EditHistoryDropdown({
  showEditHistoryDropdown,
  setShowEditHistoryDropdown,
  editHistory,
  currentIndex,
  onJumpToHistory,
  onClearHistory,
  onSetAsInitialPoint,
  onDeleteRecord,
  onPinRecord,
}: EditHistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pinned'>('all');

  // 防御性检查：确保editHistory是有效的数组
  const safeEditHistory = Array.isArray(editHistory) ? editHistory : [];
  const safeCurrentIndex = typeof currentIndex === 'number' ? currentIndex : -1;

  // 分离pinned和unpinned记录
  const pinnedRecords = safeEditHistory.filter(
    (record) => record.isPinned ?? false
  );
  const allRecords = safeEditHistory;

  // 根据当前标签页选择显示的记录
  const displayRecords = activeTab === 'pinned' ? pinnedRecords : allRecords;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowEditHistoryDropdown(false);
      }
    }

    if (showEditHistoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEditHistoryDropdown, setShowEditHistoryDropdown]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (recordDate.getTime() === today.getTime()) {
      return '今天';
    } else if (recordDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleJumpToHistory = (recordId: string) => {
    onJumpToHistory(recordId);
    setShowEditHistoryDropdown(false);
  };

  const handleClearHistory = () => {
    onClearHistory();
    setShowEditHistoryDropdown(false);
  };

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setShowEditHistoryDropdown(!showEditHistoryDropdown)}
        className='p-1 hover:bg-accent rounded flex items-center gap-1'
        title='编辑历史'
        disabled={safeEditHistory.length === 0}
      >
        <span className='codicon codicon-history'></span>
        <span className='text-xs hidden lg:inline'>编辑历史</span>
        {safeEditHistory.length > 0 && (
          <span className='text-xs bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center'>
            {safeEditHistory.length}
          </span>
        )}
      </button>

      {showEditHistoryDropdown && (
        <div className='absolute top-full right-0 mt-1 w-80 bg-popover border border-border rounded-md shadow-lg z-50 max-h-96 overflow-hidden flex flex-col'>
          <div className='p-3 border-b border-border'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium'>编辑历史</h3>
              {safeEditHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className='text-xs text-muted-foreground hover:text-foreground'
                  title='清空历史'
                >
                  <span className='codicon codicon-clear-all'></span>
                </button>
              )}
            </div>
            {safeEditHistory.length > 0 && (
              <p className='text-xs text-muted-foreground mt-1'>
                共 {safeEditHistory.length} 条记录，当前位置:{' '}
                {safeCurrentIndex + 1}
                {pinnedRecords.length > 0 &&
                  ` • ${pinnedRecords.length} 条已置顶`}
              </p>
            )}

            {/* 标签页 */}
            {safeEditHistory.length > 0 && (
              <div className='flex border-b border-border mt-2'>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'all'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  全部 ({allRecords.length})
                </button>
                {pinnedRecords.length > 0 && (
                  <button
                    onClick={() => setActiveTab('pinned')}
                    className={`px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                      activeTab === 'pinned'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📌 置顶 ({pinnedRecords.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className='flex-1 overflow-y-auto'>
            {displayRecords.length === 0 ? (
              <div className='p-4 text-center text-muted-foreground text-sm'>
                {activeTab === 'pinned' ? '暂无置顶记录' : '暂无编辑历史'}
              </div>
            ) : (
              <div className='p-2'>
                {displayRecords.map((record, index) => {
                  // 防御性检查：确保record存在且有必要的属性
                  if (!record || !record.id) {
                    return null;
                  }

                  // 在原始数组中找到当前记录的索引
                  const originalIndex = safeEditHistory.findIndex(
                    (r) => r.id === record.id
                  );
                  const isCurrent = originalIndex === safeCurrentIndex;
                  const isAfterCurrent = originalIndex > safeCurrentIndex;

                  // 获取变化类型图标
                  const getChangeIcon = (changeType?: string) => {
                    switch (changeType) {
                      case 'add':
                        return 'codicon-add';
                      case 'delete':
                        return 'codicon-remove';
                      case 'modify':
                        return 'codicon-edit';
                      case 'initial':
                        return 'codicon-file';
                      default:
                        return 'codicon-circle-outline';
                    }
                  };

                  // 获取变化类型颜色
                  const getChangeColor = (changeType?: string) => {
                    switch (changeType) {
                      case 'add':
                        return 'text-green-500';
                      case 'delete':
                        return 'text-red-500';
                      case 'modify':
                        return 'text-blue-500';
                      case 'initial':
                        return 'text-gray-500';
                      default:
                        return 'text-muted-foreground';
                    }
                  };

                  // 安全获取属性值
                  const safeDescription = record.description || '未知操作';
                  const safeContent = record.content || '';
                  const safeTimestamp = record.timestamp || new Date();
                  const safeChangeType = record.changeType || 'modify';
                  const safeLinesChanged = record.linesChanged || 0;

                  const isPinned = record.isPinned ?? false;

                  return (
                    <div
                      key={record.id}
                      className={`
												group p-2 rounded cursor-pointer transition-colors mb-1 last:mb-0
												${
                          isCurrent
                            ? 'bg-primary/10 border border-primary/20'
                            : isAfterCurrent
                              ? 'opacity-50 hover:opacity-75 hover:bg-accent/50'
                              : 'hover:bg-accent'
                        }
												${isPinned ? 'ring-1 ring-primary/30 bg-primary/5' : ''}
											`}
                      onClick={() => handleJumpToHistory(record.id)}
                      title={`点击跳转到此版本\n变化类型: ${safeDescription}\n内容预览: ${safeContent.slice(0, 100)}${safeContent.length > 100 ? '...' : ''}`}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 flex-1 min-w-0'>
                          <span
                            className={`
														codicon text-xs
														${
                              isCurrent
                                ? 'codicon-circle-filled text-primary'
                                : getChangeIcon(safeChangeType)
                            } ${isCurrent ? '' : getChangeColor(safeChangeType)}
													`}
                          ></span>
                          <span className='text-sm font-medium truncate'>
                            {safeDescription}
                          </span>
                          {safeLinesChanged && safeLinesChanged > 0 && (
                            <span className='text-xs bg-muted px-1 rounded'>
                              {safeLinesChanged} 行
                            </span>
                          )}
                        </div>

                        <div className='flex items-center gap-1 ml-2'>
                          {/* 操作按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinRecord(record.id);
                            }}
                            className={`
															p-1 rounded text-xs transition-all duration-200
															${
                                isPinned
                                  ? 'bg-primary/20 text-primary opacity-100 hover:bg-primary/30'
                                  : 'hover:bg-accent opacity-0 group-hover:opacity-100'
                              }
														`}
                            title={isPinned ? '取消置顶' : '置顶此记录'}
                          >
                            <span
                              className={`
															codicon codicon-pin transition-transform duration-200
															${isPinned ? 'rotate-[-90deg]' : ''}
														`}
                            ></span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetAsInitialPoint(record.id);
                            }}
                            className='p-1 hover:bg-accent rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity'
                            title='设为初始点（删除之后的记录）'
                          >
                            <span className='codicon codicon-debug-restart'></span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRecord(record.id);
                            }}
                            className='p-1 hover:bg-destructive hover:text-destructive-foreground rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity'
                            title='删除此记录'
                          >
                            <span className='codicon codicon-trash'></span>
                          </button>

                          <div className='text-xs text-muted-foreground ml-1'>
                            {formatTime(safeTimestamp)}
                          </div>
                        </div>
                      </div>
                      <div className='text-xs text-muted-foreground mt-1 ml-5'>
                        {formatDate(safeTimestamp)} • {safeContent.length} 字符
                        {safeContent.split('\n').length > 1 &&
                          ` • ${safeContent.split('\n').length} 行`}
                      </div>
                      {safeContent && (
                        <div className='text-xs text-muted-foreground mt-1 ml-5 truncate'>
                          {safeContent.slice(0, 60)}
                          {safeContent.length > 60 && '...'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {displayRecords.length > 0 && (
            <div className='p-2 border-t border-border text-xs text-muted-foreground'>
              <div className='flex items-center gap-2'>
                <span className='codicon codicon-info'></span>
                <span>点击任意历史记录可跳转到该版本</span>
                {activeTab === 'pinned' && <span>• 📌 表示置顶记录</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
