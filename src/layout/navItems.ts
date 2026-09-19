export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
}

export interface NavGroup {
  group?: string
  items: NavItem[]
}

export const navItems: NavGroup[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', path: '/', icon: 'bi-grid-1x2-fill' }],
  },
  {
    group: 'Master Data',
    items: [
      { id: 'products', label: 'Products', path: '/products', icon: 'bi-box-seam' },
      { id: 'categories', label: 'Categories', path: '/categories', icon: 'bi-folder2-open' },
      { id: 'customers', label: 'Customers', path: '/customers', icon: 'bi-people' },
    ],
  },
  {
    group: 'Transactions',
    items: [
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        path: '/purchase-orders',
        icon: 'bi-cart-check',
      },
      {
        id: 'sales-orders',
        label: 'Sales Orders',
        path: '/sales-orders',
        icon: 'bi-receipt-cutoff',
      },
      {
        id: 'new-sales-order',
        label: 'New Sales Order',
        path: '/sales-orders/new',
        icon: 'bi-plus-square',
      },
    ],
  },
]