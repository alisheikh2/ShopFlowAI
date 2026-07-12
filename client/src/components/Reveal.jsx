import { useEffect, useRef, useState } from 'react'

/**
 * Wraps children and adds a `revealed` class once the element scrolls into
 * view, triggering a CSS fade/slide-up transition (see .reveal in App.css).
 *
 * Usage:
 *   <Reveal><div className="product-card">...</div></Reveal>
 *   <Reveal delay={120} as="section">...</Reveal>
 */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [isRevealed, setIsRevealed] = useState(prefersReducedMotion)

  useEffect(() => {
    const node = ref.current
    if (!node || prefersReducedMotion()) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${isRevealed ? 'revealed' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
