import { Elements } from '@stripe/react-stripe-js'
import { CreditCard, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import StripeCheckoutForm from '../components/StripeCheckoutForm'
import { ErrorState } from '../components/LoadingState'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { stripePromise } from '../services/stripe'
import { formatCurrency } from '../utils/format'

export default function PaymentRetry() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { fetchCart } = useCart()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [clientSecret, setClientSecret] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState('')

  const loadOrder = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get(`/orders/${orderId}`)
      const nextOrder = response.data?.order
      setOrder(nextOrder)
      if (nextOrder?.paymentMethod !== 'stripe') {
        setError('This order does not use Stripe card payment.')
      } else if (['paid', 'refunded'].includes(nextOrder?.paymentStatus)) {
        navigate(`/order-success/${orderId}`, { replace: true })
      } else if (nextOrder?.orderStatus === 'cancelled' || nextOrder?.inventoryStatus === 'released') {
        setError('This payment reservation has expired or was cancelled. Please place a new order.')
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load this order.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    api.get(`/orders/${orderId}`)
      .then((response) => {
        if (!active) return
        const nextOrder = response.data?.order
        setOrder(nextOrder)
        if (nextOrder?.paymentMethod !== 'stripe') {
          setError('This order does not use Stripe card payment.')
        } else if (['paid', 'refunded'].includes(nextOrder?.paymentStatus)) {
          navigate(`/order-success/${orderId}`, { replace: true })
        } else if (nextOrder?.orderStatus === 'cancelled' || nextOrder?.inventoryStatus === 'released') {
          setError('This payment reservation has expired or was cancelled. Please place a new order.')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load this order.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [navigate, orderId])

  const preparePayment = async () => {
    if (!stripePromise) {
      setError('Stripe publishable key is missing. Please contact support.')
      return
    }

    try {
      setIsPreparing(true)
      setError('')
      const response = await api.post('/payments/create-intent', { orderId })
      const payment = response.data
      if (payment?.status === 'succeeded') {
        navigate(`/order-success/${orderId}`, { replace: true })
        return
      }
      setClientSecret(payment?.clientSecret || '')
    } catch (requestError) {
      setClientSecret('')
      setError(requestError.message || 'Unable to prepare card payment.')
    } finally {
      setIsPreparing(false)
    }
  }

  const paid = async () => {
    showToast('Payment confirmed. Waiting for secure order processing…', 'success')
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const response = await api.get(`/orders/${orderId}`)
        if (response.data?.order?.paymentStatus === 'paid') break
      } catch {
        // The status page continues reconciliation if this short poll fails.
      }
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    await fetchCart()
    navigate(`/order-success/${orderId}?payment_redirect=1`)
  }

  if (isLoading) {
    return <section className="container page-section"><div className="detail-skeleton skeleton" /></section>
  }

  return (
    <section className="container page-section">
      <p className="eyebrow gradient-text">Secure payment</p>
      <h1>Complete card payment</h1>
      {error && <ErrorState title="Payment unavailable" message={error} onRetry={loadOrder} />}
      {order && !error && (
        <div className="checkout-grid">
          <div className="form-stack">
            <div className="form-card">
              <div className="stripe-card-title"><CreditCard size={18} /> Order {order.invoiceNumber || order._id}</div>
              <p>Your inventory is reserved until {order.paymentExpiresAt ? new Date(order.paymentExpiresAt).toLocaleString('en-PK') : 'the payment deadline'}.</p>
              {!clientSecret && (
                <button className="btn primary full" onClick={preparePayment} disabled={isPreparing}>
                  <RefreshCw size={17} /> {isPreparing ? 'Preparing secure payment…' : 'Continue to Card Payment'}
                </button>
              )}
            </div>
            {clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCheckoutForm clientSecret={clientSecret} orderId={orderId} onPaid={paid} />
              </Elements>
            )}
          </div>
          <aside className="summary-card sticky-summary">
            <h2>Payment summary</h2>
            <div><span>Items</span><strong>{order.items?.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
            <div><span>Status</span><strong>{order.paymentStatus}</strong></div>
            <div className="summary-total"><span>Total</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
            <Link className="btn ghost full" to="/account/orders">Back to Orders</Link>
          </aside>
        </div>
      )}
    </section>
  )
}
