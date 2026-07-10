import { Elements } from '@stripe/react-stripe-js'
import { CreditCard, Truck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StripeCheckoutForm from '../components/StripeCheckoutForm'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { stripePromise } from '../services/stripe'
import { formatCurrency } from '../utils/format'

const initialAddress = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Pakistan',
}

export default function Checkout() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { cart, fetchCart } = useCart()
  const [shippingAddress, setShippingAddress] = useState(initialAddress)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [createdOrder, setCreatedOrder] = useState(null)
  const [clientSecret, setClientSecret] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [message, setMessage] = useState('')

  const setField = (field, value) => {
    setShippingAddress((current) => ({ ...current, [field]: value }))
  }

  const createOrder = async () => {
    const response = await api.post('/orders', {
      shippingAddress,
      billingAddress: shippingAddress,
      deliveryMethod: 'Standard Delivery - 3 to 5 business days',
      paymentMethod,
    })
    return response.data?.order
  }

  const placeOrder = async () => {
    try {
      setIsPlacing(true)
      setMessage('')
      setClientSecret('')
      const order = await createOrder()
      setCreatedOrder(order)

      if (paymentMethod === 'stripe') {
        const intent = await api.post('/payments/create-intent', { orderId: order._id })
        setClientSecret(intent.data?.clientSecret)
        showToast('Order created. Complete card payment securely.', 'info')
        return
      }

      await fetchCart()
      showToast('Order placed successfully. Invoice email is on the way.', 'success')
      navigate(`/order-success/${order?._id || 'created'}`)
    } catch (error) {
      const friendly = error.message || 'Failed to place order'
      setMessage(friendly)
      showToast(friendly, 'error')
    } finally {
      setIsPlacing(false)
    }
  }


  const waitForOrderProcessing = async (orderId) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const response = await api.get(`/orders/${orderId}`)
        const latestOrder = response.data?.order
        if (latestOrder?.paymentStatus === 'paid' || latestOrder?.orderStatus === 'processing') {
          return latestOrder
        }
      } catch {
        // Keep polling quietly; order success page can still load later.
      }
      await new Promise((resolve) => setTimeout(resolve, 900))
    }
    return null
  }

  const handleStripePaid = async () => {
    await fetchCart()
    showToast('Payment successful. Syncing order status...', 'success')
    if (createdOrder?._id) {
      const syncedOrder = await waitForOrderProcessing(createdOrder._id)
      if (!syncedOrder) {
        showToast('Stripe confirmed the payment. If the order still shows pending, check your Stripe webhook listener.', 'info')
      }
    }
    navigate(`/order-success/${createdOrder?._id || 'created'}`)
  }

  return (
    <section className="container page-section">
      <p className="eyebrow gradient-text">Checkout</p>
      <h1>Complete your order</h1>
      <div className="checkout-grid">
        <div className="form-stack">
          <div className="form-card">
            <h2>Shipping address</h2>
            <div className="form-grid">
              <input placeholder="Full name" value={shippingAddress.fullName} onChange={(event) => setField('fullName', event.target.value)} />
              <input placeholder="Phone" value={shippingAddress.phone} onChange={(event) => setField('phone', event.target.value)} />
              <input className="span-2" placeholder="Address" value={shippingAddress.address} onChange={(event) => setField('address', event.target.value)} />
              <input placeholder="City" value={shippingAddress.city} onChange={(event) => setField('city', event.target.value)} />
              <input placeholder="Postal code" value={shippingAddress.postalCode} onChange={(event) => setField('postalCode', event.target.value)} />
              <input className="span-2" placeholder="Country" value={shippingAddress.country} onChange={(event) => setField('country', event.target.value)} />
            </div>
          </div>
          <div className="form-card">
            <h2>Payment method</h2>
            <label className="option-card"><input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => { setPaymentMethod('cod'); setClientSecret('') }} /> <Truck size={18} /> Cash on Delivery</label>
            <label className="option-card"><input type="radio" name="payment" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} /> <CreditCard size={18} /> Credit/Debit Card (Stripe)</label>
          </div>
          {paymentMethod === 'stripe' && clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeCheckoutForm clientSecret={clientSecret} onPaid={handleStripePaid} />
            </Elements>
          )}
          {paymentMethod === 'stripe' && clientSecret && !stripePromise && (
            <p className="form-error">Stripe publishable key is missing. Add VITE_STRIPE_PUBLISHABLE_KEY in client/.env.</p>
          )}
        </div>
        <aside className="summary-card sticky-summary">
          <h2>Checkout summary</h2>
          <div><span>Items</span><strong>{cart.totalItems}</strong></div>
          <div><span>Delivery</span><strong>Standard</strong></div>
          <div className="summary-total"><span>Total</span><strong>{formatCurrency(cart.subtotal)}</strong></div>
          <button className="btn primary full" disabled={isPlacing || cart.items.length === 0 || Boolean(clientSecret)} onClick={placeOrder}>
            {isPlacing ? 'Placing...' : paymentMethod === 'stripe' ? 'Create Order & Continue to Card' : 'Place Order'}
          </button>
          {message && <p className="form-error">{message}</p>}
          <p className="hint">Review your details carefully. A professional invoice will be emailed after your order is placed.</p>
        </aside>
      </div>
    </section>
  )
}
