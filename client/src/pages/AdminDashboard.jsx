/* eslint-disable react-hooks/set-state-in-effect */
import {
  AlertCircle,
  BarChart3,
  Box,
  CreditCard,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import { EmptyState, ErrorState } from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { formatCurrency } from '../utils/format'

const metricIcons = {
  totalRevenue: BarChart3,
  paidOrders: ShoppingCart,
  totalOrders: Box,
  totalUsers: Users,
  totalProducts: Package,
  avgOrderValue: CreditCard,
}

const metricConfig = [
  { key: 'totalRevenue', label: 'Total Revenue', format: formatCurrency, tone: 'blue' },
  { key: 'paidOrders', label: 'Paid Orders', tone: 'purple' },
  { key: 'totalOrders', label: 'Total Orders', tone: 'cyan' },
  { key: 'totalUsers', label: 'Customers', tone: 'navy' },
  { key: 'totalProducts', label: 'Products', tone: 'blue' },
  { key: 'avgOrderValue', label: 'Avg. Order Value', format: formatCurrency, tone: 'purple' },
]

const formatNumber = (value) => Number(value || 0).toLocaleString('en-PK')

function RevenueLineChart({ data = [] }) {
  const chartData = data.slice(-14)
  const width = 720
  const height = 260
  const padding = 28
  const maxRevenue = Math.max(...chartData.map((item) => item.revenue || 0), 1)
  const points = chartData.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(chartData.length - 1, 1)
    const y = height - padding - ((item.revenue || 0) / maxRevenue) * (height - padding * 2)
    return { ...item, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${path} L ${points.at(-1)?.x || padding} ${height - padding} L ${points[0]?.x || padding} ${height - padding} Z`

  if (chartData.length === 0) {
    return <div className="chart-empty">No revenue data yet</div>
  }

  return (
    <div className="revenue-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="revenue-chart" role="img" aria-label="Revenue chart">
        <defs>
          <linearGradient id="revenueStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#0F67F5" />
            <stop offset="100%" stopColor="#6D28E9" />
          </linearGradient>
          <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0F67F5" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#6D28E9" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={padding + line * ((height - padding * 2) / 3)}
            y2={padding + line * ((height - padding * 2) / 3)}
            stroke="#DDE7FF"
            strokeDasharray="8 8"
          />
        ))}
        <path d={areaPath} fill="url(#revenueArea)" />
        <path d={path} fill="none" stroke="url(#revenueStroke)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#0F67F5" strokeWidth="3" />
        ))}
      </svg>
      <div className="chart-caption">
        <span>Last {chartData.length} days</span>
        <strong>{formatCurrency(chartData.reduce((sum, item) => sum + (item.revenue || 0), 0))}</strong>
      </div>
    </div>
  )
}

function TopProducts({ products = [] }) {
  const max = Math.max(...products.map((item) => item.totalQuantitySold || 0), 1)

  if (products.length === 0) {
    return <div className="chart-empty">No paid product sales yet</div>
  }

  return (
    <div className="top-products-list">
      {products.slice(0, 6).map((product, index) => (
        <div className="top-product-row" key={product._id || product.name} style={{ '--delay': `${index * 80}ms` }}>
          <div>
            <strong>{product.name}</strong>
            <span>{product.totalQuantitySold} sold · {formatCurrency(product.totalRevenue)}</span>
          </div>
          <div className="bar-track">
            <span style={{ width: `${((product.totalQuantitySold || 0) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CompactBreakdown({ title, data = [], labelKey = '_id', valueKey = 'totalRevenue' }) {
  const max = Math.max(...data.map((item) => item[valueKey] || 0), 1)

  if (data.length === 0) {
    return <div className="chart-empty">No data available yet</div>
  }

  return (
    <div className="breakdown-card">
      <h3>{title}</h3>
      {data.slice(0, 5).map((item, index) => (
        <div className="breakdown-row" key={`${item[labelKey]}-${index}`}>
          <span>{item[labelKey]}</span>
          <div className="bar-track tiny"><span style={{ width: `${((item[valueKey] || 0) / max) * 100}%` }} /></div>
          <strong>{valueKey.toLowerCase().includes('revenue') ? formatCurrency(item[valueKey]) : item[valueKey]}</strong>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { isAdmin, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [summary, setSummary] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const metrics = useMemo(() => {
    if (!summary) return []
    return metricConfig.map((metric) => {
      const value = summary[metric.key]
      const Icon = metricIcons[metric.key]
      return {
        ...metric,
        Icon,
        value: metric.format ? metric.format(value) : formatNumber(value),
      }
    })
  }, [summary])

  const loadDashboard = async () => {
    if (!isAuthenticated || !isAdmin) return

    try {
      setIsLoading(true)
      setError('')
      const [summaryRes, topRes, revenueRes, categoryRes, paymentRes] = await Promise.all([
        api.get('/analytics/summary', { query: { days: 30 } }),
        api.get('/analytics/top-products', { query: { limit: 6 } }),
        api.get('/analytics/revenue-chart', { query: { days: 30 } }),
        api.get('/analytics/category-breakdown'),
        api.get('/analytics/payment-methods'),
      ])

      setSummary(summaryRes.data || null)
      setTopProducts(topRes.data?.products || [])
      setRevenueData(revenueRes.data?.data || [])
      setCategoryData(categoryRes.data?.categories || [])
      setPaymentMethods(paymentRes.data?.methods || [])
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading) {
      loadDashboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated, isAdmin])

  return (
    <AdminShell>
        <div className="admin-title-row">
          <div>
            <p className="eyebrow gradient-text">Admin Analytics</p>
            <h1 className="page-title">Admin dashboard</h1>
            <p>Monitor revenue, paid orders, products, and payment trends in real time.</p>
          </div>
          <div className="live-pill"><Sparkles size={16} /> Live MongoDB data</div>
        </div>

        {isAuthLoading && <div className="table-card order-table-skeleton skeleton" />}
        {!isAuthLoading && !isAuthenticated && (
          <EmptyState
            title="Admin login required"
            description="Please sign in with an admin account to view business analytics."
            action={<Link className="btn primary" to="/login">Login as Admin</Link>}
          />
        )}
        {!isAuthLoading && isAuthenticated && !isAdmin && (
          <EmptyState
            title="Admin access only"
            description="This dashboard is restricted to ShopFlowAI admins."
            action={<Link className="btn ghost" to="/products">Back to Store</Link>}
          />
        )}
        {isAuthenticated && isAdmin && isLoading && <div className="table-card order-table-skeleton skeleton" />}
        {isAuthenticated && isAdmin && !isLoading && error && (
          <ErrorState title="Unable to load dashboard" message={error} onRetry={loadDashboard} />
        )}
        {isAuthenticated && isAdmin && !isLoading && !error && (
          <>
            <div className="metric-grid premium-metrics">
              {metrics.map((metric, index) => {
                const Icon = metric.Icon
                return (
                  <div className={`metric-card ${metric.tone}`} key={metric.key} style={{ '--delay': `${index * 70}ms` }}>
                    <div className="metric-glow" />
                    <Icon size={24} />
                    <p>{metric.label}</p>
                    <strong>{metric.value}</strong>
                    <span><TrendingUp size={14} /> {metric.key === 'totalRevenue' ? 'Revenue snapshot' : 'Current total'}</span>
                  </div>
                )
              })}
            </div>

            <div className="chart-grid premium-chart-grid">
              <div className="chart-card large-chart-card">
                <div className="chart-card-header">
                  <div>
                    <p className="eyebrow gradient-text">Revenue</p>
                    <h2>Revenue trend</h2>
                  </div>
                  <span>30 days</span>
                </div>
                <RevenueLineChart data={revenueData} />
              </div>
              <div className="chart-card top-products-card">
                <div className="chart-card-header">
                  <div>
                    <p className="eyebrow gradient-text">Products</p>
                    <h2>Top products</h2>
                  </div>
                </div>
                <TopProducts products={topProducts} />
              </div>
            </div>

            <div className="admin-breakdown-grid">
              <CompactBreakdown title="Category performance" data={categoryData} />
              <CompactBreakdown title="Payment methods" data={paymentMethods} labelKey="_id" valueKey="totalOrders" />
              <div className="breakdown-card status-card-3d">
                <AlertCircle size={22} />
                <h3>Order status mix</h3>
                <div className="status-mix-grid">
                  {Object.entries(summary?.ordersByStatus || {}).map(([status, count]) => (
                    <div key={status}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
    </AdminShell>
  )
}
