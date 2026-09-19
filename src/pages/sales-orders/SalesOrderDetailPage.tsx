import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { saleOrderApi } from '../../api/saleOrderApi'
import { customerApi } from '../../api/customerApi'
import type { SalesOrder } from '../../types/saleOrder'
import { formatMoney } from '../../lib/orderMath'

function statusBadge(status: string) {
  if (status === 'Completed') return 'text-bg-success'
  return 'text-bg-warning'
}

function SalesOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const orderId = Number(id)
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [flashMessage] = useState((location.state as { message?: string } | null)?.message ?? '')

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await saleOrderApi.getById(orderId)
      setOrder(data)
      setCustomerName('')
      try {
        const page = await customerApi.getAll({ start: 0, limit: 1000 })
        const match = page.records.find((customer) => customer.customerId === data.customerId)
        setCustomerName(match ? match.customerName : `Customer #${data.customerId}`)
      } catch {
        setCustomerName(`Customer #${data.customerId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (!Number.isFinite(orderId)) {
      setError('Invalid sales order id')
      setLoading(false)
      return
    }
    void loadOrder()
  }, [orderId, loadOrder])

  const handleComplete = async () => {
    if (!order) return
    const confirmed = window.confirm(
      `Complete ${order.documentNumber}? Stock will be posted and this cannot be undone.`,
    )
    if (!confirmed) return
    setWorking(true)
    setError(null)
    try {
      const result = await saleOrderApi.complete(order.salesOrderId)
      if (result.message) window.alert(result.message)
      await loadOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete sales order')
    } finally {
      setWorking(false)
    }
  }

  const handleDelete = async () => {
    if (!order) return
    const confirmed = window.confirm(`Delete ${order.documentNumber}? This cannot be undone.`)
    if (!confirmed) return
    setWorking(true)
    setError(null)
    try {
      const result = await saleOrderApi.remove(order.salesOrderId)
      if (result.message) window.alert(result.message)
      navigate('/sales-orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sales order')
      setWorking(false)
    }
  }

  const handleCreateReturn = () => {
    if (!order) return
    navigate(
      `/sales-orders/new?type=RETURN&original=${order.salesOrderId}&customer=${order.customerId}`,
    )
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
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/sales-orders')}>
          <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Back to sales orders
        </button>
      </div>
    )
  }

  if (!order) return null

  const orderDiscount = order.discountAmount ?? 0
  const subtotal = order.totalAmount + orderDiscount
  const isPending = order.overallStatus === 'Pending'
  const isCompletedSale = order.overallStatus === 'Completed' && order.orderType === 'SALE'

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="page-title mb-1">{order.documentNumber}</h2>
          <p className="text-secondary mb-0 small">
            <span className={`badge ${statusBadge(order.overallStatus)} me-2`}>{order.overallStatus}</span>
            <span className={`badge ${order.orderType === 'SALE' ? 'text-bg-primary' : 'text-bg-info'} me-2`}>
              {order.orderType}
            </span>
            Order date: {order.orderDate}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/sales-orders')}>
            <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
            Back
          </button>
          {isPending && (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(`/sales-orders/${order.salesOrderId}/edit`)}
              >
                <i className="bi bi-pencil me-1" aria-hidden="true"></i>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-success"
                disabled={working}
                onClick={() => void handleComplete()}
              >
                <i className="bi bi-check-lg me-1" aria-hidden="true"></i>
                Complete
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
          {isCompletedSale && (
            <button type="button" className="btn btn-outline-primary" onClick={handleCreateReturn}>
              <i className="bi bi-arrow-left-circle me-1" aria-hidden="true"></i>
              Create return
            </button>
          )}
        </div>
      </div>

      {flashMessage && (
        <div className="alert alert-success py-2" role="alert">
          <i className="bi bi-check-circle me-2" aria-hidden="true"></i>
          {flashMessage}
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3 col-lg-2">Reference</dt>
            <dd className="col-sm-9 col-lg-4">{order.reference ?? '—'}</dd>
            <dt className="col-sm-3 col-lg-2">Customer</dt>
            <dd className="col-sm-9 col-lg-4">
              {customerName} <span className="text-secondary small">({order.customerType})</span>
            </dd>
            <dt className="col-sm-3 col-lg-2">Order type</dt>
            <dd className="col-sm-9 col-lg-4">{order.orderType}</dd>
            <dt className="col-sm-3 col-lg-2">Original sale</dt>
            <dd className="col-sm-9 col-lg-4">
              {order.originalSalesOrderId ? (
                <a href={`#/sales-orders/${order.originalSalesOrderId}`}
                   onClick={(event) => {
                     event.preventDefault()
                     navigate(`/sales-orders/${order.originalSalesOrderId ?? ''}`)
                   }}>
                  #{order.originalSalesOrderId}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt className="col-sm-3 col-lg-2">Contact</dt>
            <dd className="col-sm-9 col-lg-4">{order.contactPersonMobileNumber ?? '—'}</dd>
            <dt className="col-sm-3 col-lg-2">Delivery address</dt>
            <dd className="col-sm-9 col-lg-4">{order.deliveryAddress ?? '—'}</dd>
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
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Product</th>
                  <th scope="col" className="text-end">
                    Qty
                  </th>
                  <th scope="col">UoM</th>
                  <th scope="col" className="text-end">
                    Base price
                  </th>
                  <th scope="col" className="text-end">
                    Discount
                  </th>
                  <th scope="col" className="text-end">
                    Unit price
                  </th>
                  <th scope="col" className="text-end">
                    Extended
                  </th>
                  <th scope="col" className="text-end">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.perlines.map((line) => (
                  <tr key={line.id}>
                    <td className="small">{line.productCode}</td>
                    <td>{line.productName}</td>
                    <td className="text-end">{line.quantity}</td>
                    <td>{line.unitOfMeasure ?? '—'}</td>
                    <td className="text-end">{formatMoney(line.basePrice)}</td>
                    <td className="text-end">
                      {line.discountPercentage !== null
                        ? `${line.discountPercentage}%`
                        : line.discountAmount !== null
                          ? formatMoney(line.discountAmount)
                          : '—'}
                    </td>
                    <td className="text-end">{formatMoney(line.unitPrice)}</td>
                    <td className="text-end">{formatMoney(line.extendedPrice)}</td>
                    <td className="text-end fw-medium">{formatMoney(line.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end">
        <div className="card border-0 shadow-sm" style={{ minWidth: 320 }}>
          <div className="card-body py-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-secondary">Total quantity</span>
              <span className="fw-medium">{order.totalQuantity}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-secondary">Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-secondary">Discount</span>
              <span>
                {order.discountPercentage !== null
                  ? `${formatMoney(orderDiscount)} (${order.discountPercentage}%)`
                  : order.discountAmount !== null
                    ? formatMoney(orderDiscount)
                    : '—'}
              </span>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between">
              <span className="fw-semibold">Total</span>
              <span className="fw-semibold">{formatMoney(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesOrderDetailPage