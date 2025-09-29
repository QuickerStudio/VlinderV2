export interface DnaContextProtocolProps {
	isOpen: boolean
	onClose: () => void
	className?: string
}

export interface HistoryRecord {
	id: string
	name: string
	code: string
	createdAt: Date
	svg?: string
	editHistory?: EditHistoryRecord[]
	editHistoryIndex?: number
}

export type ExportFormat = 'json' | 'md' | 'svg'

export interface EditHistoryRecord {
	id: string
	content: string
	timestamp: Date
	description: string
	changeType: 'add' | 'delete' | 'modify' | 'initial'
	linesChanged?: number
	isPinned?: boolean
}

// 扩展节点类型定义
export type NodeType =
  | 'rectangle'
  | 'rounded'
  | 'diamond'
  | 'circle'
  | 'image'
  | 'text'
  | 'button'
  | 'stadium'        // 体育场形状 ([Text])
  | 'subroutine'     // 子程序形状 [[Text]]
  | 'cylindrical'    // 圆柱形 [(Text)]
  | 'hexagon'        // 六边形 {{Text}}
  | 'parallelogram'  // 平行四边形 [/Text/]
  | 'trapezoid'      // 梯形 [/Text\]
  | 'doubleCircle'   // 双圆形 (((Text)))

export interface NodeTypeConfig {
	value: NodeType
	label: string
	icon: string
	description: string
}

// 图片节点相关类型
export interface ImageNodeData {
	src: string
	alt: string
	width?: number
	height?: number
	file?: File
}

// 文字节点相关类型
export interface TextNodeData {
	content: string
	fontSize?: number
	color?: string
	backgroundColor?: string
	alignment?: 'left' | 'center' | 'right'
}

// 按钮节点相关类型
export interface ButtonNodeData {
	label: string
	action: string
	description: string
	variant?: 'primary' | 'secondary' | 'outline'
	size?: 'small' | 'medium' | 'large'
}
