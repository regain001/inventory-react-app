import { NavLink } from 'react-router-dom'
import { navItems } from './navItems'

interface SidebarProps {
  collapsed: boolean
}

function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="app-sidebar-nav">
        {navItems.map((group, groupIndex) => (
          <div className="sidebar-group" key={group.group ?? `group-${groupIndex}`}>
            {group.group && !collapsed && (
              <div className="sidebar-group-label">{group.group}</div>
            )}
            <ul className="sidebar-items list-unstyled mb-0">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    title={item.label}
                    className={({ isActive }) =>
                      `sidebar-item nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <i className={`bi ${item.icon}`} aria-hidden="true"></i>
                    {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar