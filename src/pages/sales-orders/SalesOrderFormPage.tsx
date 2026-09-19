import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { customerApi } from '../../api/customerApi'
import { productApi } from '../../api/productApi'
import { saleOrderApi } from '../../api/saleOrderApi'
import type { Product } from '../../types/product'
import type { DiscountMode } from '../../types/saleOrder'
import { computeLineTotals, computeOrderTotals, formatMoney, modeFromDto } from '../../lib/orderMath'
import SearchableSelect from '../../components/SearchableSelect'
import ProductPickerModal from '../../components/ProductPickerModal'

interface LineRow {
  productId: number | null
  label: string
  quantity: string
  discountMode: DiscountMode
  discountValue: string
  basePrice: number
}

interface PerlineInput {
  productId: number
  quantity: number
  discountAmount: number | null
  discountPercentage: number | null
}

interface DiscountFieldProps {
  label: string
  mode: DiscountMode
  value: string
  onMode: (mode: DiscountMode) => void
  onValue: (value: string) => void
  perUnit?: boolean
}

function DiscountField({ label, mode, value, onMode, onValue, perUnit }: DiscountFieldProps) {
  return (
    <div>
      <label className="form-label small mb-1">{label}</label>
      <div className="btn-group w-100 mb-1" role="group" aria-label={`${label} mode`}>
        {(['none', 'amount', 'percentage'] as DiscountMode[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`btn btn-sm ${mode === option ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => onMode(option)}
          >
            {option === 'amount' ? (perUnit ? 'Per unit' : 'Amount') : option === 'percentage' ? '%' : 'None'}
          </button>
        ))}
      </div>
      {mode !== 'none' && (
        <input
          type="number"
          min="0"
          step={mode === 'percentage' ? '0.0001' : '0.01'}
          className="form-control form-control-sm"
          placeholder={mode === 'percentage' ? '0..100' : perUnit ? 'Per unit' : 'Flat amount'}
          value={value}
          onChange={(event) => onValue(event.target.value)}
        />
      )}
    </div>
  )
}

function SalesOrderFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editId = id ? Number(id) : null
  const isEdit = editId !== null
  const returnOfId = searchParams.get('original') ? Number(searchParams.get('original')) : null

  const [customers, setCustomers] = useState<Option[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [originalCandidates, setOriginalCandidates] = useState<OriginalOption[]>([])

  const [orderType, setOrderType] = useState<'SALE' | 'RETURN'>(
    returnOfId ? 'RETURN' : 'SALE',
  )
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerLabel, setCustomerLabel] = useState('')
  const [customerType, setCustomerType] = useState('PRAN RFL')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [contactMobile, setContactMobile] = useState('')
  const [originalSalesOrderId, setOriginalSalesOrderId] = useState<number | null>(null)
  const [originalLabel, setOriginalLabel] = useState('')
  const [lines, setLines] = useState<LineRow[]>([
    { productId: null, label: '', quantity: '1', discountMode: 'none', discountValue: '', basePrice: 0 },
  ])
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [orderDiscountMode, setOrderDiscountMode] = useState<DiscountMode>('none')
  const [orderDiscountValue, setOrderDiscountValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [returnableHint, setReturnableHint] = useState<string | null>(null)

  const isReturn = orderType === 'RETURN'
  const lockedCustomer = isEdit || returnOfId !== null
  const lockedType = isEdit || returnOfId !== null
  const lockedOriginal = isEdit

  const productById = useMemo(() => {
    const map = new Map<number, Product>()
    for (const product of products) map.set(product.productId, product)
    return map
  }, [products])

  const applyPerlineRows = (perlines: PerlineInput[], productList: Product[]) => {
    const productMap = new Map(productList.map((p) => [p.productId, p]))
    setLines(
      perlines.map((line) => {
        const { mode: discountMode, value: discountValue } = modeFromDto(
          line.discountAmount,
          line.discountPercentage,
        )
        const product = productMap.get(line.productId)
        return {
          productId: line.productId,
          label: product ? `${product.sku} — ${product.productName}` : String(line.productId),
          quantity: String(line.quantity),
          discountMode,
          discountValue: discountValue ? String(discountValue) : '',
          basePrice: product?.price ?? 0,
        }
      }),
    )
  }

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [customerPage, productPage] = await Promise.all([
          customerApi.getAll({ start: 0, limit: 1000 }),
          productApi.getAll({ start: 0, limit: 1000 }),
        ])
        setCustomers(
          customerPage.records.map((customer) => ({
            value: customer.customerId,
            label: customer.customerName,
            type: customer.customerType,
          })),
        )
        setProducts(productPage.records)

        if (editId !== null) {
          const sale = await saleOrderApi.getById(editId)
          setOrderType(sale.orderType)
          setCustomerId(sale.customerId)
          setCustomerLabel(
            customerPage.records.find((c) => c.customerId === sale.customerId)?.customerName ?? '',
          )
          setCustomerType(sale.customerType)
          setOrderDate(sale.orderDate)
          setReference(sale.reference ?? '')
          setNote(sale.note ?? '')
          setDeliveryAddress(sale.deliveryAddress ?? '')
          setContactMobile(sale.contactPersonMobileNumber ?? '')
          setOriginalSalesOrderId(sale.originalSalesOrderId)
          setOriginalLabel(
            sale.originalSalesOrderId ? `Original sale #${sale.originalSalesOrderId}` : '',
          )
          const { mode: orderMode, value: orderValue } = modeFromDto(
            sale.discountAmount,
            sale.discountPercentage,
          )
          setOrderDiscountMode(orderMode)
          setOrderDiscountValue(orderValue ? String(orderValue) : '')
          applyPerlineRows(sale.perlines, productPage.records)
        } else if (returnOfId !== null) {
          const original = await saleOrderApi.getById(returnOfId)
          setCustomerId(original.customerId)
          setCustomerLabel(
            customerPage.records.find((c) => c.customerId === original.customerId)?.customerName ?? '',
          )
          setCustomerType(original.customerType)
          setOriginalSalesOrderId(original.salesOrderId)
          setOriginalLabel(original.documentNumber)
          setReference(original.reference ?? '')
          applyPerlineRows(original.perlines, productPage.records)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoaded(true)
      }
    }
    void loadBase()
  }, [editId, returnOfId])

  useEffect(() => {
    if (!isReturn || lockedOriginal || customerId === null) return
    let cancelled = false
    saleOrderApi
      .getAll({
        orderType: 'SALE',
        overallStatus: 'Completed',
        customerId,
        start: 0,
        limit: 50,
      })
      .then((page) => {
        if (cancelled) return
        setOriginalCandidates(
          page.records.map((sale) => ({
            value: sale.salesOrderId,
            label: `${sale.documentNumber} (${sale.orderDate})`,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setOriginalCandidates([])
      })
    return () => {
      cancelled = true
    }
  }, [isReturn, lockedOriginal, customerId])

  const lineTotals = useMemo(
    () =>
      lines.map((line) => {
        const basePrice =
          line.basePrice > 0 ? line.basePrice : productById.get(line.productId ?? -1)?.price ?? 0
        return computeLineTotals(
          basePrice,
          Number(line.quantity) || 0,
          line.discountMode,
          Number(line.discountValue) || 0,
        )
      }),
    [lines, productById],
  )
  const orderTotals = useMemo(
    () =>
      computeOrderTotals(
        lineTotals,
        orderDiscountMode,
        Number(orderDiscountValue) || 0,
      ),
    [lineTotals, orderDiscountMode, orderDiscountValue],
  )

  const updateLine = (index: number, patch: Partial<LineRow>) =>
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    )

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.productId,
        label: `${product.sku} — ${product.productName}`,
      })),
    [products],
  )

  const handleProductSelect = (index: number, productId: number) => {
    const product = productById.get(productId)
    updateLine(index, {
      productId,
      label: product ? `${product.sku} — ${product.productName}` : String(productId),
      basePrice: product?.price ?? 0,
    })
  }

  const availableOptionsFor = (index: number) => {
    const takenIds = new Set(
      lines.filter((_, lineIndex) => lineIndex !== index).map((line) => line.productId).filter((x): x is number => x !== null),
    )
    return productOptions.filter((option) => !takenIds.has(option.value))
  }

  const handleOriginalSelect = (value: number) => {
    setOriginalSalesOrderId(value)
    const match = originalCandidates.find((candidate) => candidate.value === value)
    setOriginalLabel(match ? match.label : `#${value}`)
    saleOrderApi
      .getById(value)
      .then((sale) => {
        applyPerlineRows(sale.perlines, products)
        setReturnableHint(`Returning quantities defaulted to sold quantities. The server enforces the remaining returnable quantity.`)
      })
      .catch(() => setReturnableHint(null))
  }

  const validate = (): string[] => {
    const errors: string[] = []
    if (!orderDate) errors.push('Order date is required')
    if (customerId === null) errors.push('Customer is required')
    if (isReturn && originalSalesOrderId === null) {
      errors.push('Original sales order is required for a return')
    }
    if (lines.length === 0) errors.push('Sales order must contain at least one product')
    const productIds = new Set<number>()
    lines.forEach((line, index) => {
      if (line.productId === null) {
        errors.push(`Line ${index + 1}: product is required`)
        return
      }
      if (productIds.has(line.productId)) {
        errors.push(`Product ${line.productId} appears more than once`)
        return
      }
      productIds.add(line.productId)
      const quantity = Number(line.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`Line ${index + 1}: quantity must be greater than zero`)
      }
      if (line.discountMode === 'amount') {
        const value = Number(line.discountValue)
        if (!Number.isFinite(value) || value < 0) {
          errors.push(`Line ${index + 1}: discount amount cannot be negative`)
        } else if (value > line.basePrice) {
          errors.push(`Line ${index + 1}: discount per unit cannot exceed the base price`)
        }
      } else if (line.discountMode === 'percentage') {
        const value = Number(line.discountValue)
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          errors.push(`Line ${index + 1}: discount percentage must be between 0 and 100`)
        }
      }
    })
    if (orderDiscountMode === 'amount') {
      const value = Number(orderDiscountValue)
      if (!Number.isFinite(value) || value < 0) {
        errors.push('Order discount amount cannot be negative')
      } else if (value > orderTotals.subtotal) {
        errors.push('Order discount cannot exceed the order subtotal')
      }
    } else if (orderDiscountMode === 'percentage') {
      const value = Number(orderDiscountValue)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push('Order discount percentage must be between 0 and 100')
      }
    }
    if (reference.length > 100) errors.push('Reference cannot exceed 100 characters')
    if (contactMobile.length > 20) errors.push('Contact mobile number cannot exceed 20 characters')
    return errors
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
      return
    }
    setError(null)
    setSaving(true)
    try {
      const validLines = lines
        .filter((line) => line.productId !== null && (Number(line.quantity) || 0) > 0)
        .map((line) => {
          const dto: { productId: number; quantity: number; discountAmount?: number | null; discountPercentage?: number | null } = {
            productId: line.productId as number,
            quantity: Number(line.quantity),
          }
          if (line.discountMode === 'amount') dto.discountAmount = Number(line.discountValue) || 0
          else if (line.discountMode === 'percentage') dto.discountPercentage = Number(line.discountValue) || 0
          return dto
        })
      const orderDiscount: { discountAmount?: number; discountPercentage?: number } = {}
      if (orderDiscountMode === 'amount') orderDiscount.discountAmount = Number(orderDiscountValue) || 0
      else if (orderDiscountMode === 'percentage') orderDiscount.discountPercentage = Number(orderDiscountValue) || 0

      const common = {
        orderDate,
        customerId: customerId as number,
        customerType,
        orderType,
        reference: reference.trim() || null,
        note: note.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        contactPersonMobileNumber: contactMobile.trim() || null,
        lines: validLines,
        ...(isReturn ? { originalSalesOrderId } : {}),
        ...orderDiscount,
      }

      if (isEdit) {
        const result = await saleOrderApi.update(editId as number, common)
        navigate(`/sales-orders/${editId}`, {
          replace: true,
          state: { message: result.message ?? 'Sales order updated successfully' },
        })
      } else {
        const result = await saleOrderApi.create(common)
        if (result.data === null) {
          setError(result.message ?? 'Sales order saved but no id was returned')
          return
        }
        navigate(`/sales-orders/${result.data}`, { state: { message: result.message ?? 'Sales order saved successfully' } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sales order')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  const title = isEdit
    ? `Edit Sales Order #${editId}`
    : returnOfId
      ? 'Create Return'
      : 'New Sales Order'

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="page-title mb-1">{title}</h2>
          <p className="text-secondary mb-0 small">Created as Pending; completing posts stock.</p>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/sales-orders')}>
          <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Back
        </button>
      </div>

      {isEdit && (
        <div className="alert alert-info py-2" role="alert">
          <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
          Prices are refreshed from the product master and all amounts recalculated when you save.
        </div>
      )}

      {returnableHint && (
        <div className="alert alert-info py-2" role="alert">{returnableHint}</div>
      )}

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h6 className="mb-3">Order details</h6>
            <div className="row g-3">
              <div className="col-md-3">
                <label htmlFor="soType" className="form-label">
                  Order type
                </label>
                <select
                  id="soType"
                  className="form-select"
                  value={orderType}
                  disabled={lockedType}
                  onChange={(event) => {
                    const value = event.target.value as 'SALE' | 'RETURN'
                    setOrderType(value)
                    if (value === 'SALE') {
                      setOriginalSalesOrderId(null)
                      setOriginalLabel('')
                    }
                  }}
                >
                  <option value="SALE">SALE</option>
                  <option value="RETURN">RETURN</option>
                </select>
                {lockedType && <small className="text-secondary">Locked on edit</small>}
              </div>
              <div className="col-md-3">
                <label className="form-label">
                  Customer <span className="text-danger">*</span>
                </label>
                <SearchableSelect
                  options={customers}
                  value={customerId}
                  onSelect={(value, label) => {
                    const option = customers.find((c) => c.value === value)
                    setCustomerId(value)
                    setCustomerLabel(label)
                    if (option?.type) setCustomerType(option.type)
                    setOriginalSalesOrderId(null)
                    setOriginalLabel('')
                  }}
                  placeholder="Select customer..."
                  ariaLabel="Select customer"
                  disabled={lockedCustomer}
                />
                {lockedCustomer && customerLabel && (
                  <small className="text-secondary">Locked on edit</small>
                )}
              </div>
              <div className="col-md-2">
                <label htmlFor="soCustomerType" className="form-label">
                  Customer type
                </label>
                <select
                  id="soCustomerType"
                  className="form-select"
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value)}
                >
                  <option value="PRAN RFL">PRAN RFL</option>
                  <option value="PERSONAL">PERSONAL</option>
                </select>
              </div>
              <div className="col-md-2">
                <label htmlFor="soOrderDate" className="form-label">
                  Order date <span className="text-danger">*</span>
                </label>
                <input
                  id="soOrderDate"
                  type="date"
                  className="form-control"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label htmlFor="soReference" className="form-label">
                  Reference
                </label>
                <input
                  id="soReference"
                  type="text"
                  className="form-control"
                  maxLength={100}
                  placeholder="Optional"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
              {isReturn && (
                <div className="col-md-6">
                  <label className="form-label">
                    Original completed sale <span className="text-danger">*</span>
                  </label>
                  {lockedOriginal ? (
                    <input type="text" className="form-control" value={originalLabel} disabled />
                  ) : (
                    <SearchableSelect
                      options={originalCandidates}
                      value={originalSalesOrderId}
                      onSelect={(value) => handleOriginalSelect(value)}
                      placeholder="Select the sale to return against..."
                      ariaLabel="Select original sale"
                    />
                  )}
                  {customerId !== null && originalCandidates.length === 0 && !lockedOriginal && (
                    <small className="text-secondary">
                      No completed sales for this customer yet.
                    </small>
                  )}
                </div>
              )}
              <div className="col-md-4">
                <label htmlFor="soContact" className="form-label">
                  Contact mobile
                </label>
                <input
                  id="soContact"
                  type="text"
                  className="form-control"
                  maxLength={20}
                  placeholder="01XXXXXXXXX"
                  value={contactMobile}
                  onChange={(event) => setContactMobile(event.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="soAddress" className="form-label">
                  Delivery address
                </label>
                <input
                  id="soAddress"
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="soNote" className="form-label">
                  Note
                </label>
                <input
                  id="soNote"
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="mb-0">Line items</h6>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() =>
                  setLines((current) => [
                    ...current,
                    { productId: null, label: '', quantity: '1', discountMode: 'none', discountValue: '', basePrice: 0 },
                  ])
                }
              >
                <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
                Add line
              </button>
            </div>
            <div className="table-responsive border rounded">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '42%' }}>
                      Product
                    </th>
                    <th scope="col" style={{ width: '7%' }}>
                      Qty
                    </th>
                    <th scope="col" style={{ width: '15%' }}>
                      Discount
                    </th>
                    <th scope="col" className="text-end" style={{ width: '8%' }}>
                      Base
                    </th>
                    <th scope="col" className="text-end" style={{ width: '8%' }}>
                      Unit
                    </th>
                    <th scope="col" className="text-end" style={{ width: '12%' }}>
                      Net
                    </th>
                    <th scope="col" style={{ width: '8%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const totals = lineTotals[index]
                    return (
                      <tr key={index}>
<td>
                  {line.productId === null ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary w-100"
                      onClick={() => setPickerIndex(index)}
                    >
                      <i className="bi bi-search me-1" aria-hidden="true"></i>
                      Select product
                    </button>
                  ) : (
                    <div className="input-group input-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-secondary text-body text-start text-truncate flex-grow-1 overflow-hidden"
                        title={line.label}
                        onClick={() => setPickerIndex(index)}
                      >
                        <span className="d-inline-block w-100 overflow-hidden text-truncate">
                          {line.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        aria-label={`Remove line ${index + 1} product`}
                        onClick={() =>
                          updateLine(index, {
                            productId: null,
                            label: '',
                            basePrice: 0,
                            discountMode: 'none',
                            discountValue: '',
                          })
                        }
                      >
                        <i className="bi bi-x-lg" aria-hidden="true"></i>
                      </button>
                    </div>
                  )}
                </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-control"
                            value={line.quantity}
                            onChange={(event) => updateLine(index, { quantity: event.target.value })}
                          />
                        </td>
                        <td>
                          <DiscountField
                            label="Line discount"
                            mode={line.discountMode}
                            value={line.discountValue}
                            onMode={(mode) => updateLine(index, { discountMode: mode, discountValue: mode === line.discountMode ? line.discountValue : '' })}
                            onValue={(value) => updateLine(index, { discountValue: value })}
                            perUnit
                          />
                        </td>
                        <td className="text-end">{formatMoney(line.basePrice)}</td>
                        <td className="text-end">{line.productId !== null ? formatMoney(totals.unitPrice) : '—'}</td>
                        <td className="text-end">{line.productId !== null ? formatMoney(totals.netAmount) : '—'}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm text-danger"
                            aria-label={`Remove line ${index + 1}`}
                            onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                            disabled={lines.length === 1}
                          >
                            <i className="bi bi-x-circle" aria-hidden="true"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan={5} className="text-end fw-semibold">
                      Subtotal
                    </td>
                    <td className="text-end fw-semibold">{formatMoney(orderTotals.subtotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <div className="card border-0 shadow-sm mb-3" style={{ minWidth: 360 }}>
            <div className="card-body">
              <h6 className="mb-3">Order discount</h6>
              <DiscountField
                label="Order-level discount"
                mode={orderDiscountMode}
                value={orderDiscountValue}
                onMode={(mode) => {
                  setOrderDiscountMode(mode)
                  setOrderDiscountValue(mode === orderDiscountMode ? orderDiscountValue : '')
                }}
                onValue={setOrderDiscountValue}
              />
              <hr />
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary">Total quantity</span>
                <span className="fw-medium">{orderTotals.totalQuantity}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary">Subtotal</span>
                <span>{formatMoney(orderTotals.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary">Discount</span>
                <span>
                  {orderDiscountMode !== 'none'
                    ? `${formatMoney(orderTotals.discountAmount ?? 0)}${orderDiscountMode === 'percentage' ? ` (${Number(orderDiscountValue) || 0}%)` : ''}`
                    : '—'}
                </span>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between">
                <span className="fw-semibold">Total</span>
                <span className="fw-semibold">{formatMoney(orderTotals.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mb-4">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/sales-orders')} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </form>

      <ProductPickerModal
        open={pickerIndex !== null}
        options={pickerIndex !== null ? availableOptionsFor(pickerIndex) : []}
        selectedId={pickerIndex !== null ? lines[pickerIndex]?.productId ?? null : null}
        onSelect={(value) => {
          if (pickerIndex !== null) handleProductSelect(pickerIndex, value)
        }}
        onClose={() => setPickerIndex(null)}
        title={isEdit ? 'Change product' : 'Select product'}
      />
    </div>
  )
}

interface Option {
  value: number
  label: string
  type?: string
}

interface OriginalOption {
  value: number
  label: string
}

export default SalesOrderFormPage