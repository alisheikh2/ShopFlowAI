/* eslint-disable react-hooks/set-state-in-effect */
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState } from '../components/LoadingState'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import api from '../services/api'
import { formatCurrency } from '../utils/format'
import { normalizeProduct } from '../utils/product'

export default function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isAuthenticated } = useAuth()
  const { addToCart } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalReviews: 0 })
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  const loadProduct = async () => {
    try {
      setIsLoading(true)
      setError('')
      const [productResponse, reviewsResponse] = await Promise.all([
        api.get(`/products/${slug}`),
        api.get(`/reviews/product/${slug}`),
      ])
      setProduct(productResponse.data?.product)
      setReviews(reviewsResponse.data?.reviews || [])
      setReviewSummary({
        averageRating: reviewsResponse.data?.averageRating || 0,
        totalReviews: reviewsResponse.data?.totalReviews || 0,
      })
    } catch (err) {
      setError(err.message || 'Failed to load product')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handleAddToCart = async () => {
    if (!product || Number(product.stock) <= 0) {
      setMessage('This product is currently out of stock.')
      return
    }
    try {
      setMessage('')
      await addToCart(product._id, quantity)
      setMessage('Added to cart')
    } catch (err) {
      setMessage(err.message)
      if (err.message?.toLowerCase().includes('login')) {
        setTimeout(() => navigate('/login'), 700)
      }
    }
  }

  const handleWishlist = async () => {
    try {
      await toggleWishlist(product)
    } catch (err) {
      setMessage(err.message)
      if (err.message?.toLowerCase().includes('login')) {
        setTimeout(() => navigate('/login'), 700)
      }
    }
  }

  const submitReview = async (event) => {
    event.preventDefault()
    try {
      if (!isAuthenticated) {
        navigate('/login')
        return
      }
      await api.post('/reviews', {
        productId: product._id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      })
      setReviewForm({ rating: 5, comment: '' })
      await loadProduct()
      setMessage('Review submitted successfully.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  useEffect(() => {
    if (!isLoading && window.location.hash === '#reviews') {
      setTimeout(() => {
        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [isLoading, product])

  if (isLoading) {
    return <section className="container page-section"><div className="detail-skeleton skeleton" /></section>
  }

  if (error) {
    return <section className="container page-section"><ErrorState message={error} onRetry={loadProduct} /></section>
  }

  const item = normalizeProduct(product)
  const detailHighlights = [
    `${item.displayCategory} by ${item.brand || 'ShopFlowAI'}`,
    `${item.stock || 0} units currently available`,
    item.discountPrice > 0 ? 'Discounted price available' : 'Premium catalog selection',
    'Secure checkout with invoice email support',
  ]

  return (
    <section className="container page-section">
      <div className="breadcrumbs"><Link to="/products">Products</Link> / {item.displayName}</div>
      <div className="product-detail-grid">
        <div className="product-detail-media hover-tilt">
          {item.displayImageUrl ? (
            <img className="detail-image" src={item.displayImageUrl} alt={item.displayName} />
          ) : (
            <span className="detail-emoji">{item.displayEmoji}</span>
          )}
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow gradient-text">{item.displayCategory}</p>
          <h1>{item.displayName}</h1>
          <div className="rating-row large">
            <Star size={18} fill="currentColor" />
            <strong>{item.ratings || 0}</strong>
            <span>{item.numReviews || 0} reviews</span>
            <StatusBadge tone={Number(item.stock) <= 0 ? 'orange' : item.stock <= 5 ? 'orange' : 'green'}>
              {Number(item.stock) <= 0 ? 'Out of Stock' : item.stock <= 5 ? 'Low Stock' : 'In Stock'}
            </StatusBadge>
          </div>
          <p className="detail-description">{item.description}</p>
          <div className="detail-highlights">
            {detailHighlights.map((highlight) => <span key={highlight}>{highlight}</span>)}
          </div>
          <div className="detail-price">
            <strong>{formatCurrency(item.displayPrice)}</strong>
            {item.displayOldPrice > item.displayPrice && <del>{formatCurrency(item.displayOldPrice)}</del>}
          </div>
          <div className="sku-box">SKU: <strong>{item.sku || `SKU-${item.id?.slice(-8)?.toUpperCase()}`}</strong></div>
          <div className="quantity-panel">
            <span>Quantity</span>
            <input
              min="1"
              max={Math.max(Number(item.stock) || 0, 1)}
              type="number"
              value={quantity}
              disabled={Number(item.stock) <= 0}
              onChange={(event) => setQuantity(Math.min(Math.max(1, Number(event.target.value) || 1), Number(item.stock) || 1))}
            />
          </div>
          {!isAdmin && (
            <div className="detail-actions">
              <button className="btn primary" onClick={handleAddToCart} disabled={Number(item.stock) <= 0}>
                <ShoppingBag size={18} /> {Number(item.stock) <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button className="btn ghost" onClick={handleWishlist}>
                <Heart size={18} fill={isWishlisted(item.id) ? 'currentColor' : 'none'} />
                {isWishlisted(item.id) ? 'Saved' : 'Wishlist'}
              </button>
            </div>
          )}
          {message && <p className="inline-message large-message">{message}</p>}
        </div>
      </div>

      <div className="reviews-section" id="reviews">
        <div className="section-header">
          <div>
            <p className="eyebrow gradient-text">Reviews</p>
            <h2>Customer feedback</h2>
            <p>{reviewSummary.totalReviews} reviews · Average rating {reviewSummary.averageRating || 0}</p>
          </div>
        </div>
        <div className="reviews-grid">
          {!isAdmin && (
            <form className="review-form glass-card" onSubmit={submitReview}>
              <h3>Write a review</h3>
              <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}>
                {[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} stars</option>)}
              </select>
              <textarea placeholder="Share your experience" value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} required />
              <button className="btn primary">Submit Review</button>
              <p className="hint">Only delivered purchases can be reviewed.</p>
            </form>
          )}
          <div className="review-list">
            {reviews.length === 0 && <div className="glass-card empty-review">No Reviews Yet</div>}
            {reviews.map((review) => (
              <article className="review-card glass-card" key={review._id}>
                <div className="rating-row"><Star size={16} fill="currentColor" /> {review.rating}</div>
                <p>{review.comment}</p>
                <strong>{review.user?.name || 'Customer'}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
