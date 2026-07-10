import { Link, useNavigate } from 'react-router-dom'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { useWishlist } from '../contexts/WishlistContext'
import { formatCurrency } from '../utils/format'
import { normalizeProduct } from '../utils/product'

export default function ProductCard({ product }) {
  const item = normalizeProduct(product)
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  const handleAddToCart = async () => {
    try {
      setIsAdding(true)
      setMessage('')
      await addToCart(item.id, 1)
      setMessage('Added')
      showToast(`${item.displayName} added to cart`, 'success')
      setTimeout(() => setMessage(''), 1400)
    } catch (error) {
      setMessage(error.message || 'Login required')
      showToast(error.message || 'Please login first', 'error')
      if (error.message?.toLowerCase().includes('login')) {
        setTimeout(() => navigate('/login'), 700)
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleWishlist = async () => {
    try {
      setMessage('')
      const saved = await toggleWishlist(product)
      showToast(saved ? `${item.displayName} added to wishlist` : `${item.displayName} removed from wishlist`, saved ? 'success' : 'info')
    } catch (error) {
      setMessage(error.message || 'Login required')
      showToast(error.message || 'Please login first', 'error')
      if (error.message?.toLowerCase().includes('login')) {
        setTimeout(() => navigate('/login'), 700)
      }
    }
  }

  return (
    <article className="product-card hover-tilt">
      <Link className="product-media" to={`/products/${item.slug}`} aria-label={`View ${item.displayName} details`}>
        <span className="product-badge">{item.badge || (item.stock <= 5 ? 'Low Stock' : 'Featured')}</span>
        <button
          className={`wishlist-btn ${isWishlisted(item.id) ? 'active' : ''}`}
          aria-label={`${isWishlisted(item.id) ? 'Remove' : 'Add'} ${item.displayName} ${isWishlisted(item.id) ? 'from' : 'to'} wishlist`}
          onClick={(event) => { event.preventDefault(); handleWishlist() }}
        >
          <Heart size={17} fill={isWishlisted(item.id) ? 'currentColor' : 'none'} />
        </button>
        {item.displayImageUrl && !imageFailed ? (
          <img className="product-image" src={item.displayImageUrl} alt={item.displayName} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="product-emoji" aria-hidden="true">{item.displayEmoji}</div>
        )}
      </Link>

      <div className="product-body">
        <p className="eyebrow">{item.displayCategory}</p>
        <h3>
          <Link to={`/products/${item.slug}`}>{item.displayName}</Link>
        </h3>
        <p className="product-description">{item.description}</p>
        <div className="rating-row">
          <Star size={16} fill="currentColor" />
          <span>{item.ratings || item.rating || 0}</span>
          <small>({item.numReviews || item.reviews || 0})</small>
        </div>
        <div className="price-row">
          <div>
            <strong>{formatCurrency(item.displayPrice)}</strong>
            {item.displayOldPrice > item.displayPrice && <del>{formatCurrency(item.displayOldPrice)}</del>}
          </div>
          <Link className="view-details-link" to={`/products/${item.slug}`}>Details</Link>
          <button
            className="mini-cart-btn"
            aria-label={`Add ${item.displayName} to cart`}
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            <ShoppingBag size={17} />
          </button>
        </div>
        {message && <p className="inline-message">{message}</p>}
      </div>
    </article>
  )
}
