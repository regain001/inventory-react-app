import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { purchaseOrderApi } from '../../api/purchaseOrderApi'
import type { PurchaseOrder, PurchaseOrderQuery } from '../../types/purchaseOrder'
import PurchaseOrderFormModal from './PurchaseOrderFormModal'

const PAGE_SIZES = [10, 20, 50, 100]
const currencyFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface Filters {
  overallStatus: string
  fromDate: string
  toDate: string
}

const EMPTY_FILTERS: Filters = { overallStatus: '', fromDate: '', toDate: '' }

function toQuery(filters: Filters, start: number, limit: number): PurchaseOrderQuery {
  const query: PurchaseOrderQuery = { start, limit }
  if (filters.overallStatus) query.overallStatus = filters.overallStatus
  if (filters.fromDate) query.fromDate = filters.fromDate
  if (filters.toDate) query.toDate = filters.toDate
  return query
}

function statusBadge(status: string | null) {
  if (status === 'Completed') return 'text-bg-success'
  if (status === 'Pending') return 'text-bg-warning'
  return 'text-bg-secondary'
}

function PurchaseOrderListPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [start, setStart] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await purchaseOrderApi.getAll(toQuery(filters, start, limit))
      setOrders(page.records)
      setTotal(page.totalRecords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }, [filters, start, limit])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const handleApply = (event: FormEvent) => {
    event.preventDefault()
    setStart(0)
    setFilters(draft)
  }

  const handleReset = () => {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setStart(0)
  }

  const handleAdd = () => {
    setEditingOrder(null)
    setShowForm(true)
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order)
    setShowForm(true)
  }

  const handleDelete = async (order: PurchaseOrder) => {
    const confirmed = window.confirm(
      `Delete purchase order "${order.poNumber}"? This cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await purchaseOrderApi.remove(order.purchaseOrderId)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete purchase order')
    }
  }

  const from = start + 1
  const to = start + orders.length
  const hasPrev = start > 0
  const hasNext = start + limit < total

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="page-title mb-1">Purchase Orders</h2>
          <p className="text-secondary mb-0 small">Manage supplier purchase orders</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Add Purchase Order
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <form className="card border-0 shadow-sm mb-3" onSubmit={handleApply}>
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label htmlFor="poStatus" className="form-label small mb-1">
                Status
              </label>
              <select
                id="poStatus"
                className="form-select"
                value={draft.overallStatus}
                onChange={(event) => setDraft({ ...draft, overallStatus: event.target.value })}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="poFromDate" className="form-label small mb-1">
                From date
              </label>
              <input
                id="poFromDate"
                type="date"
                className="form-control"
                value={draft.fromDate}
                onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="poToDate" className="form-label small mb-1">
                To date
              </label>
              <input
                id="poToDate"
                type="date"
                className="form-control"
                value={draft.toDate}
                onChange={(event) => setDraft({ ...draft, toDate: event.target.value })}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-fill">
                Apply
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
                Reset
              </button>
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
          ) : orders.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-cart3 d-block mb-2 fs-3" aria-hidden="true"></i>
              No purchase orders found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">PO Number</th>
                    <th scope="col">Document No.</th>
                    <th scope="col">Date</th>
                    <th scope="col" className="text-end">
                      Total Qty
                    </th>
                    <th scope="col" className="text-end">
                      Total Amount
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isPending = order.overallStatus === 'Pending'
                    return (
                      <tr
                        key={order.purchaseOrderId}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/purchase-orders/${order.purchaseOrderId}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            navigate(`/purchase-orders/${order.purchaseOrderId}`)
                          }
                        }}
                      >
                        <td className="fw-medium">{order.poNumber}</td>
                        <td className="text-secondary small">{order.documentNumber ?? '—'}</td>
                        <td>{order.transactionDate}</td>
                        <td className="text-end">{order.totalQuantity}</td>
                        <td className="text-end">{currencyFormat.format(order.totalAmount)}</td>
                        <td>
                          <span className={`badge ${statusBadge(order.overallStatus)}`}>
                            {order.overallStatus ?? 'N/A'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-2"
                            aria-label={`View ${order.poNumber}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate(`/purchase-orders/${order.purchaseOrderId}`)
                            }}
                          >
                            <i className="bi bi-eye" aria-hidden="true"></i>
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary me-2"
                                aria-label={`Edit ${order.poNumber}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleEdit(order)
                                }}
                              >
                                <i className="bi bi-pencil" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                aria-label={`Delete ${order.poNumber}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleDelete(order)
                                }}
                              >
                                <i className="bi bi-trash" aria-hidden="true"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {!loading && orders.length > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small">
              Showing {from}–{to} of {total} purchase orders
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
        <PurchaseOrderFormModal
          key={editingOrder?.purchaseOrderId ?? 'new'}
          order={editingOrder}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            void loadOrders()
          }}
        />
      )}
    </div>
  )
}

export default PurchaseOrderListPage