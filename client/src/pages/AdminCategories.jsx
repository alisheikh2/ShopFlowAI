/* eslint-disable react-hooks/set-state-in-effect */
import { Edit, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { EmptyState, ErrorState } from '../components/LoadingState'
import StatusBadge from '../components/StatusBadge'
import api from '../services/api'

const initialCategory = { name: '', description: '', image: '', isFeatured: false, isActive: true }

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialCategory)
  const [editingSlug, setEditingSlug] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/categories', { query: { limit: 100 } })
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
      image: category.image || '',
      isFeatured: Boolean(category.isFeatured),
      isActive: category.isActive !== false,
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    try {
      setMessage('')
      if (editingSlug) {
        await api.put(`/categories/${editingSlug}`, form)
      } else {
        await api.post('/categories', form)
      }
      setForm(initialCategory)
      setEditingSlug('')
      await loadCategories()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const remove = async (slug) => {
    if (!confirm('Delete this category? Products assigned to it must be moved first.')) return
    await api.delete(`/categories/${slug}`)
    await loadCategories()
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
          <input placeholder="Category name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          <input placeholder="Image URL (optional)" value={form.image} onChange={(event) => update('image', event.target.value)} />
          <input className="span-2" placeholder="Description" value={form.description} onChange={(event) => update('description', event.target.value)} />
        </div>
        <div className="admin-form-actions">
          <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} /> Featured</label>
          <label><input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} /> Active</label>
          <button className="btn primary"><Plus size={18} /> {editingSlug ? 'Update Category' : 'Add Category'}</button>
          {editingSlug && <button className="btn ghost" type="button" onClick={() => { setEditingSlug(''); setForm(initialCategory) }}>Cancel</button>}
        </div>
        {message && <p className="form-error">{message}</p>}
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
                <button className="icon-btn" onClick={() => edit(category)}><Edit size={17} /></button>
                <button className="icon-btn danger" onClick={() => remove(category.slug)}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
