import { useEffect, useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  Link,
} from '@mui/material'
import axios from 'axios'
import { toast } from 'react-toastify'

const TRASH = 'Trash'

/**
 * Modal to edit one equipment item.
 * When `equipment` is set, fields are pre-filled; PUT /api/equipment/:id sends updates.
 */
export default function EditEquipment({ open, equipment, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [itemId, setItemId] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [location, setLocation] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [aisles, setAisles] = useState([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    axios
      .get('http://localhost:5001/api/aisles')
      .then((res) => {
        if (!cancelled) setAisles(res.data.aisles || [])
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setAisles([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const sortedAisles = useMemo(
    () => [...aisles].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [aisles],
  )

  const matchedAisle = useMemo(() => {
    const loc = location.trim()
    if (!loc || loc === TRASH) return null
    return aisles.find((a) => a.code === loc) || null
  }, [aisles, location])

  // Whenever we open the dialog with a new row, copy values into local state
  useEffect(() => {
    if (equipment && open) {
      setName(equipment.name ?? '')
      setItemId(equipment.itemId ?? '')
      setCategory(equipment.category ?? '')
      setQuantity(String(equipment.quantity ?? ''))
      setLocation(equipment.location ?? '')
      setErrors({})
    }
  }, [equipment, open])

  const handleClose = () => {
    if (!loading) onClose()
  }

  //validations
  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Name is required'
    const q = Number(quantity)
    if (quantity === '' || Number.isNaN(q) || q < 0) {
      next.quantity = 'Enter a valid quantity (0 or more)'
    }
    if (matchedAisle && equipment && !Number.isNaN(q)) {
      const loc = location.trim()
      const sameLoc = loc === (equipment.location || '').trim()
      const headroom = sameLoc
        ? matchedAisle.maxSpace - matchedAisle.usedSpace + Number(equipment.quantity || 0)
        : matchedAisle.availableSpace
      if (q > headroom) {
        next.quantity = `Only ${headroom} unit(s) fit in this aisle with the new quantity/location.`
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!equipment?._id || !validate()) return
    setLoading(true)
    try {
      await axios.put(`http://localhost:5001/api/equipment/${equipment._id}`, {
        name: name.trim(),
        itemId: itemId.trim(),
        category: category.trim(),
        quantity: Number(quantity),
        location: location.trim(),
      })
      onClose()
      onSuccess?.('Changes saved.')
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.message || 'Could not update equipment.'
      setErrors({ form: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="body">
      <DialogTitle>Edit inventory item</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {errors.form ? <Alert severity="error">{errors.form}</Alert> : null}
          <TextField
            label="Item name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            label="Item ID (optional)"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            fullWidth
          />
          <TextField
            label="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          />
          <TextField
            label="Quantity on hand"
            type="number"
            required
            inputProps={{ min: 0 }}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={!!errors.quantity}
            helperText={errors.quantity}
            fullWidth
          />
          <TextField
            select
            label="Rack / aisle"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (value == null || value === '') {
                  return (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      Select rack / aisle
                    </Box>
                  )
                }
                if (value === TRASH) {
                  return 'Trash (damaged quarantine)'
                }
                const a = sortedAisles.find((x) => x.code === value)
                return a?.label?.trim() ? `${a.code} — ${a.label.trim()}` : value
              },
            }}
            helperText={
              location.trim() === TRASH ? (
                'Trash row — damaged quarantine'
              ) : aisles.length === 0 ? (
                <>
                  No aisles yet — add one on the{' '}
                  <Link component={RouterLink} to="/aisles" underline="hover">
                    Aisle map
                  </Link>
                  . Use Mark damaged to send stock to Trash.
                </>
              ) : (
                <>
                  <Link component={RouterLink} to="/aisles" underline="hover">
                    Aisle map
                  </Link>{' '}
                  defines capacity for each code. Use Mark damaged to send stock to Trash.
                </>
              )
            }
            fullWidth
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {sortedAisles.map((a) => (
              <MenuItem key={a._id} value={a.code}>
                {a.label?.trim() ? `${a.code} — ${a.label.trim()}` : a.code}
              </MenuItem>
            ))}
            <MenuItem value={TRASH}>Trash (damaged quarantine)</MenuItem>
            {location &&
            location.trim() !== TRASH &&
            !sortedAisles.some((a) => a.code === location) ? (
              <MenuItem value={location}>{location} (not on map)</MenuItem>
            ) : null}
          </TextField>
          {matchedAisle && equipment ? (
            <Alert
              severity={
                Number(quantity) >
                (location.trim() === (equipment.location || '').trim()
                  ? matchedAisle.maxSpace - matchedAisle.usedSpace + Number(equipment.quantity || 0)
                  : matchedAisle.availableSpace)
                  ? 'warning'
                  : 'info'
              }
            >
              <strong>{matchedAisle.code}</strong>: {matchedAisle.usedSpace} / {matchedAisle.maxSpace}{' '}
              used —{' '}
              {location.trim() === (equipment.location || '').trim() ? (
                <>
                  after saving this row, up to{' '}
                  <strong>
                    {matchedAisle.maxSpace - matchedAisle.usedSpace + Number(equipment.quantity || 0)}
                  </strong>{' '}
                  units allowed here.
                </>
              ) : (
                <>
                  <strong>{matchedAisle.availableSpace}</strong> free in this aisle for moved stock.
                </>
              )}
            </Alert>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
