import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saleOrderApi } from '../../api/saleOrderApi'
import { customerApi } from '../../api/customerApi'
import type { SalesOrder, SalesOrderQuery } from '../../types/saleOrder'
import { formatMoney } from '../../lib/orderMath'
import SearchableSelect from '../../components/SearchableSelect'

const PAGE_SIZES = [10, 20, 50, 100]

interface Filters {
  overallStatus: string
  orderType: string
  customerId: number | null
  customerLabel: string
  fromDate: string
  toDate: string
}

const EMPTY_FILTERS: Filters = {
  overallStatus: '',
  orderType: '',
  customerId: null,
  customerLabel: '',
  fromDate: '',
  toDate: '',
}

function toQuery(filters: Filters, keyword: string, start: number, limit: number): SalesOrderQuery {
  const query: SalesOrderQuery = { start, limit }
  if (keyword) query.keyword = keyword
  if (filters.overallStatus) query.overallStatus = filters.overallStatus as 'Pending' | 'Completed'
  if (filters.orderType) query.orderType = filters.orderType
  if (filters.customerId !== null) query.customerId = filters.customerId
  if (filters.fromDate) query.fromDate = filters.fromDate
  if (filters.toDate) query.toDate = filters.toDate
  return query
}

function statusBadge(status: string) {
  if (status === 'Completed') return 'text-bg-success'
  return 'text-bg-warning'
}

function SalesOrderListPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [total, setTotal] = useState(0)
  const [fetched, setFetched] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [start, setStart] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [expandedIds, setExpandedIds] = useState<number[]>([])

  const dateRangeInvalid = Boolean(
    filters.fromDate && filters.toDate && filters.fromDate > filters.toDate,
  )

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    customerApi
      .getAll({ start: 0, limit: 1000 })
      .then((page) => {
        const options = page.records.map((customer) => ({
          value: customer.customerId,
          label: customer.customerName,
        }))
        setCustomers(options)
      })
      .catch(() => setCustomers([]))
  }, [])

  const loadOrders = useCallback(async () => {
    if (dateRangeInvalid) {
      setOrders([])
      setTotal(0)
      setFetched(0)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await saleOrderApi.getAll(toQuery(filters, debouncedKeyword, start, limit))
      setOrders(page.records)
      setTotal(page.totalRecords)
      setFetched(page.fetchedRecords)
    } catch (err) {
      setOrders([])
      setTotal(0)
      setFetched(0)
      setError(err instanceof Error ? err.message : 'Failed to load sales orders')
    } finally {
      setLoading(false)
    }
  }, [dateRangeInvalid, filters, debouncedKeyword, start, limit])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setStart(0)
  }

  const customerName = (customerId: number) =>
    customers.find((option) => option.value === customerId)?.label ?? `Customer #${customerId}`

  const toggleExpand = (id: number) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )
  }

  const handleComplete = async (order: SalesOrder) => {
    const confirmed = window.confirm(
      `Complete ${order.documentNumber}? Stock will be posted and this cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      const result = await saleOrderApi.complete(order.salesOrderId)
      if (result.message) {
        setError(null)
        window.alert(result.message)
      }
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete sales order')
    }
  }

  const handleDelete = async (order: SalesOrder) => {
    const confirmed = window.confirm(`Delete ${order.documentNumber}? This cannot be undone.`)
    if (!confirmed) return
    setError(null)
    try {
      const result = await saleOrderApi.remove(order.salesOrderId)
      if (result.message) window.alert(result.message)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sales order')
    }
  }

  const handleReturn = (order: SalesOrder) => {
    navigate(`/sales-orders/new?type=RETURN&original=${order.salesOrderId}&customer=${order.customerId}`)
  }

  const from = start + 1
  const to = start + fetched
  const hasPrev = start > 0
  const hasNext = start + limit < total

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="page-title mb-1">Sales Orders</h2>
          <p className="text-secondary mb-0 small">Track sales and returns</p>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/sales-orders/new')}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
            New Sales Order
          </button>
        </div>
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
            <div className="col-lg-3 col-md-4">
              <label htmlFor="soKeyword" className="form-label small mb-1">
                Search
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true"></i>
                </span>
                <input
                  id="soKeyword"
                  type="text"
                  className="form-control"
                  placeholder="Document no or reference..."
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value)
                    setStart(0)
                  }}
                />
              </div>
            </div>
            <div className="col-lg-2 col-md-3 col-sm-6">
              <label htmlFor="soStatus" className="form-label small mb-1">
                Status
              </label>
              <select
                id="soStatus"
                className="form-select"
                value={filters.overallStatus}
                onChange={(event) => updateFilters({ overallStatus: event.target.value })}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="col-lg-2 col-md-3 col-sm-6">
              <label htmlFor="soType" className="form-label small mb-1">
                Type
              </label>
              <select
                id="soType"
                className="form-select"
                value={filters.orderType}
                onChange={(event) => updateFilters({ orderType: event.target.value })}
              >
                <option value="">All</option>
                <option value="SALE">SALE</option>
                <option value="RETURN">RETURN</option>
              </select>
            </div>
            <div className="col-lg-2 col-md-4">
              <label className="form-label small mb-1">Customer</label>
              <div className="d-flex gap-1">
                <SearchableSelect
                  options={customers}
                  value={filters.customerId}
                  onSelect={(value, label) =>
                    updateFilters({ customerId: value, customerLabel: label })
                  }
                  placeholder="All customers"
                  ariaLabel="Filter by customer"
                />
                {filters.customerId !== null && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-label="Clear customer filter"
                    title="Clear"
                    onClick={() => updateFilters({ customerId: null, customerLabel: '' })}
                  >
                    <i className="bi bi-x" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-lg-3 col-md-4 col-sm-6">
              <label htmlFor="soFromDate" className="form-label small mb-1">
                From date
              </label>
              <input
                id="soFromDate"
                type="date"
                className="form-control"
                value={filters.fromDate}
                onChange={(event) => updateFilters({ fromDate: event.target.value })}
              />
            </div>
            <div className="col-lg-3 col-md-4 col-sm-6">
              <label htmlFor="soToDate" className="form-label small mb-1">
                To date
              </label>
              <input
                id="soToDate"
                type="date"
                className="form-control"
                value={filters.toDate}
                onChange={(event) => updateFilters({ toDate: event.target.value })}
              />
            </div>
          </div>
          {dateRangeInvalid && (
            <div className="text-danger small mt-2">
              From date cannot be after to date.
            </div>
          )}
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
            <div className="text-center py-5">
              <i className="bi bi-receipt d-block mb-2 fs-3 text-secondary" aria-hidden="true"></i>
              <span className="text-secondary">No sales orders found.</span>
              {error && (
                <div className="mt-3">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void loadOrders()}>
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 32 }}></th>
                    <th scope="col">Doc. No.</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Date</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="text-end">
                      Qty
                    </th>
                    <th scope="col" className="text-end">
                      Total
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const expanded = expandedIds.includes(order.salesOrderId)
                    return (
                      <Fragment key={order.salesOrderId}>
                        <tr key={order.salesOrderId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales-orders/${order.salesOrderId}`)}>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm"
                              aria-label={expanded ? 'Collapse lines' : 'Expand lines'}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleExpand(order.salesOrderId)
                              }}
                            >
                              <i
                                className={`bi ${expanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                                aria-hidden="true"
                              ></i>
                            </button>
                          </td>
                          <td className="fw-medium">{order.documentNumber}</td>
                          <td className="text-secondary">{order.reference ?? '—'}</td>
                          <td>{order.orderDate}</td>
                          <td>{customerName(order.customerId)}</td>
                          <td>
                            <span className={`badge ${order.orderType === 'SALE' ? 'text-bg-primary' : 'text-bg-info'}`}>
                              {order.orderType}
                            </span>
                          </td>
                          <td className="text-end">{order.totalQuantity}</td>
                          <td className="text-end">{formatMoney(order.totalAmount)}</td>
                          <td>
                            <span className={`badge ${statusBadge(order.overallStatus)}`}>
                              {order.overallStatus}
                            </span>
                          </td>
                          <td className="text-secondary small">{order.createdAt.slice(0, 10)}</td>
                          <td className="text-end" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary me-1"
                              title="View"
                              aria-label={`View ${order.documentNumber}`}
                              onClick={() => navigate(`/sales-orders/${order.salesOrderId}`)}
                            >
                              <i className="bi bi-eye" aria-hidden="true"></i>
                            </button>
                            {order.overallStatus === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary me-1"
                                  title="Edit"
                                  aria-label={`Edit ${order.documentNumber}`}
                                  onClick={() => navigate(`/sales-orders/${order.salesOrderId}/edit`)}
                                >
                                  <i className="bi bi-pencil" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success me-1"
                                  title="Complete"
                                  aria-label={`Complete ${order.documentNumber}`}
                                  onClick={() => void handleComplete(order)}
                                >
                                  <i className="bi bi-check-lg" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  title="Delete"
                                  aria-label={`Delete ${order.documentNumber}`}
                                  onClick={() => void handleDelete(order)}
                                >
                                  <i className="bi bi-trash" aria-hidden="true"></i>
                                </button>
                              </>
                            )}
                            {order.overallStatus === 'Completed' && order.orderType === 'SALE' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                title="Create return"
                                onClick={() => handleReturn(order)}
                              >
                                <i className="bi bi-arrow-left-circle" aria-hidden="true"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${order.salesOrderId}-lines`}>
                            <td colSpan={11} className="bg-light p-0">
                              <SalesOrderLines lines={order.perlines} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
              Showing {from}–{to} of {total} sales orders
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
    </div>
  )
}

interface CustomerOption {
  value: number
  label: string
}

function SalesOrderLines({ lines }: { lines: SalesOrder['perlines'] }) {
  return (
    <div className="p-3">
      <table className="table table-sm table-striped border mb-0">
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
              Net
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
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
              <td className="text-end">{formatMoney(line.netAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SalesOrderListPage