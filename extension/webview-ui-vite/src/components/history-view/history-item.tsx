// 导入必要的组件和工具
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/dateFormatter';
import { type HistoryItem } from 'extension/shared/history-item';
import { CheckCircle2, Clock, Loader2, Trash2, Download, Pin } from 'lucide-react';
import { useState, useEffect } from 'react';
import ConversationPreview from './conversation-preview';

// 定义历史项组件的属性类型
type HistoryItemProps = {
  item: HistoryItem; // 历史项数据
  onSelect: (id: string) => void; // 选择历史项的回调函数
  onDelete: (id: string) => void; // 删除历史项的回调函数
  onExport: (id: string) => void; // 导出历史项的回调函数
  onPin: (id: string) => void; // 切换置顶状态的回调函数
};

// 历史项组件 - 用于显示单个历史任务卡片
const HistoryItem = ({
  item,
  onSelect,
  onDelete,
  onExport,
  onPin,
}: HistoryItemProps) => {
  // 管理加载状态，用于显示删除按钮的加载动画
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  // 管理缓存信息显示状态
  const [showCacheInfo, setShowCacheInfo] = useState(false);

  // 处理时钟按钮点击
  const handleClockClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    setShowCacheInfo(true); // 显示缓存信息
  };

  // 自动隐藏缓存信息
  useEffect(() => {
    if (showCacheInfo) {
      const timer = setTimeout(() => {
        setShowCacheInfo(false);
      }, 5000); // 5秒后隐藏

      return () => clearTimeout(timer); // 清理定时器
    }
  }, [showCacheInfo]);

  return (
    // 主容器 - 可点击，有悬停效果
    <div
      className='cursor-pointer text-foreground border-b border-border hover:bg-secondary hover:text-secondary-foreground transition-colors'
      onClick={() => onSelect(item.id)}
    >
      {/* 内容容器 - 使用 flex 布局，垂直排列 */}
      <div className='flex flex-col gap-2 p-2 relative group'>
        {/* 顶部行：任务名称 + 预览图标 + 时钟按钮 + 导出按钮 + Pin按钮 + 删除按钮 */}
        <div className='flex justify-between items-center'>
          {/* 左侧：任务名称 + 预览图标 */}
          <div className='flex items-center flex-1 mr-2 gap-2'>
            <div
              className='text-sm line-clamp-1 whitespace-pre-wrap break-words overflow-wrap-anywhere flex-1'
              dangerouslySetInnerHTML={{ __html: item.name ?? item.task }}
            ></div>
            {/* 对话预览组件 */}
            <ConversationPreview taskId={item.id} />
          </div>

          {/* 右侧：时钟按钮 + 导出按钮 + Pin按钮 + 删除按钮 */}
          <div className='flex items-center gap-1'>
            {/* 蓝色时钟按钮 */}
            <Button
              variant='ghost'
              size='sm'
              title='Show Cache Info' // 悬停提示文字
              className='opacity-80 group-hover:opacity-100 transition-opacity'
              onClick={handleClockClick}
            >
              <span className='sr-only'>Show Cache Info</span>{' '}
              {/* 屏幕阅读器文本 */}
              <Clock size={16} className='text-blue-500' /> {/* 蓝色时钟图标 */}
            </Button>
            {/* 导出按钮 */}
            <Button
              variant='ghost'
              size='sm'
              title='EXPORT' // 悬停提示文字
              className='opacity-80 group-hover:opacity-100 transition-opacity'
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡
                onExport(item.id); // 调用导出回调
              }}
            >
              <span className='sr-only'>Export</span> {/* 屏幕阅读器文本 */}
              <Download size={16} className='text-foreground' />{' '}
              {/* 下载图标 */}
            </Button>
            {/* Pin按钮 */}
            <Button
              variant='ghost'
              size='sm'
              title={item.isPinned ? 'Unpin' : 'Pin'} // 悬停提示文字
              className={`transition-opacity ${
                item.isPinned
                  ? 'opacity-100 text-primary'
                  : 'opacity-80 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡
                onPin(item.id); // 调用Pin回调
              }}
            >
              <span className='sr-only'>{item.isPinned ? 'Unpin' : 'Pin'}</span>
              <Pin
                size={16}
                className={item.isPinned ? 'fill-current' : ''}
              />
            </Button>
            {/* 删除按钮 */}
            <Button
              variant='ghost'
              size='sm'
              id={`delete-${item.id}`}
              disabled={isLoading[item.id]} // 加载时禁用按钮
              className='opacity-80 group-hover:opacity-100 transition-opacity' // 悬停时显示
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                setIsLoading((prev) => ({ ...prev, [item.id]: true })); // 设置加载状态
                onDelete(item.id); // 调用删除回调
              }}
            >
              <span className='sr-only'>Delete</span> {/* 屏幕阅读器文本 */}
              {isLoading[item.id] ? (
                <Loader2 className='animate-spin' size={16} /> // 加载中：旋转图标
              ) : (
                <Trash2
                  aria-label='Delete'
                  size={16}
                  className='text-foreground'
                /> // 正常：垃圾桶图标
              )}
            </Button>
          </div>
        </div>

        {/* 第二层：时间戳面板和缓存信息（点击时钟按钮时显示） */}
        {showCacheInfo && (
          <div className='bg-secondary/50 rounded p-2 text-xs animate-in fade-in duration-200'>
            <div className='flex justify-between items-start gap-4'>
              {/* 左侧：时间戳和Token信息面板 */}
              <div className='flex items-center gap-4'>
                {/* 时间戳 */}
                <div className='flex items-center gap-2'>
                  {
                    // 根据任务完成状态显示不同图标
                    item.isCompleted ? (
                      <CheckCircle2 className='w-3 h-3 text-success' /> // 已完成：绿色勾选图标
                    ) : (
                      <Clock className='w-3 h-3 text-info' /> // 进行中：蓝色时钟图标
                    )
                  }
                  <span className='font-medium uppercase'>
                    {formatDate(item.ts)}
                  </span>
                </div>

                {/* Token 信息 */}
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-medium'>Tokens:</span>
                  {/* 输入 Token 数量（向下箭头图标） */}
                  <span className='flex items-center gap-1'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='w-3 h-3'
                    >
                      <path d='m6 9 6 6 6-6'></path> {/* 向下箭头 */}
                    </svg>
                    {item.tokensIn?.toLocaleString()} {/* 格式化数字显示 */}
                  </span>
                  {/* 输出 Token 数量（向上箭头图标） */}
                  <span className='flex items-center gap-1'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='w-3 h-3'
                    >
                      <path d='m18 15-6-6-6 6'></path> {/* 向上箭头 */}
                    </svg>
                    {item.tokensOut?.toLocaleString()} {/* 格式化数字显示 */}
                  </span>
                </div>

                {/* API 成本信息（仅在有成本数据时显示） */}
                {!!item.totalCost && (
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>API Cost:</span>
                    <span>${item.totalCost?.toFixed(4)}</span>{' '}
                    {/* 保留 4 位小数 */}
                  </div>
                )}
              </div>

              {/* 右侧：缓存信息（仅在有缓存写入时显示） */}
              {!!item.cacheWrites && (
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-medium'>Cache:</span>
                  {/* 缓存写入数量（数据库图标 + 加号） */}
                  <span className='flex items-center gap-1'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='w-3 h-3'
                    >
                      <ellipse cx='12' cy='5' rx='9' ry='3'></ellipse>{' '}
                      {/* 数据库图标 */}
                      <path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'></path>
                      <path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'></path>
                    </svg>
                    +{item.cacheWrites?.toLocaleString()} {/* 缓存写入数量 */}
                  </span>
                  {/* 缓存读取数量（箭头图标） */}
                  <span className='flex items-center gap-1'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='w-3 h-3'
                    >
                      <path d='M5 12h14'></path> {/* 箭头图标 */}
                      <path d='m12 5 7 7-7 7'></path>
                    </svg>
                    {item.cacheReads?.toLocaleString()} {/* 缓存读取数量 */}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>{' '}
      {/* 结束内容容器 */}
    </div>
  );
};

// 导出历史项组件
export default HistoryItem;
