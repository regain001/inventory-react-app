import { useState, type FormEvent } from 'react'
import { categoryApi } from '../../api/categoryApi'
import type { Category } from '../../types/category'

interface CategoryFormModalProps {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}

function CategoryFormModal({ category, onClose, onSaved }: CategoryFormModalProps) {
  const [categoryName, setCategoryName] = useState(category?.categoryName ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [active, setActive] = useState(category?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!categoryName.trim()) {
      setError('Category name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await categoryApi.save({
        id: category?.productCategoryId ?? null,
        categoryName: categoryName.trim(),
        description: description.trim() || null,
        active,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {category ? 'Edit Category' : 'Add Category'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                ></button>
              </div>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger py-2" role="alert">
                    {error}
                  </div>
                )}
                <div className="mb-3">
                  <label htmlFor="categoryName" className="form-label">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="categoryName"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Beverages"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="categoryDescription" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="categoryDescription"
                    className="form-control"
                    rows={3}
                    placeholder="Optional description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  ></textarea>
                </div>
                <div className="form-check form-switch">
                  <input
                    id="categoryActive"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="categoryActive">
                    Active
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  )
}

export default CategoryFormModal