import { CheckCircle2, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import api from '../services/api'
import { formatCurrency } from '../utils/format'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || orderId === 'created') return
      try {
        const response = await api.get(`/orders/${orderId}`)
        setOrder(response.data?.order)
      } catch (err) {
        setError(err.message)
      }
    }
    loadOrder()
  }, [orderId])

  const downloadInvoice = async () => {
    const blob = await api.get(`/orders/${orderId}/invoice`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ShopFlowAI-Invoice-${order?.invoiceNumber || orderId}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="container page-section placeholder-page">
      <CheckCircle2 size={58} color="var(--success)" />
      <p className="eyebrow gradient-text">Order placed</p>
      <h1>Thank you for shopping</h1>
      <p>Your order has been created successfully. Invoice and email notifications are handled by the backend.</p>
      {error && <p className="form-error">{error}</p>}
      {order && (
        <div className="success-summary glass-card">
          <div><span>Order ID</span><strong>{order.invoiceNumber || order._id}</strong></div>
          <div><span>Total</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
          <div><span>Status</span><StatusBadge tone="blue">{order.orderStatus}</StatusBadge></div>
          <div><span>Payment</span><StatusBadge tone={order.paymentStatus === 'paid' ? 'green' : 'orange'}>{order.paymentStatus}</StatusBadge></div>
        </div>
      )}
      <div className="hero-actions">
        {order && <button className="btn primary" onClick={downloadInvoice}><Download size={18} /> Download Invoice</button>}
        <Link className="btn ghost" to="/products">Continue Shopping</Link>
        <Link className="btn ghost" to="/account/orders">View Orders</Link>
      </div>
    </section>
  )
}
