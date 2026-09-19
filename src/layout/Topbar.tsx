interface TopbarProps {
  userName: string
  collapsible: boolean
  onToggleSidebar: () => void
}

function Topbar({ userName, collapsible, onToggleSidebar }: TopbarProps) {
  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <span className="topbar-logo" aria-hidden="true">
          M
        </span>
        <span className="topbar-brand-name">Mahtab Machineries</span>
      </div>

      {collapsible && (
        <button
          type="button"
          className="btn topbar-icon-btn"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
        >
          <i className="bi bi-list" aria-hidden="true"></i>
        </button>
      )}

      <div className="topbar-spacer"></div>

      <button type="button" className="btn topbar-icon-btn" aria-label="Search">
        <i className="bi bi-search" aria-hidden="true"></i>
      </button>

      <div className="topbar-user">
        <span className="topbar-user-name">{userName}</span>
        <span className="topbar-avatar" aria-hidden="true">
          {userName.charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  )
}

export default Topbar