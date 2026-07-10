/* eslint-disable react-hooks/set-state-in-effect */
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import { EmptyState, ErrorState } from '../components/LoadingState'
import { featuredCategories } from '../data/mockData'

const categoryMeta = {
  smartphones: { icon: '📱', gradient: 'blue' },
  laptops: { icon: '💻', gradient: 'navy' },
  tablets: { icon: '▣', gradient: 'cyan' },
  smartwatches: { icon: '⌚', gradient: 'purple' },
  headphones: { icon: '🎧', gradient: 'purple' },
  gaming: { icon: '🎮', gradient: 'navy' },
  cameras: { icon: '📷', gradient: 'blue' },
  accessories: { icon: '🔌', gradient: 'cyan' },
}
import api from '../services/api'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/categories', { query: { limit: 24 } })
      setCategories(response.data?.categories || [])
    } catch (err) {
      setError(err.message || 'Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  return (
    <section className="container page-section">
      <SectionHeader
        eyebrow="Categories"
        title="Browse categories"
        description="Browse thoughtfully organized collections and jump straight into the products you need."
      />

      {isLoading && (
        <div className="category-grid with-top-space">
          {Array.from({ length: 4 }).map((_, index) => <div className="category-card skeleton-category skeleton" key={index} />)}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={loadCategories} />}
      {!isLoading && !error && categories.length === 0 && (
        <EmptyState title="No categories found" description="Create categories from the admin dashboard first." />
      )}
      {!isLoading && !error && categories.length > 0 && (
        <div className="category-grid with-top-space">
          {categories.map((category, index) => {
            const fallback = categoryMeta[category.slug] || featuredCategories[index % featuredCategories.length]
            return (
              <Link to={`/categories/${category.slug}`} className={`category-card ${fallback.gradient}`} key={category._id}>
                <span>{fallback.icon}</span>
                <h3>{category.name}</h3>
                <p>{category.description || 'Explore curated ShopFlowAI products'}</p>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
