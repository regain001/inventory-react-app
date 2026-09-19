import { useCallback, useEffect, useState } from 'react'
import { categoryApi } from '../../api/categoryApi'
import type { Category } from '../../types/category'
import StatusBadge from '../../components/StatusBadge'
import CategoryFormModal from './CategoryFormModal'

function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCategories(await categoryApi.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const handleAdd = () => {
    setEditingCategory(null)
    setShowForm(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setShowForm(true)
  }

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(
      `Delete category "${category.categoryName}"? This cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await categoryApi.remove(category.productCategoryId)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="page-title mb-1">Categories</h2>
          <p className="text-secondary mb-0 small">Manage product categories</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Add Category
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-folder2-open d-block mb-2 fs-3" aria-hidden="true"></i>
              No categories found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.productCategoryId}>
                      <td className="fw-medium">{category.categoryName}</td>
                      <td className="text-secondary">{category.description ?? '—'}</td>
                      <td>
                        <StatusBadge active={category.active} />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-2"
                          aria-label={`Edit ${category.categoryName}`}
                          onClick={() => handleEdit(category)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          aria-label={`Delete ${category.categoryName}`}
                          onClick={() => void handleDelete(category)}
                        >
                          <i className="bi bi-trash" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <CategoryFormModal
          key={editingCategory?.productCategoryId ?? 'new'}
          category={editingCategory}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            void loadCategories()
          }}
        />
      )}
    </div>
  )
}

export default CategoryListPage