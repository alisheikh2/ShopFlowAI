import { Trash2 } from 'lucide-react'

export default function AdminDeleteDialog({
  isOpen,
  itemName,
  itemType,
  description,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null
  const itemLabel = itemType.charAt(0).toUpperCase() + itemType.slice(1)

  return (
    <div className="logout-confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="logout-confirm-card admin-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Confirm ${itemType} deletion`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="logout-confirm-icon danger"><Trash2 size={22} /></div>
        <p className="eyebrow danger-eyebrow">Permanent action</p>
        <h3>Delete this {itemType}?</h3>
        <p>
          You are about to permanently delete <strong>{itemName}</strong>. {description}
        </p>
        <div className="logout-confirm-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={isDeleting}>Keep {itemLabel}</button>
          <button type="button" className="btn danger-action" onClick={onConfirm} disabled={isDeleting}>
            <Trash2 size={17} /> {isDeleting ? 'Deleting...' : `Delete ${itemLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}
