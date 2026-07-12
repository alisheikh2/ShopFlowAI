/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { CreditCard, Download, Eye, Star, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import StatusBadge from '../components/StatusBadge'
import api from '../services/api'
import { formatCurrency } from '../utils/format'

const statusTone = {
  pending: 'orange',
  processing: 'blue',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'orange',
}

export default function Orders() {
  const { isAdmin, isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderToCancel, setOrderToCancel] = useState(null)
  const [reviewedProducts, setReviewedProducts] = useState(new Set())
  const [isCancelling, setIsCancelling] = useState(false)


  const loadReviewedProducts = async (ordersToCheck) => {
    const deliveredItems = ordersToCheck
      .filter((order) => order.orderStatus === 'delivered')
      .flatMap((order) => order.items || [])
      .filter((item) => item.product?.slug)

    const reviewed = new Set()
    await Promise.all(
      deliveredItems.map(async (item) => {
        try {
          const response = await api.get(`/reviews/product/${item.product.slug}`)
          const hasReviewed = (response.data?.reviews || []).some((review) => review.user?._id === user?._id)
          if (hasReviewed) {
            reviewed.add(item.product._id || item.product.slug)
          }
        } catch {
          // If reviews fail to load, keep the review CTA visible.
        }
      }),
    )
    setReviewedProducts(reviewed)
  }

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/orders/my-orders')
      const nextOrders = response.data?.orders || []
      setOrders(nextOrders)
      await loadReviewedProducts(nextOrders)
    } catch (err) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      loadOrders()
    } else if (!isAuthLoading) {
      setIsLoading(false)
    }
  }, [isAuthenticated, isAuthLoading, isAdmin])

  const downloadInvoice = async (orderId, invoiceNumber) => {
    const blob = await api.get(`/orders/${orderId}/invoice`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ShopFlowAI-Invoice-${invoiceNumber || orderId}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  const cancelOrder = async () => {
    if (!orderToCancel) return

    try {
      setIsCancelling(true)
      await api.patch(`/orders/${orderToCancel._id}/cancel`)
      showToast('Order cancelled successfully.', 'success')
      setOrderToCancel(null)
      await loadOrders()
    } catch (err) {
      showToast(err.message || 'Unable to cancel order.', 'error')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <section className="container page-section">
      <p className="eyebrow gradient-text">Account</p>
      <h1 className="page-title">My orders</h1>
      <p className="page-subtitle">Track deliveries, download invoices, and manage payments for every order you've placed.</p>

      {isAuthLoading && <div className="table-card order-table-skeleton skeleton" />}
      {!isAuthLoading && isAdmin && (
        <EmptyState
          title="Use Admin Orders"
          description="Admin accounts manage all customer orders from the admin dashboard."
          action={<Link className="btn primary" to="/admin/orders">Open Admin Orders</Link>}
        />
      )}
      {!isAuthLoading && !isAdmin && !isAuthenticated && (
        <EmptyState
          title="Sign in to view your orders"
          description="Your order history, payment updates, and invoice downloads are available after login."
          action={<Link className="btn primary" to="/login">Login to Continue</Link>}
        />
      )}
      {isAuthenticated && !isAdmin && isLoading && <div className="table-card order-table-skeleton skeleton" />}
      {isAuthenticated && !isAdmin && !isLoading && error && <ErrorState title="Unable to load orders" message="We couldn't load your order history right now. Please try again." onRetry={loadOrders} />}
      {isAuthenticated && !isAdmin && !isLoading && !error && orders.length === 0 && (
        <EmptyState title="No orders yet" description="Your placed orders will appear here." action={<Link className="btn primary" to="/products">Start Shopping</Link>} />
      )}
      {isAuthenticated && !isAdmin && !isLoading && !error && orders.length > 0 && (
        <div className="table-card">
          {orders.map((order) => (
            <div className="order-entry" key={order._id}>
              <div className="order-row">
                <div>
                  <strong>{order.invoiceNumber || order._id}</strong>
                  <p>{new Date(order.createdAt).toLocaleDateString('en-PK')}</p>
                </div>
                <strong className="order-total-value">{formatCurrency(order.totalAmount)}</strong>
                <StatusBadge className="order-status-value" tone={statusTone[order.orderStatus] || 'blue'}>{order.orderStatus}</StatusBadge>
                <StatusBadge className="payment-status-value" tone={order.paymentStatus === 'paid' ? 'green' : 'orange'}>{order.paymentStatus}</StatusBadge>
                <div className="row-actions">
                  <Link className="icon-btn" to={`/order-success/${order._id}`}><Eye size={17} /></Link>
                  {(order.paymentMethod === 'cod' || order.paymentStatus === 'paid') && (
                    <button className="icon-btn" onClick={() => downloadInvoice(order._id, order.invoiceNumber)}><Download size={17} /></button>
                  )}
                  {order.paymentMethod === 'stripe' && ['pending', 'failed'].includes(order.paymentStatus) && order.inventoryStatus === 'reserved' && (
                    <Link className="icon-btn" title="Complete card payment" to={`/checkout/payment/${order._id}`}><CreditCard size={17} /></Link>
                  )}
                  {order.orderStatus === 'pending' && (
                    <button className="icon-btn danger" title="Cancel order" onClick={() => setOrderToCancel(order)}><XCircle size={17} /></button>
                  )}
                </div>
              </div>
              {order.orderStatus === 'delivered' && order.items?.some((item) => item.product?.slug && !reviewedProducts.has(item.product._id || item.product.slug)) && (
                <div className="delivered-review-strip">
                  <span><Star size={16} fill="currentColor" /> Review delivered items</span>
                  <div>
                    {order.items.map((item) => item.product?.slug && !reviewedProducts.has(item.product._id || item.product.slug) && (
                      <Link className="review-chip" key={item.product._id || item.product.slug} to={`/products/${item.product.slug}#reviews`}>
                        Review {item.nameSnapshot || item.product.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {orderToCancel && (
        <div className="logout-confirm-backdrop" onClick={() => setOrderToCancel(null)}>
          <div className="logout-confirm-card" onClick={(event) => event.stopPropagation()}>
            <div className="logout-confirm-icon"><XCircle size={22} /></div>
            <h3>Cancel this order?</h3>
            <p>Pending orders can be cancelled before processing starts. This action will restore product stock.</p>
            <div className="logout-confirm-actions">
              <button className="btn ghost" onClick={() => setOrderToCancel(null)}>Keep Order</button>
              <button className="btn primary" onClick={cancelOrder} disabled={isCancelling}>{isCancelling ? 'Cancelling...' : 'Yes, Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
