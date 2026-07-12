export default function StatusBadge({ children, tone = 'blue', className = '' }) {
  return <span className={`status-badge ${tone} ${className}`.trim()}>{children}</span>
}
