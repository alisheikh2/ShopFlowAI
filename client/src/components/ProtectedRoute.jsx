import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireRole({ role }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <section className="container page-section"><div className="detail-skeleton skeleton" /></section>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/products'} replace />
  }
  return <Outlet />
}
