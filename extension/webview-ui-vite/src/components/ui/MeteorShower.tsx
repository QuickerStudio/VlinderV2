import { useEffect, useRef } from 'react'

interface MeteorShowerProps {
  active: boolean
}

const MeteorShower: React.FC<MeteorShowerProps> = ({ active }) => {
  const meteorTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!active) {
      // 接收到关闭信号：停止流星动画
      if (meteorTimeoutRef.current) {
        clearTimeout(meteorTimeoutRef.current)
      }
      return
    }

    // 接收到开启信号：启动流星动画
    const createMeteor = () => {
      if (!active) return

      const meteor = document.createElement('div')
      meteor.className = 'meteor'
      document.body.appendChild(meteor)

      const startX = Math.random() * (window.innerWidth + 700)
      const startY = -100
      const duration = Math.random() * 1000 + 1500

      meteor.style.setProperty('--meteor-animation', `meteor ${duration}ms ease-in`)
      meteor.style.left = startX + 'px'
      meteor.style.top = startY + 'px'

      setTimeout(() => {
        meteor.remove()
      }, duration)
    }

    const startMeteorAnimation = () => {
      const loop = () => {
        if (!active) return
        
        const delay = Math.random() * 5000 + 3000
        createMeteor()
        meteorTimeoutRef.current = setTimeout(loop, delay)
      }
      meteorTimeoutRef.current = setTimeout(loop, Math.random() * 3000)
    }

    startMeteorAnimation()

    return () => {
      if (meteorTimeoutRef.current) {
        clearTimeout(meteorTimeoutRef.current)
      }
    }
  }, [active])

  // 这个组件不渲染任何DOM，只管理流星动画
  return null
}

export default MeteorShower