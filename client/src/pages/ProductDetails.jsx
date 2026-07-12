/* eslint-disable react-hooks/set-state-in-effect */
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, Pencil, ShieldAlert, ShoppingBag, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '../components/LoadingState'
import ImageSlideshow from '../components/ImageSlideshow'
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
  const { isAdmin, isAuthenticated, user } = useAuth()
  const { addToCart } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalReviews: 0 })
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewMessageType, setReviewMessageType] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewPendingDelete, setReviewPendingDelete] = useState(null)
  const [isDeletingReview, setIsDeletingReview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  const myReview = useMemo(
    () => reviews.find((review) => review.user?._id === user?._id) || null,
    [reviews, user?._id],
  )

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

  // When the signed-in user already has a review on this product, load it
  // into the form so "Write a review" becomes "Edit your review" instead of
  // silently failing with a duplicate-review error on submit.
  useEffect(() => {
    if (myReview) {
      setReviewForm({ rating: myReview.rating, comment: myReview.comment || '' })
    } else {
      setReviewForm({ rating: 0, comment: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReview?._id])

  const submitReview = async (event) => {
    event.preventDefault()
    try {
      if (!isAuthenticated) {
        navigate('/login')
        return
      }
      setReviewMessage('')
      setReviewMessageType('')
      if (!reviewForm.rating) {
        setReviewMessage('Please select a star rating before submitting your review.')
        setReviewMessageType('error')
        return
      }
      setIsSubmittingReview(true)
      if (myReview) {
        await api.put(`/reviews/${myReview._id}`, {
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        })
        await loadProduct()
        setReviewMessage('Your review has been updated.')
      } else {
        await api.post('/reviews', {
          productId: product._id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        })
        await loadProduct()
        setReviewMessage('Thanks for the feedback! Your review is now live.')
      }
      setReviewMessageType('success')
    } catch (err) {
      const isUnverifiedPurchase = err.message?.toLowerCase().includes('purchased')
      setReviewMessage(
        isUnverifiedPurchase
          ? "You haven't purchased this product yet"
          : err.message || 'Something went wrong. Please try again.',
      )
      setReviewMessageType(isUnverifiedPurchase ? 'locked' : 'error')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const deleteMyReview = async () => {
    if (!reviewPendingDelete) return
    try {
      setIsDeletingReview(true)
      await api.delete(`/reviews/${reviewPendingDelete._id}`)
      setReviewPendingDelete(null)
      await loadProduct()
      setReviewMessage('Your review has been deleted.')
      setReviewMessageType('success')
    } catch (err) {
      setReviewMessage(err.message || 'Could not delete review')
      setReviewMessageType('error')
    } finally {
      setIsDeletingReview(false)
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
          {Array.isArray(item.images) && item.images.length > 0 ? (
            <ImageSlideshow images={item.images} alt={item.displayName} />
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
              <h3>{myReview ? 'Edit your review' : 'Write a review'}</h3>
              <div className="star-picker" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((starValue) => (
                  <button
                    type="button"
                    key={starValue}
                    className="star-picker-btn"
                    aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
                    aria-pressed={reviewForm.rating === starValue}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setReviewForm((current) => ({ ...current, rating: starValue }))}
                  >
                    <Star
                      size={26}
                      className={(hoverRating || reviewForm.rating) >= starValue ? 'star-filled' : 'star-empty'}
                      fill={(hoverRating || reviewForm.rating) >= starValue ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
                <span className="star-picker-label">{reviewForm.rating ? `${reviewForm.rating} out of 5` : 'Select a rating'}</span>
              </div>
              <textarea placeholder="Share your experience" value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} required />
              <div className="review-form-actions">
                <button className="btn primary" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                </button>
                {myReview && (
                  <button
                    type="button"
                    className="btn ghost danger"
                    onClick={() => setReviewPendingDelete(myReview)}
                    disabled={isSubmittingReview}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </div>
              <p className="hint">Only delivered purchases can be reviewed.</p>
              {reviewMessage && (
                <div className={`review-feedback ${reviewMessageType}`}>
                  {reviewMessageType === 'locked' && <ShieldAlert size={18} />}
                  <div>
                    <strong>
                      {reviewMessageType === 'locked' ? "Verified purchase required" : reviewMessageType === 'success' ? 'Review posted' : 'Could not submit review'}
                    </strong>
                    <p>{reviewMessage}</p>
                  </div>
                </div>
              )}
            </form>
          )}
          <div className="review-list">
            {reviews.length === 0 && <div className="glass-card empty-review">No Reviews Yet</div>}
            {reviews.map((review) => {
              const isOwnReview = review.user?._id === user?._id
              const canManage = isOwnReview || isAdmin
              return (
                <article className="review-card glass-card" key={review._id}>
                  <div className="review-card-head">
                    <div className="rating-row">
                      {[1, 2, 3, 4, 5].map((starValue) => (
                        <Star
                          key={starValue}
                          size={15}
                          className={review.rating >= starValue ? 'star-filled' : 'star-empty'}
                          fill={review.rating >= starValue ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    {canManage && (
                      <div className="review-card-actions">
                        {isOwnReview && (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit your review"
                            onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-btn danger"
                          title={isOwnReview ? 'Delete your review' : 'Delete review (admin)'}
                          onClick={() => setReviewPendingDelete(review)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p>{review.comment}</p>
                  <strong>{review.user?.name || 'Customer'}{isOwnReview && <span className="own-review-badge">You</span>}</strong>
                </article>
              )
            })}
          </div>
        </div>
      </div>

      {reviewPendingDelete && (
        <div className="logout-confirm-backdrop" onClick={() => setReviewPendingDelete(null)}>
          <div className="logout-confirm-card" role="dialog" aria-modal="true" aria-label="Confirm delete review" onClick={(event) => event.stopPropagation()}>
            <div className="logout-confirm-icon danger"><Trash2 size={22} /></div>
            <h3>Delete this review?</h3>
            <p>This action can't be undone, and the product's average rating will be recalculated.</p>
            <div className="logout-confirm-actions">
              <button className="btn ghost" onClick={() => setReviewPendingDelete(null)}>Cancel</button>
              <button className="btn primary" onClick={deleteMyReview} disabled={isDeletingReview}>
                {isDeletingReview ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
