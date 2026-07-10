import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { EmptyState, ProductGridSkeleton } from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { useWishlist } from '../contexts/WishlistContext'

export default function Wishlist() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { isWishlistLoading, wishlist } = useWishlist()

  return (
    <section className="container page-section">
      <p className="eyebrow gradient-text">Wishlist</p>
      <h1 className="page-title">Saved products</h1>

      {isAuthLoading || isWishlistLoading ? <ProductGridSkeleton count={4} /> : null}
      {!isAuthLoading && !isAuthenticated && (
        <EmptyState
          title="Login to view your wishlist"
          description="Save your favorite devices and quickly add them to cart when you are ready."
          action={<Link className="btn primary" to="/login">Login to Continue</Link>}
        />
      )}
      {isAuthenticated && !isWishlistLoading && wishlist.length === 0 && (
        <EmptyState
          title="Your wishlist is empty"
          description="Tap the heart icon on any product to save it here for later."
          action={<Link className="btn primary" to="/products">Explore Products</Link>}
        />
      )}
      {isAuthenticated && !isWishlistLoading && wishlist.length > 0 && (
        <div className="product-grid with-top-space">
          {wishlist.map((product) => <ProductCard key={product._id || product.id} product={product} />)}
        </div>
      )}
    </section>
  )
}
