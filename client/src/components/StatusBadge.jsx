export default function StatusBadge({ children, tone = 'blue' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}
