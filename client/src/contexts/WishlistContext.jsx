/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components, react-hooks/exhaustive-deps */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [wishlist, setWishlist] = useState([])
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)

  const normalizeWishlist = (items = []) => {
    const products = items.map((item) => item.product || item).filter(Boolean)
    setWishlist(products)
    setWishlistIds(new Set(products.map((product) => product._id || product.id)))
    return products
  }

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([])
      setWishlistIds(new Set())
      return []
    }

    try {
      setIsWishlistLoading(true)
      const response = await api.get('/wishlist')
      return normalizeWishlist(response.data?.wishlist || [])
    } catch {
      return []
    } finally {
      setIsWishlistLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const isWishlisted = (productId) => wishlistIds.has(productId)

  const toggleWishlist = async (product) => {
    if (!isAuthenticated) {
      throw new Error('Please login to manage your wishlist.')
    }

    const productId = product._id || product.id

    if (isWishlisted(productId)) {
      await api.delete(`/wishlist/${productId}`)
      setWishlist((items) => items.filter((item) => (item._id || item.id) !== productId))
      setWishlistIds((ids) => {
        const next = new Set(ids)
        next.delete(productId)
        return next
      })
      return false
    }

    await api.post(`/wishlist/${productId}`)
    setWishlist((items) => [product, ...items])
    setWishlistIds((ids) => new Set(ids).add(productId))
    return true
  }

  const value = useMemo(
    () => ({
      fetchWishlist,
      isWishlisted,
      isWishlistLoading,
      toggleWishlist,
      wishlist,
      wishlistIds,
    }),
    [fetchWishlist, isWishlistLoading, wishlist, wishlistIds],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used inside WishlistProvider')
  }
  return context
}
