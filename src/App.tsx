import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Dashboard from './pages/Dashboard'
import CategoryListPage from './pages/categories/CategoryListPage'
import ProductListPage from './pages/products/ProductListPage'
import CustomerListPage from './pages/customers/CustomerListPage'
import PurchaseOrderListPage from './pages/purchase-orders/PurchaseOrderListPage'
import PurchaseOrderDetailPage from './pages/purchase-orders/PurchaseOrderDetailPage'
import SalesOrderListPage from './pages/sales-orders/SalesOrderListPage'
import SalesOrderDetailPage from './pages/sales-orders/SalesOrderDetailPage'
import SalesOrderFormPage from './pages/sales-orders/SalesOrderFormPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/categories" element={<CategoryListPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="/sales-orders" element={<SalesOrderListPage />} />
          <Route path="/sales-orders/new" element={<SalesOrderFormPage />} />
          <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
          <Route path="/sales-orders/:id/edit" element={<SalesOrderFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App