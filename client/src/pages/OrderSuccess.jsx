import { CheckCircle2, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import { useCart } from '../contexts/CartContext'
import api from '../services/api'
import { formatCurrency } from '../utils/format'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { fetchCart } = useCart()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [isSyncing, setIsSyncing] = useState(searchParams.get('payment_redirect') === '1')

  useEffect(() => {
    let cancelled = false

    const loadOrder = async () => {
      if (!orderId || orderId === 'created') return
      const shouldPoll = searchParams.get('payment_redirect') === '1'
      const attempts = shouldPoll ? 12 : 1

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const response = await api.get(`/orders/${orderId}`)
          const nextOrder = response.data?.order
          if (cancelled) return
          setOrder(nextOrder)
          setError('')

          if (shouldPoll && nextOrder?.paymentStatus === 'paid') {
            await fetchCart()
          }

          if (
            !shouldPoll ||
            ['paid', 'refunded'].includes(nextOrder?.paymentStatus) ||
            nextOrder?.orderStatus === 'cancelled'
          ) {
            break
          }
        } catch (requestError) {
          if (!cancelled) setError(requestError.message)
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      if (!cancelled) setIsSyncing(false)
    }

    loadOrder()
    return () => { cancelled = true }
  }, [fetchCart, orderId, searchParams])

  const downloadInvoice = async () => {
    try {
      const blob = await api.get(`/orders/${orderId}/invoice`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ShopFlowAI-Invoice-${order?.invoiceNumber || orderId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.message || 'Unable to download invoice.')
    }
  }

  const reservationActive = order?.paymentMethod === 'stripe'
    && ['pending', 'failed'].includes(order?.paymentStatus)
    && order?.inventoryStatus === 'reserved'
    && (!order?.paymentExpiresAt || new Date(order.paymentExpiresAt) > new Date())

  return (
    <section className="container page-section placeholder-page">
      <CheckCircle2 size={58} color="var(--success)" />
      <p className="eyebrow gradient-text">Order status</p>
      <h1>{order?.paymentStatus === 'paid' ? 'Payment received' : 'Thank you for shopping'}</h1>
      <p>{isSyncing ? 'Stripe returned successfully. We are waiting for signed webhook verification…' : 'Your latest order and payment status is shown below.'}</p>
      {error && <p className="form-error">{error}</p>}
      {order && (
        <div className="success-summary glass-card">
          <div><span>Order ID</span><strong>{order.invoiceNumber || order._id}</strong></div>
          <div><span>Total</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
          <div><span>Status</span><StatusBadge tone="blue">{order.orderStatus}</StatusBadge></div>
          <div><span>Payment</span><StatusBadge tone={order.paymentStatus === 'paid' ? 'green' : 'orange'}>{order.paymentStatus}</StatusBadge></div>
          {order.refundStatus && order.refundStatus !== 'none' && (
            <div><span>Refund</span><StatusBadge tone={order.refundStatus === 'succeeded' ? 'green' : 'orange'}>{order.refundStatus}</StatusBadge></div>
          )}
        </div>
      )}
      <div className="hero-actions">
        {order?.paymentStatus === 'paid' && <button className="btn primary" onClick={downloadInvoice}><Download size={18} /> Download Invoice</button>}
        {reservationActive && <Link className="btn primary" to={`/checkout/payment/${order._id}`}>Complete / Retry Payment</Link>}
        <Link className="btn ghost" to="/products">Continue Shopping</Link>
        <Link className="btn ghost" to="/account/orders">View Orders</Link>
      </div>
    </section>
  )
}
