/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components, react-hooks/exhaustive-deps */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated, isCustomer } = useAuth()
  const [cart, setCart] = useState({ items: [], totalItems: 0, subtotal: 0, pricingUpdated: false })
  const [isCartLoading, setIsCartLoading] = useState(false)
  const [cartError, setCartError] = useState('')

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || !isCustomer) {
      setCart({ items: [], totalItems: 0, subtotal: 0, pricingUpdated: false })
      setCartError('')
      return null
    }

    try {
      setIsCartLoading(true)
      setCartError('')
      const response = await api.get('/cart')
      const nextCart = response.data?.cart || { items: [], totalItems: 0, subtotal: 0, pricingUpdated: false }
      setCart(nextCart)
      return nextCart
    } catch (error) {
      setCartError(error.message)
      return null
    } finally {
      setIsCartLoading(false)
    }
  }, [isAuthenticated, isCustomer])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add products to your cart.')
    }
    if (!isCustomer) {
      throw new Error('Only customer accounts can use the shopping cart.')
    }

    const response = await api.post('/cart', { productId, quantity })
    const nextCart = response.data?.cart
    setCart(nextCart)
    return nextCart
  }

  const updateQuantity = async (productId, quantity) => {
    const response = await api.put(`/cart/${productId}`, { quantity })
    const nextCart = response.data?.cart
    setCart(nextCart)
    return nextCart
  }

  const removeItem = async (productId) => {
    const response = await api.delete(`/cart/${productId}`)
    const nextCart = response.data?.cart
    setCart(nextCart)
    return nextCart
  }

  const clearCart = async () => {
    const response = await api.delete('/cart')
    const nextCart = response.data?.cart
    setCart(nextCart)
    return nextCart
  }

  const value = useMemo(
    () => ({
      addToCart,
      cart,
      cartError,
      clearCart,
      fetchCart,
      isCartLoading,
      removeItem,
      setCartError,
      updateQuantity,
    }),
    [cart, cartError, fetchCart, isCartLoading],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used inside CartProvider')
  }
  return context
}
