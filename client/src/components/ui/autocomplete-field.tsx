import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Check, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { KeyValuePair } from "@/types/KeyValuePair"

interface AutocompleteFieldProps {
  data: KeyValuePair[]                  // full pool of suggestions
  selected?: KeyValuePair[]             // controlled selected items
  onDataChange?: (selected: KeyValuePair[]) => void
  placeholder?: string
}

export function AutocompleteField({
  data,
  selected = [],
  onDataChange,
  placeholder = "Search an existing guest or add a new guest..."
}: AutocompleteFieldProps) {
  // internal copies that mirror props (component works well controlled OR uncontrolled)
  const [allItems, setAllItems] = useState<KeyValuePair[]>(() => data ?? [])
  const [selectedItems, setSelectedItems] = useState<KeyValuePair[]>(() => selected ?? [])
  const [input, setInput] = useState("")
  const [filteredItems, setFilteredItems] = useState<KeyValuePair[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const newKeyCounter = useRef(1)
  function generateNewKey() {
    const key = `new-${newKeyCounter.current}`
    newKeyCounter.current += 1
    return key
  }

  // Keep internal lists in sync with incoming props (controlled behavior)
  useEffect(() => {
    setAllItems(data ?? [])
  }, [data])

  useEffect(() => {
    setSelectedItems(selected ?? [])
  }, [selected])

  // available = all - selected
  const availableItems = allItems.filter(ai => !selectedItems.some(s => s.key === ai.key))

  // Filter items based on input (stable deps)
  useEffect(() => {
    const q = input.trim()
    if (!q) {
      setFilteredItems([])
      return
    }

    const lower = q.toLowerCase()

    const filtered = availableItems.filter(
      (item) => item.value.toLowerCase().includes(lower) && item.value.toLowerCase() !== lower
    )

    setFilteredItems(filtered)
  }, [input, allItems, selectedItems]) // stable deps

  // Click outside — attach once
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Add existing item (user picks suggestion)
  const handleAddItem = (item: KeyValuePair) => {
    setSelectedItems(prev => {
      const updated = [...prev, item]
      // notify parent
      Promise.resolve().then(() => onDataChange?.(updated))
      return updated
    })

    // if item was not previously in allItems (unlikely), ensure it's present
    setAllItems(prev => (prev.some(p => p.key === item.key) ? prev : [...prev, item]))

    setInput("")
    setShowDropdown(false)
  }

  // Add newly typed item
  const handleAddNew = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    const newItem: KeyValuePair = { key: generateNewKey(), value: trimmed }

    // add to allItems then select it
    setAllItems(prev => [...prev, newItem])
    setSelectedItems(prev => {
      const updated = [...prev, newItem]
      Promise.resolve().then(() => onDataChange?.(updated))
      return updated
    })

    setInput("")
    setShowDropdown(false)
  }

  // Remove selected chip (returns to suggestion pool automatically)
  const handleRemoveItem = (item: KeyValuePair) => {
    setSelectedItems(prev => {
      const updated = prev.filter(i => i.key !== item.key)
      Promise.resolve().then(() => onDataChange?.(updated))
      return updated
    })
    // don't remove from allItems — it remains available
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const existing = availableItems.find(
        (it) => it.value.toLowerCase() === input.trim().toLowerCase()
      )
      if (existing) handleAddItem(existing)
      else handleAddNew(input)
    } else if (e.key === "Escape") {
      setShowDropdown(false)
      setInput("")
    }
  }

  const isExactMatch = availableItems.some(
    (it) => it.value.toLowerCase() === input.trim().toLowerCase()
  )

  const canAddNew = input.trim().length > 0 && !isExactMatch

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "w-full px-3 py-2 border rounded-md bg-background text-foreground",
                "border-input placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-colors",
              )}
            />

            {showDropdown && (input.trim() || filteredItems.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredItems.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Suggestions
                    </div>

                    {filteredItems.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleAddItem(item)}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground",
                          "transition-colors cursor-pointer flex items-center gap-2",
                        )}
                        type="button"
                      >
                        <Check className="w-4 h-4 text-primary" />
                        {item.value}
                      </button>
                    ))}
                  </>
                )}

                {canAddNew && (
                  <>
                    {filteredItems.length > 0 && <div className="border-t border-border" />}
                    <button
                      onClick={() => handleAddNew(input)}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground",
                        "transition-colors cursor-pointer flex items-center gap-2 text-primary font-medium",
                      )}
                      type="button"
                    >
                      <Plus className="w-4 h-4" />
                      Add "{input.trim()}"
                    </button>
                  </>
                )}

                {filteredItems.length === 0 && !canAddNew && input.trim() && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches found</div>
                )}
              </div>
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full",
                    "bg-primary text-primary-foreground text-sm font-medium",
                  )}
                >
                  {item.value}
                  <button
                    onClick={() => handleRemoveItem(item)}
                    className="hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${item.value}`}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Total of {selectedItems.length} guests
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
