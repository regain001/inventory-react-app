import { useState, type FormEvent } from 'react'
import { productApi } from '../../api/productApi'
import type { Product } from '../../types/product'
import type { Category } from '../../types/category'

interface ProductFormModalProps {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

function ProductFormModal({ product, categories, onClose, onSaved }: ProductFormModalProps) {
  const [sku, setSku] = useState(product?.sku ?? '')
  const [productName, setProductName] = useState(product?.productName ?? '')
  const [categoryId, setCategoryId] = useState(
    String(product?.categoryId ?? categories[0]?.productCategoryId ?? ''),
  )
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [packQuantity, setPackQuantity] = useState(
    product ? String(product.packQuantity) : '1',
  )
  const [packUnit, setPackUnit] = useState(product?.packUnit ?? '')
  const [minStockLevel, setMinStockLevel] = useState(
    product ? String(product.minStockLevel) : '0',
  )
  const [active, setActive] = useState(product?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!sku.trim()) {
      setError('SKU is required')
      return
    }
    if (!productName.trim()) {
      setError('Product name is required')
      return
    }
    if (!categoryId) {
      setError('Category is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await productApi.save({
        id: product?.productId ?? null,
        sku: sku.trim(),
        productName: productName.trim(),
        categoryId: Number(categoryId),
        price: Number(price) || 0,
        packQuantity: Number(packQuantity) || 1,
        packUnit: packUnit.trim() || 'pcs',
        minStockLevel: Number(minStockLevel) || 0,
        active,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{product ? 'Edit Product' : 'Add Product'}</h5>
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
                <div className="row g-3">
                  <div className="col-md-4">
                    <label htmlFor="productSku" className="form-label">
                      Code <span className="text-danger">*</span>
                    </label>
                    <input
                      id="productSku"
                      type="text"
                      className="form-control"
                      placeholder="e.g. 83051"
                      value={sku}
                      onChange={(event) => setSku(event.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="col-md-8">
                    <label htmlFor="productName" className="form-label">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="productName"
                      type="text"
                      className="form-control"
                      placeholder="Product name"
                      value={productName}
                      onChange={(event) => setProductName(event.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="productCategoryId" className="form-label">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select
                      id="productCategoryId"
                      className="form-select"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Select category...</option>
                      {categories.map((category) => (
                        <option key={category.productCategoryId} value={category.productCategoryId}>
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="productPrice" className="form-label">
                      Price
                    </label>
                    <input
                      id="productPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="productMinStock" className="form-label">
                      Min stock level
                    </label>
                    <input
                      id="productMinStock"
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={minStockLevel}
                      onChange={(event) => setMinStockLevel(event.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="productPackQty" className="form-label">
                      Pack quantity
                    </label>
                    <input
                      id="productPackQty"
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="1"
                      value={packQuantity}
                      onChange={(event) => setPackQuantity(event.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="productPackUnit" className="form-label">
                      Pack unit
                    </label>
                    <input
                      id="productPackUnit"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Piece, pcs"
                      value={packUnit}
                      onChange={(event) => setPackUnit(event.target.value)}
                    />
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    <div className="form-check form-switch mb-1">
                      <input
                        id="productActive"
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={active}
                        onChange={(event) => setActive(event.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="productActive">
                        Active
                      </label>
                    </div>
                  </div>
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

export default ProductFormModal