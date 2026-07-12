/* eslint-disable react-hooks/set-state-in-effect */
import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import SectionHeader from '../components/SectionHeader'
import { EmptyState, ErrorState, ProductGridSkeleton } from '../components/LoadingState'
import api from '../services/api'

export default function Products() {
  const { slug: categorySlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryReady, setCategoryReady] = useState(!categorySlug)
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || '-createdAt')

  const query = useMemo(() => {
    const base = {
      page: searchParams.get('page') || 1,
      limit: 12,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || '-createdAt',
    }

    if (categoryId) {
      base.category = categoryId
    }

    return base
  }, [categoryId, searchParams])

  useEffect(() => {
    const loadCategory = async () => {
      setCategoryReady(false)
      if (!categorySlug) {
        setCategoryId('')
        setCategoryName('')
        setCategoryReady(true)
        return
      }

      try {
        const response = await api.get(`/categories/${categorySlug}`)
        setCategoryId(response.data?.category?._id || '')
        setCategoryName(response.data?.category?.name || categorySlug)
        setCategoryReady(true)
      } catch {
        setCategoryId('000000000000000000000000')
        setCategoryName(categorySlug)
        setCategoryReady(true)
      }
    }

    loadCategory()
  }, [categorySlug])

  const loadProducts = async () => {
    if (categorySlug && !categoryReady) {
      return
    }

    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/products', { query })
      setProducts(response.data?.products || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(err.message || 'Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryReady])

  const applyFilters = () => {
    const next = {}
    if (search.trim()) next.search = search.trim()
    if (sort) next.sort = sort
    setSearchParams(next)
  }

  return (
    <section className="container page-section">
      <SectionHeader
        eyebrow="Shop"
        title={categorySlug ? `Products in ${categoryName || categorySlug}` : 'Explore products'}
        description="Find the latest smartphones, laptops, wearables, audio gear, and accessories in one premium catalog."
      />

      <div className="toolbar glass-card product-search-toolbar">
        <label className="search-box product-search-box">
          <Search size={18} />
          <input
            placeholder="Search products by name, SKU, or brand"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
          />
          <span className="search-hint">Enter ↵</span>
        </label>
        <button className="btn ghost compact search-apply-btn" onClick={applyFilters}><SlidersHorizontal size={17} /> Apply</button>
        <select className="select-input" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="-createdAt">Newest</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {isLoading && <ProductGridSkeleton />}
      {!isLoading && error && <ErrorState message={error} onRetry={loadProducts} />}
      {!isLoading && !error && products.length === 0 && (
        <EmptyState title="No products found" description="Try changing your search or filters." />
      )}
      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="product-grid with-top-space">
            {products.map((product, index) => (
              <Reveal key={product._id} delay={(index % 8) * 70}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
          {pagination && (
            <div className="pagination-row">
              <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <div>
                <button
                  className="btn ghost compact"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(Number(pagination.currentPage) - 1) })}
                >
                  Previous
                </button>
                <button
                  className="btn ghost compact"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(Number(pagination.currentPage) + 1) })}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
