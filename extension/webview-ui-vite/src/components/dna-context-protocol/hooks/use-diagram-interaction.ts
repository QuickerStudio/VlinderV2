import { useState, useCallback, useRef, useEffect } from 'react'

interface DiagramInteractionState {
	scale: number
	translateX: number
	translateY: number
	isDragging: boolean
	isPanMode: boolean
}

interface DiagramInteractionOptions {
	minScale?: number;
	maxScale?: number;
	scaleStep?: number;
	enablePan?: boolean;
	enableZoom?: boolean;
	isEditing?: boolean;
	renderedDiagram: string | null; // 新增：接收渲染后的图表
}

export function useDiagramInteraction({
	renderedDiagram,
	minScale = 0.1,
	maxScale = 5,
	scaleStep = 0.1,
	enablePan = true,
	enableZoom = true
}: DiagramInteractionOptions) {
	const [state, setState] = useState<DiagramInteractionState>({
		scale: 1,
		translateX: 0,
		translateY: 0,
		isDragging: false,
		isPanMode: false
	})

	const containerRef = useRef<HTMLDivElement>(null)
	const lastMousePos = useRef({ x: 0, y: 0 })
	const dragStartPos = useRef({ x: 0, y: 0 })

	// 重置视图到初始状态
	const resetView = useCallback(() => {
		setState(prev => ({
			...prev,
			scale: 1,
			translateX: 0,
			translateY: 0,
			isDragging: false
			// 保持 isPanMode 状态不变
		}))
	}, [])

	// 缩放功能
	const zoomIn = useCallback(() => {
		if (!enableZoom) return
		setState(prev => ({
			...prev,
			scale: Math.min(prev.scale + scaleStep, maxScale)
		}))
	}, [enableZoom, scaleStep, maxScale])

	const zoomOut = useCallback(() => {
		if (!enableZoom) return
		setState(prev => ({
			...prev,
			scale: Math.max(prev.scale - scaleStep, minScale)
		}))
	}, [enableZoom, scaleStep, minScale])

	const setZoom = useCallback((scale: number) => {
		if (!enableZoom) return
		setState(prev => ({
			...prev,
			scale: Math.max(minScale, Math.min(scale, maxScale))
		}))
	}, [enableZoom, minScale, maxScale])

	// 适应容器大小
	const fitToContainer = useCallback(() => {
		const container = containerRef.current
		if (!container) return

		const diagram = container.querySelector('.mermaid-diagram svg') as SVGElement
		if (!diagram) return

		const containerRect = container.getBoundingClientRect()
		const diagramRect = diagram.getBoundingClientRect()

		const scaleX = (containerRect.width - 40) / diagramRect.width
		const scaleY = (containerRect.height - 40) / diagramRect.height
		const newScale = Math.min(scaleX, scaleY, 1) // 不超过原始大小

		setState(prev => ({
			...prev,
			scale: Math.max(newScale, minScale),
			translateX: 0,
			translateY: 0,
			isDragging: false
			// 保持 isPanMode 状态不变
		}))
	}, [minScale])

	// 鼠标滚轮缩放
	const handleWheel = useCallback((e: WheelEvent) => {
		if (!enableZoom) return
		e.preventDefault()

		const container = containerRef.current
		if (!container) return

		const rect = container.getBoundingClientRect()
		const mouseX = e.clientX - rect.left
		const mouseY = e.clientY - rect.top

		const delta = e.deltaY > 0 ? -scaleStep : scaleStep
		const newScale = Math.max(minScale, Math.min(state.scale + delta, maxScale))

		if (newScale !== state.scale) {
			// 以鼠标位置为中心缩放
			const scaleRatio = newScale / state.scale
			const newTranslateX = mouseX - (mouseX - state.translateX) * scaleRatio
			const newTranslateY = mouseY - (mouseY - state.translateY) * scaleRatio

			setState(prev => ({
				...prev,
				scale: newScale,
				translateX: newTranslateX,
				translateY: newTranslateY
			}))
		}
	}, [enableZoom, scaleStep, minScale, maxScale, state.scale, state.translateX, state.translateY])

	// 切换平移模式
	const togglePanMode = useCallback(() => {
		setState(prev => ({
			...prev,
			isPanMode: !prev.isPanMode,
			isDragging: false
		}))
	}, [])

	// 鼠标拖拽开始
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (!enablePan || !state.isPanMode) return
		e.preventDefault()

		setState(prev => ({ ...prev, isDragging: true }))
		lastMousePos.current = { x: e.clientX, y: e.clientY }
		dragStartPos.current = { x: state.translateX, y: state.translateY }
	}, [enablePan, state.isPanMode, state.translateX, state.translateY])

	// 鼠标拖拽移动
	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!enablePan || !state.isDragging) return

		const deltaX = e.clientX - lastMousePos.current.x
		const deltaY = e.clientY - lastMousePos.current.y

		setState(prev => ({
			...prev,
			translateX: dragStartPos.current.x + deltaX,
			translateY: dragStartPos.current.y + deltaY
		}))
	}, [enablePan, state.isDragging])

	// 鼠标拖拽结束
	const handleMouseUp = useCallback(() => {
		setState(prev => ({ ...prev, isDragging: false }))
	}, [])

	// 聚焦到节点
	const focusToNode = useCallback((nodeElement: Element) => {
		const container = containerRef.current
		if (!container) return

		const containerRect = container.getBoundingClientRect()
		const nodeRect = nodeElement.getBoundingClientRect()

		// 计算节点中心点在屏幕坐标系中的位置
		const nodeCenterScreen = {
			x: nodeRect.left + nodeRect.width / 2,
			y: nodeRect.top + nodeRect.height / 2
		}

		// 计算容器中心点在屏幕坐标系中的位置
		const containerCenterScreen = {
			x: containerRect.left + containerRect.width / 2,
			y: containerRect.top + containerRect.height / 2
		}

		// 计算将节点中心移动到容器中心所需的平移增量
		const deltaX = containerCenterScreen.x - nodeCenterScreen.x;
		const deltaY = containerCenterScreen.y - nodeCenterScreen.y;

		// 将增量应用到当前的translateX和translateY，得到新的值
		const newTranslateX = state.translateX + deltaX;
		const newTranslateY = state.translateY + deltaY;

		setState(prev => ({
			...prev,
			translateX: newTranslateX,
			translateY: newTranslateY
		}))
	}, [state.scale, state.translateX, state.translateY])

	// 处理右键点击
	const handleContextMenu = useCallback((e: MouseEvent) => {
		e.preventDefault()

		// 只在抓手模式下处理右键功能
		if (!state.isPanMode) return

		const target = e.target as Element

		// 查找是否点击了节点
		const nodeElement = target.closest('.node, [id*="flowchart-"], [id*="node-"]')

		if (nodeElement) {
			// 右键点击节点 -> 聚焦到该节点
			focusToNode(nodeElement)
		} else {
			// 右键点击空白区域 -> 重置窗口
			resetView()
		}
	}, [state.isPanMode, focusToNode, resetView])

	// 绑定事件监听器
	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		// 鼠标事件
		const handleMouseMoveGlobal = (e: MouseEvent) => handleMouseMove(e)
		const handleMouseUpGlobal = () => handleMouseUp()

		// 绑定事件
		container.addEventListener('wheel', handleWheel, { passive: false })
		container.addEventListener('contextmenu', handleContextMenu)
		document.addEventListener('mousemove', handleMouseMoveGlobal)
		document.addEventListener('mouseup', handleMouseUpGlobal)

		// 清理事件
		return () => {
			container.removeEventListener('wheel', handleWheel)
			container.removeEventListener('contextmenu', handleContextMenu)
			document.removeEventListener('mousemove', handleMouseMoveGlobal)
			document.removeEventListener('mouseup', handleMouseUpGlobal)
		}
	}, [handleWheel, handleMouseMove, handleMouseUp, handleContextMenu, renderedDiagram])

	// 生成变换样式
	const getTransformStyle = useCallback(() => {
		return {
			transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`,
			transformOrigin: '0 0',
			transition: state.isDragging ? 'none' : 'transform 0.2s ease-out'
		}
	}, [state])

	// 获取容器样式（包括鼠标指针）
	const getContainerStyle = useCallback(() => {
		let cursor = 'default'

		if (state.isDragging) {
			cursor = 'grabbing'
		} else if (state.isPanMode) {
			cursor = 'grab'
		}

		return { cursor }
	}, [state])

	// 获取缩放百分比
	const getZoomPercentage = useCallback(() => {
		return Math.round(state.scale * 100)
	}, [state.scale])

	return {
		containerRef,
		state,
		// 控制方法
		zoomIn,
		zoomOut,
		setZoom,
		resetView,
		fitToContainer,
		togglePanMode,
		// 事件处理
		handleMouseDown,
		// 样式和状态
		getTransformStyle,
		getContainerStyle,
		getZoomPercentage,
		// 状态查询
		canZoomIn: state.scale < maxScale,
		canZoomOut: state.scale > minScale,
		isPanMode: state.isPanMode
	}
}
