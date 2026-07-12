import { Sparkles, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import { useToast } from '../contexts/ToastContext'
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
  const { showToast } = useToast()
  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [images, setImages] = useState([])
  const [existingImageCount, setExistingImageCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  // Left empty by default — the admin should type in the product's own
  // features instead of every product being pre-filled with the same
  // placeholder text ("premium design, fast performance, reliable quality").
  const [features, setFeatures] = useState('')

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
          setExistingImageCount(Array.isArray(product.images) ? product.images.length : 0)
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
        showToast(error.message || 'Could not load product details', 'error')
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (images.length === 0 && existingImageCount === 0) {
      showToast('Please upload at least one product image before saving the product.', 'error')
      return
    }

    try {
      setIsSaving(true)
      const payload = buildFormData()
      if (isEdit) {
        await api.put(`/products/${slug}`, payload)
      } else {
        await api.post('/products', payload)
      }
      showToast(isEdit ? 'Product updated successfully' : 'Product created successfully', 'success')
      navigate('/admin/products')
    } catch (error) {
      showToast(error.message || 'Could not save product', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const generateDescription = async () => {
    try {
      setIsGeneratingDescription(true)
      showToast('Generating AI description...', 'info')
      const response = await api.post('/ai/generate-description', {
        name: form.name,
        category: selectedCategoryName,
        brand: form.brand || 'ShopFlowAI',
        price: form.price ? Number(form.price) : undefined,
        features: features.split(',').map((item) => item.trim()).filter(Boolean),
      })
      update('description', response.data?.description || '')
      showToast('AI description generated successfully', 'success')
    } catch (error) {
      showToast(error.message || 'Could not generate description', 'error')
    } finally {
      setIsGeneratingDescription(false)
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
          <label className="file-upload-field required-upload">
            <input
              type="file"
              multiple
              accept="image/*"
              aria-required={existingImageCount === 0}
              onChange={(event) => setImages([...event.target.files])}
            />
            <span>Product images <small>At least 1 required</small></span>
            <strong>
              {images.length > 0
                ? `${images.length} selected`
                : existingImageCount > 0
                  ? `${existingImageCount} saved`
                  : 'Choose images'}
            </strong>
          </label>
          <textarea className="span-2" placeholder="Description" rows="7" value={form.description} onChange={(event) => update('description', event.target.value)} required />
          <input className="span-2" placeholder="AI features (comma separated)" value={features} onChange={(event) => setFeatures(event.target.value)} />
        </div>
        <div className="admin-form-actions">
          <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} /> Featured</label>
          <label><input type="checkbox" checked={form.isPublished} onChange={(event) => update('isPublished', event.target.checked)} /> Published</label>
          <button type="button" className="btn ghost" onClick={generateDescription} disabled={isGeneratingDescription}>
            <Sparkles size={18} className={isGeneratingDescription ? 'spin-icon' : ''} /> {isGeneratingDescription ? 'Generating...' : 'Generate Description'}
          </button>
          <button className="btn primary" disabled={isSaving}><Save size={18} /> {isSaving ? 'Saving...' : 'Save Product'}</button>
        </div>
      </form>
    </AdminShell>
  )
}
