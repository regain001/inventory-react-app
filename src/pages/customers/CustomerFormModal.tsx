import { useState, type FormEvent } from 'react'
import { customerApi } from '../../api/customerApi'
import type { Customer } from '../../types/customer'

interface CustomerFormModalProps {
  customer: Customer | null
  onClose: () => void
  onSaved: () => void
}

const CUSTOMER_TYPES = ['MAHTAB MACHINERIES', 'PRAN RFL']

function CustomerFormModal({ customer, onClose, onSaved }: CustomerFormModalProps) {
  const [customerName, setCustomerName] = useState(customer?.customerName ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [customerType, setCustomerType] = useState(
    customer?.customerType ?? CUSTOMER_TYPES[0],
  )
  const [active, setActive] = useState(customer?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await customerApi.save({
        id: customer?.customerId ?? null,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        customerType,
        active,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer')
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
                <h5 className="modal-title">{customer ? 'Edit Customer' : 'Add Customer'}</h5>
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
                  <label htmlFor="customerName" className="form-label">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Acme Corp"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    autoFocus
                  />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="customerPhone" className="form-label">
                      Phone
                    </label>
                    <input
                      id="customerPhone"
                      type="text"
                      className="form-control"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="customerType" className="form-label">
                      Type
                    </label>
                    <select
                      id="customerType"
                      className="form-select"
                      value={customerType}
                      onChange={(event) => setCustomerType(event.target.value)}
                    >
                      {CUSTOMER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3 mt-3">
                  <label htmlFor="customerAddress" className="form-label">
                    Address
                  </label>
                  <textarea
                    id="customerAddress"
                    className="form-control"
                    rows={2}
                    placeholder="Optional address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  ></textarea>
                </div>
                <div className="form-check form-switch">
                  <input
                    id="customerActive"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="customerActive">
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

export default CustomerFormModal