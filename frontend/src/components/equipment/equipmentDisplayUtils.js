/**
 * Client-side search + sort for equipment/inventory rows (same as Manage stock).
 */

export const EQUIPMENT_SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'itemId', label: 'Item ID' },
  { value: 'category', label: 'Category' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'available', label: 'Available' },
  { value: 'damagedQuantity', label: 'Damage' },
  { value: 'location', label: 'Rack / aisle' },
  { value: 'status', label: 'Status' },
]

/** MUI Chip color for equipment status (aligned with Inventory dashboard). */
export function statusChipColor(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('avail') || s.includes('in stock') || s.includes('good')) return 'success'
  if (s.includes('reserved')) return 'warning'
  if (s.includes('low')) return 'warning'
  if (s.includes('damage') || s.includes('out') || s.includes('scrap')) return 'error'
  return 'default'
}

export function availableQuantity(row) {
  const q = Number(row?.quantity) || 0
  const r = Number(row?.reservedQty) || 0
  return Math.max(0, q - r)
}

export function statusDisplayKey(r) {
  return (r.status || '').trim() || '—'
}

export function locationDisplayKey(r) {
  return (r.location || '').trim() || '—'
}

/** @returns {{ statusValues: string[], locationValues: string[] }} */
export function getEquipmentColumnFilterOptions(rows) {
  const st = new Set()
  const loc = new Set()
  for (const r of rows) {
    st.add(statusDisplayKey(r))
    loc.add(locationDisplayKey(r))
  }
  const sortFn = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  return {
    statusValues: [...st].sort(sortFn),
    locationValues: [...loc].sort(sortFn),
  }
}

/**
 * @param {object[]} rows raw equipment from API
 * @param {string} searchQuery substring on name, item id, category, quantity (use column filters for status/location)
 * @param {string} sortField one of EQUIPMENT_SORT_OPTIONS value
 * @param {'asc'|'desc'} sortDir
 * @param {{ status?: string, location?: string }} [columnFilters] exact match; empty = all
 */
export function filterAndSortEquipment(rows, searchQuery, sortField, sortDir, columnFilters = {}) {
  const { status: statusValue = '', location: locationValue = '' } = columnFilters

  const term = searchQuery.trim().toLowerCase()
  let list = term
    ? rows.filter((r) => {
        const parts = [r.name, r.itemId, r.category, String(r.quantity ?? '')]
          .filter((x) => x != null && String(x).length)
          .map((x) => String(x).toLowerCase())
        return parts.some((p) => p.includes(term))
      })
    : [...rows]

  if (statusValue) {
    list = list.filter((r) => statusDisplayKey(r) === statusValue)
  }
  if (locationValue) {
    list = list.filter((r) => locationDisplayKey(r) === locationValue)
  }

  const mult = sortDir === 'asc' ? 1 : -1
  list.sort((a, b) => {
    if (sortField === 'quantity') {
      return (Number(a.quantity) - Number(b.quantity)) * mult
    }
    if (sortField === 'damagedQuantity') {
      return (Number(a.damagedQuantity || 0) - Number(b.damagedQuantity || 0)) * mult
    }
    if (sortField === 'available') {
      return (availableQuantity(a) - availableQuantity(b)) * mult
    }
    const get = (row) => {
      const v = row[sortField]
      if (v == null) return ''
      return String(v).trim()
    }
    return get(a).localeCompare(get(b), undefined, { numeric: true, sensitivity: 'base' }) * mult
  })
  return list
}
