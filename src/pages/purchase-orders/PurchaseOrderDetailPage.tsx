import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { purchaseOrderApi } from '../../api/purchaseOrderApi'
import type { PurchaseOrder } from '../../types/purchaseOrder'
import PurchaseOrderFormModal from './PurchaseOrderFormModal'

const currencyFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function statusBadge(status: string | null) {
  if (status === 'Completed') return 'text-bg-success'
  if (status === 'Pending') return 'text-bg-warning'
  return 'text-bg-secondary'
}

function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const orderId = Number(id)
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrder(await purchaseOrderApi.getById(orderId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (!Number.isFinite(orderId)) {
      setError('Invalid purchase order id')
      setLoading(false)
      return
    }
    void loadOrder()
  }, [orderId, loadOrder])

  const handleDelete = async () => {
    if (!order) return
    const confirmed = window.confirm(
      `Delete purchase order "${order.poNumber}"? This cannot be undone.`,
    )
    if (!confirmed) return
    setWorking(true)
    setError(null)
    try {
      await purchaseOrderApi.remove(order.purchaseOrderId)
      navigate('/purchase-orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete purchase order')
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div>
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/purchase-orders')}>
          <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Back to purchase orders
        </button>
      </div>
    )
  }

  if (!order) return null

  const isPending = order.overallStatus === 'Pending'

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="page-title mb-1">{order.documentNumber ?? order.poNumber}</h2>
          <p className="text-secondary mb-0 small">
            <span className={`badge ${statusBadge(order.overallStatus)}`}>
              {order.overallStatus ?? 'N/A'}
            </span>
            <span className="ms-2">Date: {order.transactionDate}</span>
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/purchase-orders')}
          >
            <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
            Back
          </button>
          {isPending && (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowEdit(true)}
              >
                <i className="bi bi-pencil me-1" aria-hidden="true"></i>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={working}
                onClick={() => void handleDelete()}
              >
                <i className="bi bi-trash me-1" aria-hidden="true"></i>
                Delete
              </button>
            </>
          )}
          {!isPending && (
            <span className="text-secondary align-self-center small">Completed — read only</span>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3 col-lg-2">PO number</dt>
            <dd className="col-sm-9 col-lg-4">{order.poNumber}</dd>
            <dt className="col-sm-3 col-lg-2">Document no.</dt>
            <dd className="col-sm-9 col-lg-4">{order.documentNumber ?? '—'}</dd>
            <dt className="col-sm-3 col-lg-2">Date</dt>
            <dd className="col-sm-9 col-lg-4">{order.transactionDate}</dd>
            <dt className="col-sm-3 col-lg-2">Status</dt>
            <dd className="col-sm-9 col-lg-4">
              <span className={`badge ${statusBadge(order.overallStatus)}`}>
                {order.overallStatus ?? 'N/A'}
              </span>
            </dd>
            <dt className="col-sm-3 col-lg-2">Note</dt>
            <dd className="col-sm-9 col-lg-4">{order.note ?? '—'}</dd>
            <dt className="col-sm-3 col-lg-2">Created</dt>
            <dd className="col-sm-9 col-lg-4">
              {order.createdAt} (by id {order.createdBy})
            </dd>
          </dl>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Product</th>
                  <th scope="col" className="text-end">
                    Qty
                  </th>
                  <th scope="col" className="text-end">
                    Unit price
                  </th>
                  <th scope="col" className="text-end">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.perlines.map((line) => (
                  <tr key={line.id}>
                    <td className="small">{line.productCode ?? '—'}</td>
                    <td>{line.productName ?? `Product #${line.productId}`}</td>
                    <td className="text-end">{line.quantity}</td>
                    <td className="text-end">{currencyFormat.format(line.unitPrice)}</td>
                    <td className="text-end fw-medium">
                      {currencyFormat.format(line.perlineTotalAmount ?? line.unitPrice * line.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end">
        <div className="card border-0 shadow-sm" style={{ minWidth: 260 }}>
          <div className="card-body py-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-secondary">Total quantity</span>
              <span className="fw-medium">{order.totalQuantity}</span>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between">
              <span className="fw-semibold">Total amount</span>
              <span className="fw-semibold">{currencyFormat.format(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <PurchaseOrderFormModal
          key={order.purchaseOrderId}
          order={order}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            void loadOrder()
          }}
        />
      )}
    </div>
  )
}

export default PurchaseOrderDetailPage