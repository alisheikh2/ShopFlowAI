import { AlertCircle, CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

function Message({ type = 'error', children }) {
  if (!children) return null
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle
  return <div className={`auth-message ${type}`}><Icon size={18} /><span>{children}</span></div>
}

function RecoveryShell({ eyebrow, title, subtitle, children }) {
  return (
    <section className="auth-page enhanced-auth">
      <div className="auth-visual auth-visual-3d">
        <div className="auth-orbit orbit-a" />
        <div className="auth-orbit orbit-b" />
        <div className="shopping-bag-3d small"><div className="bag-handle" /><div className="bag-body"><span>S</span></div></div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="auth-card enhanced-card">
        <p className="eyebrow gradient-text">{eyebrow}</p>
        {children}
      </div>
    </section>
  )
}

function PasswordField({ placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minLength="8"
        autoComplete="new-password"
        required
      />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function VerifyEmail() {
  const { token } = useParams()
  const started = useRef(false)
  const [state, setState] = useState({ loading: true, type: 'success', message: '' })

  useEffect(() => {
    if (started.current) return
    started.current = true

    const verify = async () => {
      try {
        const response = await api.get(`/users/verify-email/${encodeURIComponent(token)}`)
        setState({ loading: false, type: 'success', message: response.message || 'Email verified successfully.' })
      } catch (error) {
        setState({ loading: false, type: 'error', message: error.message || 'This verification link is invalid or expired.' })
      }
    }
    verify()
  }, [token])

  return (
    <RecoveryShell eyebrow="Email verification" title="Activate your account" subtitle="Securely verify your ShopFlowAI email address.">
      <h2>{state.loading ? 'Verifying your email…' : state.type === 'success' ? 'Email verified' : 'Verification failed'}</h2>
      {state.loading && <div className="table-card order-table-skeleton skeleton" />}
      <Message type={state.type}>{state.message}</Message>
      {!state.loading && state.type === 'success' && <Link className="btn primary full" to="/login">Continue to Login</Link>}
      {!state.loading && state.type === 'error' && <Link className="btn ghost full" to="/resend-verification">Request a New Link</Link>}
    </RecoveryShell>
  )
}

export function ResetPassword() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('error')
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setType('error')
      setMessage('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      setMessage('')
      const response = await api.post(`/users/reset-password/${encodeURIComponent(token)}`, { password })
      setType('success')
      setMessage(response.message || 'Password reset successfully.')
      setCompleted(true)
    } catch (error) {
      setType('error')
      setMessage(error.message || 'Unable to reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RecoveryShell eyebrow="Password recovery" title="Create a new password" subtitle="Choose a strong password to secure your account.">
      <h2>Reset password</h2>
      {!completed && (
        <form className="form-stack" onSubmit={submit}>
          <PasswordField placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <PasswordField placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          <p className="hint">Use 8+ characters with uppercase, lowercase, number, and special character.</p>
          <button className="btn primary full" disabled={submitting}>{submitting ? 'Resetting…' : 'Reset Password'}</button>
        </form>
      )}
      <Message type={type}>{message}</Message>
      {completed && <Link className="btn primary full" to="/login">Login with New Password</Link>}
    </RecoveryShell>
  )
}

export function ResendVerification() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setMessage('')
      const response = await api.post('/users/resend-verification', { email })
      setType('success')
      setMessage(response.message)
    } catch (error) {
      setType('error')
      setMessage(error.message || 'Unable to send a new verification link.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RecoveryShell eyebrow="Email verification" title="Request a new link" subtitle="We will send a fresh verification link if your account still needs one.">
      <h2>Resend verification</h2>
      <form className="form-stack" onSubmit={submit}>
        <label className="input-with-icon">
          <Mail size={18} />
          <input type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <button className="btn primary full" disabled={submitting}>{submitting ? 'Sending…' : 'Send Verification Link'}</button>
      </form>
      <Message type={type}>{message}</Message>
      <Link className="text-link centered" to="/login">Back to Login</Link>
    </RecoveryShell>
  )
}
