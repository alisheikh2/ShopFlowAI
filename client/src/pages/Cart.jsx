import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '../components/LoadingState'
import { useCart } from '../contexts/CartContext'
import { formatCurrency } from '../utils/format'
import { getProductImageUrl, getProductName } from '../utils/product'

export default function Cart() {
  const { cart, cartError, isCartLoading, removeItem, updateQuantity } = useCart()

  const handleQuantity = async (productId, quantity) => {
    if (quantity < 1) return
    await updateQuantity(productId, quantity)
  }

  return (
    <section className="container page-section">
      <div className="cart-layout">
        <div>
          <p className="eyebrow gradient-text">Cart</p>
          <h1 className="page-title">Your shopping cart</h1>
          <p className="page-subtitle">Review your picks, adjust quantities, and check out securely when you're ready.</p>

          {isCartLoading && <div className="glass-card cart-loading skeleton" />}
          {!isCartLoading && cartError && <p className="form-error">{cartError}</p>}
          {!isCartLoading && cart.pricingUpdated && (
            <p className="inline-message large-message">One or more prices changed. Your cart total has been refreshed to the latest catalog prices.</p>
          )}
          {!isCartLoading && cart.items.length === 0 && (
            <EmptyState
              title="Your cart is empty"
              description="Add products to your cart and they will appear here."
              action={<Link className="btn primary" to="/products">Shop Products</Link>}
            />
          )}

          <div className="cart-list">
            {cart.items.map((item) => {
              const product = item.product
              const productId = product?._id || item.product
              const imageUrl = getProductImageUrl(product)

              return (
                <div className="cart-item glass-card" key={productId}>
                  <div className="cart-emoji">
                    {imageUrl ? <img src={imageUrl} alt={getProductName(product)} /> : '🛍️'}
                  </div>
                  <div>
                    <h3>{getProductName(product)}</h3>
                    <p>{product?.sku || `SKU-${String(productId).slice(-8).toUpperCase()}`}</p>
                    <strong>{formatCurrency(item.priceSnapshot)}</strong>
                    {item.priceChanged && item.previousPrice !== undefined && <del>{formatCurrency(item.previousPrice)}</del>}
                  </div>
                  <div className="qty-control">
                    <button onClick={() => handleQuantity(productId, item.quantity - 1)}><Minus size={15} /></button>
                    <span>{item.quantity}</span>
                    <button disabled={item.quantity >= Number(product?.stock || 0)} onClick={() => handleQuantity(productId, item.quantity + 1)}><Plus size={15} /></button>
                  </div>
                  <button className="icon-btn danger" onClick={() => removeItem(productId)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <aside className="summary-card">
          <h2>Order summary</h2>
          <div><span>Items</span><strong>{cart.totalItems}</strong></div>
          <div><span>Subtotal</span><strong>{formatCurrency(cart.subtotal)}</strong></div>
          <div><span>Shipping</span><strong>Free</strong></div>
          <div className="summary-total"><span>Total</span><strong>{formatCurrency(cart.subtotal)}</strong></div>
          <Link className={`btn primary full ${cart.items.length === 0 ? 'disabled-link' : ''}`} to="/checkout">
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </section>
  )
}
