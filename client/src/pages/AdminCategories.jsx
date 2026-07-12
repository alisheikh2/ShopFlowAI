/* eslint-disable react-hooks/set-state-in-effect */
import { Edit, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminDeleteDialog from '../components/AdminDeleteDialog'
import AdminShell from '../components/AdminShell'
import { EmptyState, ErrorState } from '../components/LoadingState'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

const initialCategory = { name: '', description: '', isFeatured: false, isActive: true }

export default function AdminCategories() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialCategory)
  const [editingSlug, setEditingSlug] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryPendingDelete, setCategoryPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/categories/admin/all', { query: { limit: 100 } })
      setCategories(response.data?.categories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const edit = (category) => {
    setEditingSlug(category.slug)
    setForm({
      name: category.name || '',
      description: category.description || '',
      isFeatured: Boolean(category.isFeatured),
      isActive: category.isActive !== false,
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    const description = form.description.trim()

    if (description.length < 10) {
      showToast('Please add a meaningful category description of at least 10 characters.', 'error')
      return
    }

    try {
      const payload = { ...form, name: form.name.trim(), description }
      if (editingSlug) {
        await api.put(`/categories/${editingSlug}`, payload)
        showToast('Category updated successfully.', 'success')
      } else {
        await api.post('/categories', payload)
        showToast('Category created successfully.', 'success')
      }
      setForm(initialCategory)
      setEditingSlug('')
      await loadCategories()
    } catch (requestError) {
      showToast(requestError.message || 'Could not save this category.', 'error')
    }
  }

  const remove = async () => {
    if (!categoryPendingDelete) return

    try {
      setIsDeleting(true)
      await api.delete(`/categories/${categoryPendingDelete.slug}`)
      showToast(`${categoryPendingDelete.name} was deleted successfully.`, 'success')
      setCategoryPendingDelete(null)
      await loadCategories()
    } catch (requestError) {
      showToast(requestError.message || 'Could not delete this category.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminShell>
      <div className="admin-title-row">
        <div>
          <p className="eyebrow gradient-text">Catalog</p>
          <h1 className="page-title">Categories</h1>
          <p>Create, update, feature, or deactivate product categories.</p>
        </div>
      </div>

      <form className="admin-form-card compact-form" onSubmit={submit}>
        <div className="form-grid">
          <input className="span-2" placeholder="Category name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          <label className="admin-field-label span-2">
            <span>Category description <strong>Required</strong></span>
            <textarea
              placeholder="Describe what customers will find in this category"
              rows="4"
              maxLength="500"
              aria-required="true"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
            <small>Use at least 10 characters so customers understand this collection.</small>
          </label>
        </div>
        <div className="admin-form-actions">
          <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} /> Featured</label>
          <label><input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} /> Active</label>
          <button className="btn primary"><Plus size={18} /> {editingSlug ? 'Update Category' : 'Add Category'}</button>
          {editingSlug && <button className="btn ghost" type="button" onClick={() => { setEditingSlug(''); setForm(initialCategory) }}>Cancel</button>}
        </div>
      </form>

      {isLoading && <div className="table-card order-table-skeleton skeleton" />}
      {!isLoading && error && <ErrorState title="Unable to load categories" message={error} onRetry={loadCategories} />}
      {!isLoading && !error && categories.length === 0 && <EmptyState title="No categories found" description="Create your first category above." />}
      {!isLoading && !error && categories.length > 0 && (
        <div className="admin-table-card">
          {categories.map((category) => (
            <div className="category-admin-row" key={category._id}>
              <div>
                <strong>{category.name}</strong>
                <p>{category.description || category.slug}</p>
              </div>
              <StatusBadge tone={category.isActive ? 'green' : 'orange'}>{category.isActive ? 'Active' : 'Inactive'}</StatusBadge>
              <StatusBadge tone={category.isFeatured ? 'blue' : 'orange'}>{category.isFeatured ? 'Featured' : 'Standard'}</StatusBadge>
              <div className="row-actions">
                <button type="button" className="icon-btn" title={`Edit ${category.name}`} onClick={() => edit(category)}><Edit size={17} /></button>
                <button
                  type="button"
                  className="icon-btn danger"
                  title={`Delete ${category.name}`}
                  onClick={() => setCategoryPendingDelete(category)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminDeleteDialog
        isOpen={Boolean(categoryPendingDelete)}
        itemName={categoryPendingDelete?.name}
        itemType="category"
        description="The category can only be deleted when no products are assigned to it. This cannot be undone."
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setCategoryPendingDelete(null)}
        onConfirm={remove}
      />
    </AdminShell>
  )
}
