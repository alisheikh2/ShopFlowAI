import { Sparkles, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import api from '../services/api'

const initialForm = {
  name: '',
  sku: '',
  description: '',
  price: '',
  discountPrice: '',
  stock: '',
  brand: '',
  category: '',
  isFeatured: false,
  isPublished: true,
}

export default function AdminProductForm() {
  const { slug } = useParams()
  const isEdit = Boolean(slug)
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [images, setImages] = useState([])
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [features, setFeatures] = useState('premium design, fast performance, reliable quality')

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category._id === form.category)?.name || 'Technology',
    [categories, form.category],
  )

  useEffect(() => {
    const load = async () => {
      try {
        const categoryResponse = await api.get('/categories/admin/all', { query: { limit: 100 } })
        setCategories(categoryResponse.data?.categories || [])

        if (isEdit) {
          const response = await api.get(`/products/admin/${slug}`)
          const product = response.data?.product
          setForm({
            name: product.name || '',
            sku: product.sku || '',
            description: product.description || '',
            price: product.price || '',
            discountPrice: product.discountPrice || '',
            stock: product.stock || '',
            brand: product.brand || '',
            category: product.category?._id || product.category || '',
            isFeatured: Boolean(product.isFeatured),
            isPublished: Boolean(product.isPublished),
          })
        }
      } catch (error) {
        setMessage(error.message)
      }
    }
    load()
  }, [isEdit, slug])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const buildFormData = () => {
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        payload.append(key, value)
      }
    })
    images.forEach((file) => payload.append('images', file))
    return payload
  }

  const submit = async (event) => {
    event.preventDefault()
    try {
      setIsSaving(true)
      setMessage('')
      const payload = buildFormData()
      if (isEdit) {
        await api.put(`/products/${slug}`, payload)
      } else {
        await api.post('/products', payload)
      }
      navigate('/admin/products')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const generateDescription = async () => {
    try {
      setMessage('Generating AI description...')
      const response = await api.post('/ai/generate-description', {
        name: form.name,
        category: selectedCategoryName,
        brand: form.brand || 'ShopFlowAI',
        price: form.price ? Number(form.price) : undefined,
        features: features.split(',').map((item) => item.trim()).filter(Boolean),
      })
      update('description', response.data?.description || '')
      setMessage('AI description generated successfully.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <AdminShell>
      <div className="admin-title-row">
        <div>
          <p className="eyebrow gradient-text">Inventory</p>
          <h1 className="page-title">{isEdit ? 'Edit product' : 'Add product'}</h1>
          <p>{isEdit ? 'Update catalog details and pricing.' : 'Create a product with SKU, pricing, stock, and media.'}</p>
        </div>
        <Link className="btn ghost" to="/admin/products">Back to Products</Link>
      </div>

      <form className="admin-form-card" onSubmit={submit}>
        <div className="form-grid">
          <input placeholder="Product name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          <input placeholder="SKU" value={form.sku} onChange={(event) => update('sku', event.target.value)} />
          <input placeholder="Brand" value={form.brand} onChange={(event) => update('brand', event.target.value)} />
          <select value={form.category} onChange={(event) => update('category', event.target.value)} required>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <input type="number" placeholder="Price" value={form.price} onChange={(event) => update('price', event.target.value)} required />
          <input type="number" placeholder="Discount price" value={form.discountPrice} onChange={(event) => update('discountPrice', event.target.value)} />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(event) => update('stock', event.target.value)} required />
          <label className="file-upload-field">
            <input type="file" multiple accept="image/*" onChange={(event) => setImages([...event.target.files])} />
            <span>Choose product images</span>
            <strong>{images.length > 0 ? `${images.length} selected` : 'PNG, JPG, WEBP'}</strong>
          </label>
          <textarea className="span-2" placeholder="Description" rows="7" value={form.description} onChange={(event) => update('description', event.target.value)} required />
          <input className="span-2" placeholder="AI features (comma separated)" value={features} onChange={(event) => setFeatures(event.target.value)} />
        </div>
        <div className="admin-form-actions">
          <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} /> Featured</label>
          <label><input type="checkbox" checked={form.isPublished} onChange={(event) => update('isPublished', event.target.checked)} /> Published</label>
          <button type="button" className="btn ghost" onClick={generateDescription}><Sparkles size={18} /> Generate Description</button>
          <button className="btn primary" disabled={isSaving}><Save size={18} /> {isSaving ? 'Saving...' : 'Save Product'}</button>
        </div>
        {message && <p className="inline-message large-message">{message}</p>}
      </form>
    </AdminShell>
  )
}
