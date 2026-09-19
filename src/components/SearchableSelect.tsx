import { useEffect, useMemo, useRef, useState } from 'react'

export interface SearchOption {
  value: number
  label: string
}

interface SearchableSelectProps {
  options: SearchOption[]
  value: number | null
  onSelect: (value: number, label: string) => void
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}

function SearchableSelect({
  options,
  value,
  onSelect,
  placeholder = 'Search...',
  ariaLabel,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLabel = useMemo(() => {
    const match = options.find((option) => option.value === value)
    return match ? match.label : ''
  }, [options, value])

  useEffect(() => {
    if (disabled) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [disabled])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options
    return list.slice(0, 100)
  }, [options, query])

  if (disabled) {
    return (
      <div className="form-control" aria-disabled="true">
        {currentLabel || placeholder}
      </div>
    )
  }

  return (
    <div className="position-relative" ref={containerRef}>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={open && query ? query : currentLabel}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      />
      {open && (
        <ul className="list-group searchable-select-dropdown">
          {filtered.length === 0 && (
            <li className="list-group-item text-secondary">No matches</li>
          )}
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`list-group-item list-group-item-action px-3 ${
                  value === option.value ? 'active' : ''
                }`}
                onClick={() => {
                  onSelect(option.value, option.label)
                  setQuery('')
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchableSelect