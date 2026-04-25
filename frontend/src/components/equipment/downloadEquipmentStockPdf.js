import { jsPDF } from 'jspdf'
import { availableQuantity } from './equipmentDisplayUtils'

function trunc(s, max) {
  const t = String(s ?? '')
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/**
 * Builds a landscape PDF table of stock rows (same fields as Manage stock).
 * @param {object[]} equipment rows from GET /api/equipment
 */
export function downloadEquipmentStockPdf(equipment = []) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const margin = 36
  const pageW = 842
  const pageBottom = 560
  let y = 44

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Stock details', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, y, { align: 'right' })
  doc.setTextColor(0)
  y += 20

  if (equipment.length === 0) {
    doc.setFontSize(11)
    doc.text('No inventory lines to export.', margin, y)
    const name = `stock-details-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(name)
    return
  }

  // Column widths (sum ≈ 770) — item id, name, category, qty, avail, dmg, rack, status
  const colW = [56, 168, 80, 36, 40, 36, 120, 72]
  const head = ['Item ID', 'Name', 'Category', 'Qty', 'Available', 'Damage', 'Rack / aisle', 'Status']
  const rowH = 16
  const fontSize = 8
  const headerH = 18

  const drawHeader = () => {
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y - 2, pageW - margin * 2, headerH, 'F')
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', 'bold')
    let x = margin + 2
    head.forEach((h, i) => {
      doc.text(h, x, y + 9)
      x += colW[i]
    })
    doc.setFont('helvetica', 'normal')
    y += headerH
  }

  drawHeader()

  for (const row of equipment) {
    if (y + rowH > pageBottom) {
      doc.addPage()
      y = 40
      drawHeader()
    }

    const avail = availableQuantity(row)
    const dmg = Number(row.damagedQuantity) || 0
    const cells = [
      trunc(row.itemId, 10) || '—',
      trunc(row.name, 48) || '—',
      trunc(row.category, 18) || '—',
      String(row.quantity ?? ''),
      String(avail),
      String(dmg),
      trunc(row.location, 28) || '—',
      trunc(row.status, 12) || '—',
    ]

    doc.setFontSize(fontSize)
    let x = margin + 2
    cells.forEach((text, i) => {
      doc.text(String(text), x, y + 9, { maxWidth: colW[i] - 4 })
      x += colW[i]
    })
    y += rowH

    doc.setDrawColor(230)
    doc.line(margin, y - 2, pageW - margin, y - 2)
  }

  doc.setFontSize(8)
  doc.setTextColor(100)
  if (y + 20 > pageBottom) {
    doc.addPage()
    y = 40
  } else {
    y += 8
  }
  doc.text(`Total lines: ${equipment.length}`, margin, y)

  const fileName = `stock-details-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}
