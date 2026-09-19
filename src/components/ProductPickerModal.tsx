import { useEffect, useMemo, useRef, useState } from 'react'

export interface ProductOption {
  value: number
  label: string
}

interface ProductPickerModalProps {
  open: boolean
  options: ProductOption[]
  selectedId: number | null
  onSelect: (productId: number, label: string) => void
  onClose: () => void
  title?: string
}

function ProductPickerModal({
  open,
  options,
  selectedId,
  onSelect,
  onClose,
  title = 'Select product',
}: ProductPickerModalProps) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      const timer = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = term
      ? options.filter((option) => option.label.toLowerCase().includes(term))
      : options
    return list.slice(0, 100)
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} aria-hidden="true"></div>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="input-group mb-3">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true"></i>
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  className="form-control"
                  placeholder="Search by code or name..."
                  aria-label="Search products"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="list-group" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {filtered.length === 0 && (
                  <div className="list-group-item text-secondary text-center py-4">
                    No matching products
                  </div>
                )}
                {filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    onClick={() => {
                      onSelect(option.value, option.label)
                      onClose()
                    }}
                  >
                    <span>{option.label}</span>
                    {option.value === selectedId && <i className="bi bi-check2 text-success" aria-hidden="true"></i>}
                  </button>
                ))}
              </div>
              {options.length > 100 && (
                <p className="text-secondary small mt-2 mb-0">
                  Showing first {filtered.length === 100 ? 100 : filtered.length} of {options.length}. Type to narrow.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProductPickerModal