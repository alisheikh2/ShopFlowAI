import { CardCvcElement, CardExpiryElement, CardNumberElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { CreditCard } from 'lucide-react'
import { useState } from 'react'

const stripeFieldOptions = {
  style: {
    base: {
      fontSize: '15px',
      color: '#020A2F',
      fontWeight: '700',
      '::placeholder': { color: '#94A3B8' },
    },
    invalid: { color: '#EF4444' },
  },
}

function StripeField({ label, children }) {
  return (
    <label className="stripe-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function StripeCheckoutForm({ clientSecret, onPaid }) {
  const stripe = useStripe()
  const elements = useElements()
  const [message, setMessage] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  const pay = async () => {
    if (!stripe || !elements || !clientSecret) return

    try {
      setIsPaying(true)
      setMessage('')
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
        },
        return_url: `${window.location.origin}/order-success/stripe`,
      })

      if (result.error) {
        setMessage(result.error.message)
        return
      }

      if (result.paymentIntent?.status === 'succeeded') {
        onPaid?.(result.paymentIntent)
      } else {
        setMessage(`Payment status: ${result.paymentIntent?.status}`)
      }
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="stripe-card-box">
      <div className="stripe-card-title"><CreditCard size={18} /> Secure card payment</div>
      <div className="stripe-fields-grid">
        <StripeField label="Card number">
          <CardNumberElement options={stripeFieldOptions} />
        </StripeField>
        <StripeField label="Expiry">
          <CardExpiryElement options={stripeFieldOptions} />
        </StripeField>
        <StripeField label="CVC">
          <CardCvcElement options={stripeFieldOptions} />
        </StripeField>
      </div>
      <button className="btn primary full" type="button" onClick={pay} disabled={!stripe || !clientSecret || isPaying}>
        {isPaying ? 'Processing...' : 'Pay Securely'}
      </button>
      {message && <p className="form-error">{message}</p>}
    </div>
  )
}
