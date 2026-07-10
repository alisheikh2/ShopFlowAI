import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const friendlyAuthError = (message = '') => {
  const lower = message.toLowerCase()
  if (lower.includes('verify')) {
    return 'Please verify your email address before signing in.'
  }
  if (lower.includes('invalid email or password')) {
    return 'The email or password you entered is incorrect. Please check your details and try again.'
  }
  // Preserve validation details such as password complexity and invalid links.
  return message || 'We could not complete this request right now. Please try again.'
}

function AuthMessage({ type = 'error', children }) {
  if (!children) return null
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={`auth-message ${type}`}>
      <Icon size={18} />
      <span>{children}</span>
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder = 'Password' }) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div className="password-field">
      <input
        placeholder={placeholder}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword((current) => !current)}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function Login() {
  return <AuthCard type="login" />
}

export function Register() {
  return <AuthCard type="register" />
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      const response = await api.post('/users/forgot-password', { email })
      setMessageType('success')
      setMessage(response.message)
    } catch (error) {
      setMessageType('error')
      setMessage(friendlyAuthError(error.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-page enhanced-auth">
      <div className="auth-visual auth-visual-3d">
        <div className="auth-orbit orbit-a" />
        <div className="auth-orbit orbit-b" />
        <div className="shopping-bag-3d small"><div className="bag-handle" /><div className="bag-body"><span>S</span></div></div>
        <h1>Reset access</h1>
        <p>We will send a secure branded reset link to your email.</p>
      </div>
      <form className="auth-card enhanced-card" onSubmit={submit}>
        <p className="eyebrow gradient-text">Forgot password</p>
        <h2>Get reset link</h2>
        <label className="input-with-icon">
          <Mail size={18} />
          <input placeholder="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <button className="btn primary full" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send Reset Link'}</button>
        <AuthMessage type={messageType}>{message}</AuthMessage>
      </form>
    </section>
  )
}

function AuthCard({ type }) {
  const isRegister = type === 'register'
  const navigate = useNavigate()
  const { googleLogin, login, register } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setMessage('')
      if (isRegister) {
        const response = await register(form)
        setMessageType('success')
        const successMessage = response.message || 'Registration successful. Please verify your email.'
        setMessage(successMessage)
        showToast(successMessage, 'success')
        return
      }

      await login({ email: form.email, password: form.password })
      showToast('Welcome back to ShopFlowAI', 'success')
      navigate('/products')
    } catch (error) {
      setMessageType('error')
      const friendly = friendlyAuthError(error.message)
      setMessage(friendly)
      showToast(friendly, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setMessage('')
      await googleLogin()
      showToast(isRegister ? 'Google sign up successful' : 'Signed in with Google', 'success')
      navigate('/products')
    } catch (error) {
      const friendly = friendlyAuthError(error.message)
      setMessageType('error')
      setMessage(friendly)
      showToast(friendly, 'error')
    }
  }

  return (
    <section className="auth-page enhanced-auth">
      <div className="auth-visual auth-visual-3d">
        <div className="auth-orbit orbit-a" />
        <div className="auth-orbit orbit-b" />
        <div className="shopping-bag-3d small"><div className="bag-handle" /><div className="bag-body"><span>S</span></div></div>
        <h1>{isRegister ? 'Join ShopFlowAI' : 'Welcome back'}</h1>
        <p>Smart Shopping. Smarter Business.</p>
      </div>
      <form className="auth-card enhanced-card" onSubmit={submit}>
        <p className="eyebrow gradient-text">{isRegister ? 'Create account' : 'Login'}</p>
        <h2>{isRegister ? 'Start shopping smarter' : 'Access your account'}</h2>
        {isRegister && <input placeholder="Full name" value={form.name} onChange={(event) => update('name', event.target.value)} required />}
        <label className="input-with-icon">
          <Mail size={18} />
          <input placeholder="Email address" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
        </label>
        <label className="input-with-icon password-icon-row">
          <LockKeyhole size={18} />
          <PasswordInput value={form.password} onChange={(event) => update('password', event.target.value)} />
        </label>
        <button className="btn primary full" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
        </button>
        <div className="auth-divider"><span>or continue with</span></div>
        <button type="button" className="google-auth-btn" onClick={handleGoogleLogin}>
          <span className="google-mark">G</span>
          {isRegister ? 'Sign up with Google' : 'Sign in with Google'}
        </button>
        <AuthMessage type={messageType}>{message}</AuthMessage>
        {isRegister && messageType === 'success' && (
          <Link className="text-link centered" to="/resend-verification">Didn't receive the verification email?</Link>
        )}
        <div className="auth-switch">
          <span>{isRegister ? 'Already part of ShopFlowAI?' : 'New to ShopFlowAI?'}</span>
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Login to your account' : 'Create your account'}
          </Link>
        </div>
        {!isRegister && <Link className="text-link centered" to="/forgot-password">Forgot password?</Link>}
      </form>
    </section>
  )
}
