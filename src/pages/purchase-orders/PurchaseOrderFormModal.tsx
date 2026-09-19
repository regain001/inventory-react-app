import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { purchaseOrderApi } from '../../api/purchaseOrderApi'
import { productApi } from '../../api/productApi'
import type { Product } from '../../types/product'
import type { PurchaseOrder } from '../../types/purchaseOrder'

interface PurchaseOrderFormModalProps {
  order: PurchaseOrder | null
  onClose: () => void
  onSaved: () => void
}

interface LineRow {
  productId: string
  quantity: string
  unitPrice: string
}

const currencyFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toRows(order: PurchaseOrder | null): LineRow[] {
  if (!order) return [{ productId: '', quantity: '1', unitPrice: '' }]
  return order.perlines.map((line) => ({
    productId: String(line.productId),
    quantity: String(line.quantity),
    unitPrice: String(line.unitPrice),
  }))
}

function PurchaseOrderFormModal({ order, onClose, onSaved }: PurchaseOrderFormModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [poNumber, setPoNumber] = useState(order?.poNumber ?? '')
  const [transactionDate, setTransactionDate] = useState(
    order?.transactionDate ?? new Date().toISOString().slice(0, 10),
  )
  const [note, setNote] = useState(order?.note ?? '')
  const [overallStatus, setOverallStatus] = useState(order?.overallStatus ?? 'Pending')
  const [lines, setLines] = useState<LineRow[]>(() => toRows(order))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    productApi
      .getAll({ start: 0, limit: 1000 })
      .then((page) => setProducts(page.records))
      .catch(() => setProducts([]))
  }, [])

  const totals = useMemo(() => {
    let quantity = 0
    let amount = 0
    for (const line of lines) {
      const qty = Number(line.quantity) || 0
      const price = Number(line.unitPrice) || 0
      if (!line.productId) continue
      quantity += qty
      amount += qty * price
    }
    return { quantity, amount }
  }, [lines])

  const updateLine = (index: number, patch: Partial<LineRow>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    )
  }

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  const addLine = () => {
    setLines((current) => [...current, { productId: '', quantity: '1', unitPrice: '' }])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!poNumber.trim()) {
      setError('PO number is required')
      return
    }
    if (!transactionDate) {
      setError('Transaction date is required')
      return
    }
    const validLines = lines
      .filter((line) => line.productId && (Number(line.quantity) || 0) > 0)
      .map((line) => ({
        productId: Number(line.productId),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice) || 0,
      }))
    if (validLines.length === 0) {
      setError('Add at least one line with a product and quantity')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await purchaseOrderApi.save({
        purchaseOrderId: order?.purchaseOrderId ?? null,
        poNumber: poNumber.trim(),
        transactionDate,
        note: note.trim() || null,
        overallStatus,
        lines: validLines,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase order')
    } finally {
      setSaving(false)
    }
  }

  const productLabel = (product: Product) => `${product.sku} — ${product.productName}`

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {order ? 'Edit Purchase Order' : 'Add Purchase Order'}
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
                <div className="row g-3 mb-3">
                  <div className="col-md-3">
                    <label htmlFor="poNumber" className="form-label">
                      PO number <span className="text-danger">*</span>
                    </label>
                    <input
                      id="poNumber"
                      type="text"
                      className="form-control"
                      placeholder="e.g. PO-2026-001"
                      value={poNumber}
                      onChange={(event) => setPoNumber(event.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="poTransactionDate" className="form-label">
                      Transaction date <span className="text-danger">*</span>
                    </label>
                    <input
                      id="poTransactionDate"
                      type="date"
                      className="form-control"
                      value={transactionDate}
                      onChange={(event) => setTransactionDate(event.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="poOverallStatus" className="form-label">
                      Status
                    </label>
                    <select
                      id="poOverallStatus"
                      className="form-select"
                      value={overallStatus}
                      onChange={(event) => setOverallStatus(event.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="poNote" className="form-label">
                      Note
                    </label>
                    <input
                      id="poNote"
                      type="text"
                      className="form-control"
                      placeholder="Optional note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0">Line items</h6>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>
                    <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
                    Add line
                  </button>
                </div>

                <div className="table-responsive border rounded">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: '45%' }}>
                          Product
                        </th>
                        <th scope="col" style={{ width: '15%' }}>
                          Quantity
                        </th>
                        <th scope="col" style={{ width: '20%' }}>
                          Unit price
                        </th>
                        <th scope="col" className="text-end" style={{ width: '15%' }}>
                          Line total
                        </th>
                        <th scope="col" style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => {
                        const quantity = Number(line.quantity) || 0
                        const unitPrice = Number(line.unitPrice) || 0
                        return (
                          <tr key={index}>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                aria-label={`Product for line ${index + 1}`}
                                value={line.productId}
                                onChange={(event) =>
                                  updateLine(index, { productId: event.target.value })
                                }
                              >
                                <option value="">Select product...</option>
                                {products.map((option) => (
                                  <option key={option.productId} value={option.productId}>
                                    {productLabel(option)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm"
                                value={line.quantity}
                                onChange={(event) =>
                                  updateLine(index, { quantity: event.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control form-control-sm"
                                value={line.unitPrice}
                                onChange={(event) =>
                                  updateLine(index, { unitPrice: event.target.value })
                                }
                              />
                            </td>
                            <td className="text-end">
                              {line.productId ? currencyFormat.format(quantity * unitPrice) : '—'}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm text-danger"
                                aria-label={`Remove line ${index + 1}`}
                                onClick={() => removeLine(index)}
                                disabled={lines.length === 1}
                              >
                                <i className="bi bi-x-circle" aria-hidden="true"></i>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td className="fw-semibold">Totals</td>
                        <td className="fw-semibold">{totals.quantity}</td>
                        <td></td>
                        <td className="text-end fw-semibold">
                          {currencyFormat.format(totals.amount)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
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

export default PurchaseOrderFormModal