import { useCallback, useEffect, useState } from 'react'
import { productApi } from '../../api/productApi'
import { categoryApi } from '../../api/categoryApi'
import type { Product, ProductPage, ProductQuery } from '../../types/product'
import type { Category } from '../../types/category'
import StatusBadge from '../../components/StatusBadge'
import ProductFormModal from './ProductFormModal'

const PAGE_SIZES = [10, 20, 50, 100]

interface Filters {
  categoryId: string
  active: string
  minPrice: string
  maxPrice: string
}

const EMPTY_FILTERS: Filters = {
  categoryId: '',
  active: '',
  minPrice: '',
  maxPrice: '',
}

function toQuery(filters: Filters, keyword: string, start: number, limit: number): ProductQuery {
  const query: ProductQuery = { start, limit }
  if (keyword) query.keyword = keyword
  if (filters.categoryId) query.categoryId = Number(filters.categoryId)
  if (filters.active) query.active = filters.active === 'true'
  if (filters.minPrice) query.minPrice = Number(filters.minPrice)
  if (filters.maxPrice) query.maxPrice = Number(filters.maxPrice)
  return query
}

function ProductListPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState<ProductPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [start, setStart] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    categoryApi
      .getAll()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPage(await productApi.getAll(toQuery(filters, debouncedKeyword, start, limit)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [filters, debouncedKeyword, start, limit])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setStart(0)
  }

  const handleAdd = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleToggleStatus = async (product: Product) => {
    setError(null)
    try {
      await productApi.updateStatus(product.productId, !product.active)
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Delete product "${product.productName}" (${product.sku})? This cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await productApi.remove(product.productId)
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  const records = page?.records ?? []
  const from = page ? start + 1 : 0
  const to = page ? start + page.fetchedRecords : 0
  const total = page?.totalRecords ?? 0
  const hasPrev = start > 0
  const hasNext = page ? start + limit < total : false

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="page-title mb-1">Products</h2>
          <p className="text-secondary mb-0 small">Search and manage products</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Add Product
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <form
        className="card border-0 shadow-sm mb-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-lg-4 col-md-4 col-sm-6">
              <label htmlFor="productKeyword" className="form-label small mb-1">
                Search
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true"></i>
                </span>
                <input
                  id="productKeyword"
                  type="text"
                  className="form-control"
                  placeholder="Name or Code..."
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value)
                    setStart(0)
                  }}
                />
              </div>
            </div>
            <div className="col-lg-2 col-md-4 col-sm-6">
              <label htmlFor="productCategory" className="form-label small mb-1">
                Category
              </label>
              <select
                id="productCategory"
                className="form-select"
                value={filters.categoryId}
                onChange={(event) => updateFilters({ categoryId: event.target.value })}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.productCategoryId} value={category.productCategoryId}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-4 col-sm-6">
              <label htmlFor="productActive" className="form-label small mb-1">
                Status
              </label>
              <select
                id="productActive"
                className="form-select"
                value={filters.active}
                onChange={(event) => updateFilters({ active: event.target.value })}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="col-lg-2 col-md-4 col-sm-6">
              <label htmlFor="productMinPrice" className="form-label small mb-1">
                Min price
              </label>
              <input
                id="productMinPrice"
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                placeholder="0.00"
                value={filters.minPrice}
                onChange={(event) => updateFilters({ minPrice: event.target.value })}
              />
            </div>
            <div className="col-lg-2 col-md-4 col-sm-6">
              <label htmlFor="productMaxPrice" className="form-label small mb-1">
                Max price
              </label>
              <input
                id="productMaxPrice"
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                placeholder="99999.00"
                value={filters.maxPrice}
                onChange={(event) => updateFilters({ maxPrice: event.target.value })}
              />
            </div>
          </div>
        </div>
      </form>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-box-seam d-block mb-2 fs-3" aria-hidden="true"></i>
              No products found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Name</th>
                    <th scope="col">Category</th>
                    <th scope="col">Price</th>
                    <th scope="col">Pack</th>
                    <th scope="col">Min Stock</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((product) => (
                    <tr key={product.productId}>
                      <td className="text-monospace small">{product.sku}</td>
                      <td className="fw-medium">{product.productName}</td>
                      <td className="text-secondary">{product.productCategoryName}</td>
                      <td>{product.price.toFixed(2)}</td>
                      <td className="text-secondary">
                        {product.packQuantity} {product.packUnit}
                      </td>
                      <td className="text-secondary">{product.minStockLevel}</td>
                      <td>
                        <StatusBadge active={product.active} />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-2"
                          aria-label={`Edit ${product.productName}`}
                          onClick={() => handleEdit(product)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm me-2 ${
                            product.active ? 'btn-outline-warning' : 'btn-outline-success'
                          }`}
                          onClick={() => void handleToggleStatus(product)}
                        >
                          {product.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          aria-label={`Delete ${product.productName}`}
                          onClick={() => void handleDelete(product)}
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

      {!loading && records.length > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small">
              Showing {from}–{to} of {total} products
            </span>
            <select
              className="form-select form-select-sm d-inline-block w-auto"
              aria-label="Page size"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value))
                setStart(0)
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!hasPrev}
              onClick={() => setStart((current) => Math.max(0, current - limit))}
            >
              <i className="bi bi-chevron-left me-1" aria-hidden="true"></i>
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!hasNext}
              onClick={() => setStart((current) => current + limit)}
            >
              Next
              <i className="bi bi-chevron-right ms-1" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <ProductFormModal
          key={editingProduct?.productId ?? 'new'}
          product={editingProduct}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            void loadProducts()
          }}
        />
      )}
    </div>
  )
}

export default ProductListPage