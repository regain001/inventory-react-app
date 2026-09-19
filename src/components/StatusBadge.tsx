interface StatusBadgeProps {
  active: boolean
}

function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <span className={`badge ${active ? 'text-bg-success' : 'text-bg-secondary'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default StatusBadge