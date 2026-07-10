export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid with-top-space">
      {Array.from({ length: count }).map((_, index) => (
        <div className="product-card skeleton-card" key={index}>
          <div className="skeleton-media skeleton" />
          <div className="product-body">
            <div className="skeleton line short" />
            <div className="skeleton line" />
            <div className="skeleton line medium" />
            <div className="skeleton line short" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🛍️</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="empty-state error-state">
      <div className="empty-icon">⚠️</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && <button className="btn primary" onClick={onRetry}>Try again</button>}
    </div>
  )
}
