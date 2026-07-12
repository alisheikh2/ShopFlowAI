import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireRole } from './components/ProtectedRoute'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetails from './pages/ProductDetails'
import Categories from './pages/Categories'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderSuccess from './pages/OrderSuccess'
import Wishlist from './pages/Wishlist'
import AdminDashboard from './pages/AdminDashboard'
import AdminProducts from './pages/AdminProducts'
import AdminProductForm from './pages/AdminProductForm'
import AdminCategories from './pages/AdminCategories'
import AdminOrders from './pages/AdminOrders'
import AdminUsers from './pages/AdminUsers'
import { ForgotPassword, Login, Register } from './pages/Auth'
import { ResendVerification, ResetPassword, VerifyEmail } from './pages/AuthRecovery'
import PaymentRetry from './pages/PaymentRetry'
import Placeholder from './pages/Placeholder'
import './App.css'
import './mobile.css'
import './mobile-followup.css'
import './mobile-nav-followup.css'
import './mobile-ui-followup.css'
import './catalog-admin.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<ProductDetails />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:slug" element={<Products />} />
          <Route element={<RequireRole role="customer" />}>
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="checkout/payment/:orderId" element={<PaymentRetry />} />
            <Route path="order-success/:orderId" element={<OrderSuccess />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="account/orders" element={<Orders />} />
          </Route>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="verify-email/:token" element={<VerifyEmail />} />
          <Route path="reset-password/:token" element={<ResetPassword />} />
          <Route path="resend-verification" element={<ResendVerification />} />
          <Route element={<RequireRole role="admin" />}>
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/orders" element={<AdminOrders />} />
            <Route path="admin/products" element={<AdminProducts />} />
            <Route path="admin/products/new" element={<AdminProductForm />} />
            <Route path="admin/products/:slug/edit" element={<AdminProductForm />} />
            <Route path="admin/categories" element={<AdminCategories />} />
            <Route path="admin/users" element={<AdminUsers />} />
          </Route>
          <Route path="contact" element={<Placeholder title="Contact us" />} />
          <Route path="privacy-policy" element={<Placeholder title="Privacy Policy" />} />
          <Route path="terms" element={<Placeholder title="Terms & Conditions" />} />
          <Route path="*" element={<Placeholder title="Page not found" description="The page you are looking for does not exist." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
