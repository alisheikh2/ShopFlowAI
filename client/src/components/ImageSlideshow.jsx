import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Auto-rotating image slideshow used on the product detail page.
 * Falls back to a single static image when there's only one photo,
 * and to nothing when there are no images at all (caller handles that case).
 */
export default function ImageSlideshow({ images, alt }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((index) => {
    const total = images.length
    setActiveIndex(((index % total) + total) % total)
  }, [images.length])

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0)
  }, [images])

  useEffect(() => {
    if (images.length <= 1) return undefined
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [images.length])

  if (!images || images.length === 0) return null

  if (images.length === 1) {
    return <img className="detail-image" src={images[0].url} alt={alt} />
  }

  return (
    <div className="image-slideshow" role="group" aria-label="Product images">
      <div className="image-slideshow-track">
        {images.map((image, index) => (
          <img
            key={image.public_id || image.url || index}
            className={`image-slideshow-slide ${index === activeIndex ? 'active' : ''}`}
            src={image.url}
            alt={`${alt} - photo ${index + 1} of ${images.length}`}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      <button type="button" className="image-slideshow-nav prev" aria-label="Previous image" onClick={goPrev}>
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="image-slideshow-nav next" aria-label="Next image" onClick={goNext}>
        <ChevronRight size={20} />
      </button>

      <div className="image-slideshow-dots">
        {images.map((image, index) => (
          <button
            type="button"
            key={image.public_id || image.url || index}
            className={`image-slideshow-dot ${index === activeIndex ? 'active' : ''}`}
            aria-label={`Show image ${index + 1}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  )
}
