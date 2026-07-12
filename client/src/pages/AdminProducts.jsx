/* eslint-disable react-hooks/set-state-in-effect */
import { Edit, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminDeleteDialog from '../components/AdminDeleteDialog'
import AdminShell from '../components/AdminShell'
import { EmptyState, ErrorState } from '../components/LoadingState'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { formatCurrency } from '../utils/format'
import { getProductImageUrl } from '../utils/product'

export default function AdminProducts() {
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [productPendingDelete, setProductPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/products/admin/all', { query: { limit: 100 } })
      setProducts(response.data?.products || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const deleteProduct = async () => {
    if (!productPendingDelete) return

    try {
      setIsDeleting(true)
      await api.delete(`/products/${productPendingDelete.slug}`)
      showToast(`${productPendingDelete.name} was deleted successfully.`, 'success')
      setProductPendingDelete(null)
      await loadProducts()
    } catch (requestError) {
      showToast(requestError.message || 'Could not delete this product.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminShell>
      <div className="admin-title-row">
        <div>
          <p className="eyebrow gradient-text">Inventory</p>
          <h1 className="page-title">Products</h1>
          <p>Manage product catalog, stock, pricing, SKU, publishing, and featured status.</p>
        </div>
        <Link className="btn primary" to="/admin/products/new"><Plus size={18} /> Add Product</Link>
      </div>

      {isLoading && <div className="table-card order-table-skeleton skeleton" />}
      {!isLoading && error && <ErrorState title="Unable to load products" message={error} onRetry={loadProducts} />}
      {!isLoading && !error && products.length === 0 && <EmptyState title="No products found" description="Create your first product to start selling." />}
      {!isLoading && !error && products.length > 0 && (
        <div className="admin-table-card">
          <div className="admin-table-head product-admin-row">
            <span>Product</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span>
          </div>
          {products.map((product) => {
            const image = getProductImageUrl(product)
            return (
              <div className="product-admin-row" key={product._id}>
                <div className="admin-product-cell">
                  <div className="admin-product-image">{image ? <img src={image} alt={product.name} /> : '🛍️'}</div>
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.sku || product.slug}</p>
                  </div>
                </div>
                <strong>{formatCurrency(product.discountPrice > 0 ? product.discountPrice : product.price)}</strong>
                <StatusBadge tone={product.stock <= 5 ? 'orange' : 'green'}>{product.stock} left</StatusBadge>
                <StatusBadge tone={product.isPublished ? 'green' : 'orange'}>{product.isPublished ? 'Published' : 'Draft'}</StatusBadge>
                <div className="row-actions">
                  <Link className="icon-btn" to={`/admin/products/${product.slug}/edit`}><Edit size={17} /></Link>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title={`Delete ${product.name}`}
                    onClick={() => setProductPendingDelete(product)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AdminDeleteDialog
        isOpen={Boolean(productPendingDelete)}
        itemName={productPendingDelete?.name}
        itemType="product"
        description="Its catalog listing, wishlist references, reviews, and stored product images will be removed. This cannot be undone."
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setProductPendingDelete(null)}
        onConfirm={deleteProduct}
      />
    </AdminShell>
  )
}
