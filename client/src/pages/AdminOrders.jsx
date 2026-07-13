/* eslint-disable react-hooks/set-state-in-effect */
import { Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { EmptyState, ErrorState } from '../components/LoadingState'
import StatusBadge from '../components/StatusBadge'
import api from '../services/api'
import { formatCurrency } from '../utils/format'

const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const statusTone = { pending: 'orange', processing: 'blue', shipped: 'blue', delivered: 'green', cancelled: 'orange' }

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/orders', { query: { limit: 100 } })
      setOrders(response.data?.orders || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const updateStatus = async (orderId, orderStatus) => {
    await api.patch(`/orders/${orderId}/status`, { orderStatus })
    await loadOrders()
  }

  const downloadInvoice = async (orderId, invoiceNumber) => {
    const blob = await api.get(`/orders/${orderId}/invoice`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ShopFlowAI-Invoice-${invoiceNumber || orderId}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell>
      <div className="admin-title-row">
        <div>
          <p className="eyebrow gradient-text">Operations</p>
          <h1 className="page-title">Orders</h1>
          <p>Review orders, update fulfillment status, and download customer invoices.</p>
        </div>
        <button className="btn ghost" onClick={loadOrders}><RefreshCw size={18} /> Refresh</button>
      </div>

      {isLoading && <div className="table-card order-table-skeleton skeleton" />}
      {!isLoading && error && <ErrorState title="Unable to load orders" message={error} onRetry={loadOrders} />}
      {!isLoading && !error && orders.length === 0 && <EmptyState title="No orders found" description="Orders will appear here after customers check out." />}
      {!isLoading && !error && orders.length > 0 && (
        <div className="admin-table-card">
          <div className="admin-order-row admin-table-head">
            <span>Order</span><span>Customer</span><span>Total</span><span>Status</span><span>Payment</span><span>Actions</span>
          </div>
          {orders.map((order) => (
            <div className="admin-order-row" key={order._id}>
              <div>
                <strong>{order.invoiceNumber || order._id}</strong>
                <p>{new Date(order.createdAt).toLocaleDateString('en-PK')}</p>
              </div>
              <div>
                <strong>{order.user?.name || 'Customer'}</strong>
                <p>{order.user?.email}</p>
              </div>
              <strong>{formatCurrency(order.totalAmount)}</strong>
              <select value={order.orderStatus} onChange={(event) => updateStatus(order._id, event.target.value)}>
                {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <StatusBadge tone={order.paymentStatus === 'paid' ? 'green' : statusTone[order.paymentStatus] || 'orange'}>{order.paymentStatus}</StatusBadge>
              <div className="row-actions">
                <button className="icon-btn" onClick={() => downloadInvoice(order._id, order.invoiceNumber)} title="Download Invoice"><Download size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
