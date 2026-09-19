import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { navItems } from './navItems'

function pageLabelFromPath(path: string): string {
  for (const group of navItems) {
    for (const item of group.items) {
      if (item.path === path) return item.label
    }
  }
  return 'Dashboard'
}

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const currentLabel = pageLabelFromPath(location.pathname)

  return (
    <div className="app-shell">
      <Topbar userName="Admin" collapsible onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
      <div className="app-body">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className="app-content">
          <nav className="breadcrumb app-breadcrumb mb-0" aria-label="breadcrumb">
            <span className="breadcrumb-item">
              <i className="bi bi-house-door" aria-hidden="true"></i>
            </span>
            <span className="breadcrumb-item active" aria-current="page">
              {currentLabel}
            </span>
          </nav>
          <div className="app-page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout