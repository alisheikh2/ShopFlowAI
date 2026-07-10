export const getProductId = (product) => product?._id || product?.id

export const getProductSlug = (product) => product?.slug || product?.id || '#'

export const getProductName = (product) => product?.name || product?.nameSnapshot || 'Product'

export const getProductCategory = (product) => {
  if (typeof product?.category === 'string') return product.category
  return product?.category?.name || 'ShopFlowAI'
}

export const getProductPrice = (product) => {
  if (product?.priceSnapshot !== undefined) return product.priceSnapshot
  if (Number(product?.discountPrice) > 0) return product.discountPrice
  return product?.price || 0
}

export const getProductOldPrice = (product) => {
  if (Number(product?.discountPrice) > 0) return product.price
  return product?.oldPrice
}

export const getProductImageUrl = (product) => {
  if (product?.imageSnapshot) return product.imageSnapshot
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0]?.url
  }
  return ''
}

export const getProductEmoji = (product) => product?.image || '🛍️'

export const normalizeProduct = (product) => ({
  ...product,
  id: getProductId(product),
  slug: getProductSlug(product),
  displayName: getProductName(product),
  displayCategory: getProductCategory(product),
  displayPrice: getProductPrice(product),
  displayOldPrice: getProductOldPrice(product),
  displayImageUrl: getProductImageUrl(product),
  displayEmoji: getProductEmoji(product),
})
