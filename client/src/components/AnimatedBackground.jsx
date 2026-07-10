import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

const routeVariants = [
  { match: (path) => path === '/', variant: 'home', chips: ['AI', 'PDF'], cubes: ['S', ''] },
  { match: (path) => path.startsWith('/products'), variant: 'products', chips: ['SKU', '360'], cubes: ['⌚', '🎧'] },
  { match: (path) => path.startsWith('/categories'), variant: 'categories', chips: ['CAT', 'GRID'], cubes: ['▦', ''] },
  { match: (path) => path.startsWith('/wishlist'), variant: 'wishlist', chips: ['LOVE', 'SAVE'], cubes: ['♥', ''] },
  { match: (path) => path.startsWith('/account/orders') || path.startsWith('/order-success'), variant: 'orders', chips: ['PDF', 'SHIP'], cubes: ['✓', ''] },
  { match: (path) => path.startsWith('/cart') || path.startsWith('/checkout'), variant: 'checkout', chips: ['PAY', 'COD'], cubes: ['🛒', ''] },
  { match: (path) => path.startsWith('/admin'), variant: 'admin', chips: ['DATA', 'LIVE'], cubes: ['▤', ''] },
]

export default function AnimatedBackground() {
  const [offset, setOffset] = useState(0)
  const { pathname } = useLocation()

  const config = useMemo(
    () => routeVariants.find((item) => item.match(pathname)) || routeVariants[0],
    [pathname],
  )

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setOffset(window.scrollY * 0.16))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className={`scroll-3d-bg bg-${config.variant}`} aria-hidden="true" style={{ '--scrollY': `${offset}px` }}>
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />
      <div className="bg-cube cube-a"><span>{config.cubes[0]}</span></div>
      <div className="bg-cube cube-b"><span>{config.cubes[1]}</span></div>
      <div className="bg-ring-3d ring-a" />
      <div className="bg-ring-3d ring-b" />
      <div className="bg-chip chip-a">{config.chips[0]}</div>
      <div className="bg-chip chip-b">{config.chips[1]}</div>
      <div className="bg-track-line track-one" />
      <div className="bg-track-line track-two" />
    </div>
  )
}
