import { useCallback, useEffect, useState } from 'react'
import { customerApi } from '../../api/customerApi'
import type { Customer, CustomerQuery } from '../../types/customer'
import StatusBadge from '../../components/StatusBadge'
import CustomerFormModal from './CustomerFormModal'

const PAGE_SIZE = 10

interface Filters {
  status: string
}

const EMPTY_FILTERS: Filters = { status: '' }

function toQuery(filters: Filters, keyword: string, start: number): CustomerQuery {
  const query: CustomerQuery = { start, limit: PAGE_SIZE }
  if (keyword) query.keyword = keyword
  if (filters.status) query.status = filters.status === 'true'
  return query
}

function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [start, setStart] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(timer)
  }, [keyword])

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await customerApi.getAll(toQuery(filters, debouncedKeyword, start))
      setCustomers(page.records)
      setTotal(page.totalRecords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [filters, debouncedKeyword, start])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setStart(0)
  }

  const handleAdd = () => {
    setEditingCustomer(null)
    setShowForm(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowForm(true)
  }

  const handleToggleStatus = async (customer: Customer) => {
    setError(null)
    try {
      await customerApi.save({
        id: customer.customerId,
        customerName: customer.customerName,
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        customerType: customer.customerType,
        active: !customer.active,
      })
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDelete = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Delete customer "${customer.customerName}"? This cannot be undone.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await customerApi.remove(customer.customerId)
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer')
    }
  }

  const from = start + 1
  const to = start + customers.length
  const hasPrev = start > 0
  const hasNext = start + PAGE_SIZE < total

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="page-title mb-1">Customers</h2>
          <p className="text-secondary mb-0 small">Manage customers</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Add Customer
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
            <div className="col-md-6">
              <label htmlFor="customerKeyword" className="form-label small mb-1">
                Search
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true"></i>
                </span>
                <input
                  id="customerKeyword"
                  type="text"
                  className="form-control"
                  placeholder="Name, phone or address..."
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value)
                    setStart(0)
                  }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label htmlFor="customerStatus" className="form-label small mb-1">
                Status
              </label>
              <select
                id="customerStatus"
                className="form-select"
                value={filters.status}
                onChange={(event) => updateFilters({ status: event.target.value })}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
          ) : customers.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-people d-block mb-2 fs-3" aria-hidden="true"></i>
              No customers found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Address</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.customerId}>
                      <td className="fw-medium">{customer.customerName}</td>
                      <td>{customer.phone ?? '—'}</td>
                      <td className="text-secondary">{customer.address ?? '—'}</td>
                      <td>
                        <span className="badge text-bg-light border">{customer.customerType}</span>
                      </td>
                      <td>
                        <StatusBadge active={customer.active} />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-2"
                          aria-label={`Edit ${customer.customerName}`}
                          onClick={() => handleEdit(customer)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm me-2 ${
                            customer.active ? 'btn-outline-warning' : 'btn-outline-success'
                          }`}
                          onClick={() => void handleToggleStatus(customer)}
                        >
                          {customer.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          aria-label={`Delete ${customer.customerName}`}
                          onClick={() => void handleDelete(customer)}
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

      {!loading && customers.length > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <span className="text-secondary small">
            Showing {from}–{to} of {total} customers
          </span>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!hasPrev}
              onClick={() => setStart((current) => Math.max(0, current - PAGE_SIZE))}
            >
              <i className="bi bi-chevron-left me-1" aria-hidden="true"></i>
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!hasNext}
              onClick={() => setStart((current) => current + PAGE_SIZE)}
            >
              Next
              <i className="bi bi-chevron-right ms-1" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <CustomerFormModal
          key={editingCustomer?.customerId ?? 'new'}
          customer={editingCustomer}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            void loadCustomers()
          }}
        />
      )}
    </div>
  )
}

export default CustomerListPage