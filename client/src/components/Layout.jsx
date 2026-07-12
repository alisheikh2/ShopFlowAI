import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ChevronDown,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react'
import logo from '../assets/shopflowai-logo.png'
import AnimatedBackground from './AnimatedBackground'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'

const getNavItems = (role) => [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  ...(role === 'admin' ? [] : [{ to: '/account/orders', label: 'My Orders' }]),
]

function Header() {
  const { isAuthenticated, isCustomer, logout, user } = useAuth()
  const navigate = useNavigate()
  const { cart } = useCart()
  const { showToast } = useToast()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const confirmLogout = async () => {
    await logout()
    showToast('You have been logged out successfully.', 'info')
    setIsProfileOpen(false)
    setShowLogoutConfirm(false)
    navigate('/')
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="ShopFlowAI home">
        <img src={logo} alt="ShopFlowAI" />
      </Link>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {getNavItems(user?.role).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
        {user?.role === 'admin' && <NavLink to="/admin/dashboard">Admin</NavLink>}
      </nav>

      <div className="header-actions">
        {user?.role !== 'admin' && (
          <>
            <Link className="icon-btn useful-action" to="/wishlist" aria-label="Wishlist" title="Wishlist">
              <Heart size={19} />
            </Link>
            <Link className="cart-action" to="/cart" aria-label="Cart">
              <ShoppingBag size={19} />
              <span>Cart</span>
              {cart.totalItems > 0 && <strong>{cart.totalItems}</strong>}
            </Link>
          </>
        )}
        {isAuthenticated ? (
          <div className="profile-menu">
            <button className="profile-trigger" onClick={() => setIsProfileOpen((current) => !current)} aria-label="Profile menu">
              <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              <div>
                <small>Welcome</small>
                <strong>{user?.name || 'Account'}</strong>
              </div>
              <ChevronDown size={16} />
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                {isCustomer && <Link to="/account/orders" onClick={() => setIsProfileOpen(false)}>My Orders</Link>}
                {isCustomer && <Link to="/wishlist" onClick={() => setIsProfileOpen(false)}>Wishlist</Link>}
                {user?.role === 'admin' && <Link to="/admin/dashboard" onClick={() => setIsProfileOpen(false)}>Admin Dashboard</Link>}
                <button onClick={() => setShowLogoutConfirm(true)}><LogOut size={16} /> Logout</button>
              </div>
            )}
            {showLogoutConfirm && (
              <div className="logout-confirm-backdrop" role="presentation" onClick={() => setShowLogoutConfirm(false)}>
                <div className="logout-confirm-card" role="dialog" aria-modal="true" aria-label="Confirm logout" onClick={(event) => event.stopPropagation()}>
                  <div className="logout-confirm-icon"><LogOut size={22} /></div>
                  <h3>Logout from ShopFlowAI?</h3>
                  <p>Your cart and wishlist will stay saved, but you will need to sign in again to manage orders.</p>
                  <div className="logout-confirm-actions">
                    <button className="btn ghost" onClick={() => setShowLogoutConfirm(false)}>Stay Logged In</button>
                    <button className="btn primary" onClick={confirmLogout}>Yes, Logout</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link className="profile-trigger login-trigger" to="/login" aria-label="Login or Sign up">
            <span><UserRound size={18} /></span>
            <div>
              <small>Login</small>
              <strong>SignUp</strong>
            </div>
          </Link>
        )}
        <button
          className="icon-btn mobile-menu"
          aria-label="Menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-header-menu"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <Menu size={20} />
        </button>
      </div>

      {isMobileMenuOpen && (
        <nav id="mobile-header-menu" className="mobile-header-menu" aria-label="Responsive navigation">
          {getNavItems(user?.role).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setIsMobileMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Admin Dashboard</NavLink>
          )}
          {!isAuthenticated && <NavLink to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</NavLink>}
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer premium-footer">
      <div className="footer-orb orb-one" />
      <div className="footer-orb orb-two" />
      <div className="footer-brand-block">
        <img src={logo} alt="ShopFlowAI" />
        <p>
          A premium AI-powered ecommerce experience for smarter product discovery,
          secure checkout, order updates, and professional invoices.
        </p>

      </div>

      <div className="footer-column">
        <h3>Store</h3>
        <Link to="/products">Products</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/account/orders">My Orders</Link>
      </div>

      <div className="footer-column">
        <h3>Features</h3>
        <Link to="/login">Customer Login</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/account/orders">Order Tracking</Link>
        <Link to="/cart">Shopping Cart</Link>
        <span className="footer-mini"><Sparkles size={14} /> Smart Shopping. Smarter Business.</span>
      </div>

      <div className="footer-contact-card">
        <h3>Support</h3>
        <span><Mail size={16} /> shopflowai.dev@gmail.com</span>
        <span><Phone size={16} /> +923346956216</span>
        <span><MapPin size={16} /> Okara, Punjab, Pakistan</span>
      </div>
    </footer>
  )
}

function MobileBottomNav() {
  const { cart } = useCart()
  const { user } = useAuth()
  if (user?.role === 'admin') {
    return (
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/categories">Categories</NavLink>
        <NavLink to="/admin/dashboard">Admin</NavLink>
      </nav>
    )
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/products">Shop</NavLink>
      <NavLink to="/cart">Cart {cart.totalItems > 0 ? `(${cart.totalItems})` : ''}</NavLink>
      <NavLink to="/account/orders">Orders</NavLink>
    </nav>
  )
}

export default function Layout() {
  return (
    <div className="app-shell">
      <AnimatedBackground />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
