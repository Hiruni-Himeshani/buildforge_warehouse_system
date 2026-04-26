import { useState, useEffect, useMemo } from 'react'
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

/**
 * Modal form to add a new equipment row.
 * POST /api/equipment with name, category, quantity, location.
 */
export default function AddEquipment({ open, onClose, onSuccess }) {
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
    //Get aisle details for drop down
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
    if (!loc) return null
    return aisles.find((a) => a.code === loc) || null
  }, [aisles, location])

  /** Reset fields when opening fresh (parent controls `open`). */
  const reset = () => {
    setName('')
    setItemId('')
    setCategory('')
    setQuantity('')
    setLocation('')
    setErrors({})
  }

  const handleClose = () => {
    if (!loading) {
      reset()
      onClose()
    }
  }
  
// validations
  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Name is required'
    const q = Number(quantity)
    if (quantity === '' || Number.isNaN(q) || q < 0) {
      next.quantity = 'Enter a valid quantity (0 or more)'
    }
    if (matchedAisle && !Number.isNaN(q) && q > matchedAisle.availableSpace) {
      next.quantity = `Only ${matchedAisle.availableSpace} free slot(s) in this aisle (or raise max on Aisle map).`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await axios.post('http://localhost:5001/api/equipment', {
        name: name.trim(),
        itemId: itemId.trim(),
        category: category.trim(),
        quantity: Number(quantity),
        location: location.trim(),
      })
      reset()
      onClose()
      onSuccess?.('Item saved to inventory.')
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.message || 'Could not add equipment.'
      setErrors({ form: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="body">
      <DialogTitle>Add inventory item</DialogTitle>
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
            helperText={errors.name || 'What you call this product in the warehouse'}
            placeholder="e.g. Pallet jack, SKU-100 box"
            fullWidth
          />
          <TextField
            label="Item ID (optional)"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            helperText="SKU, barcode, or asset tag — used for lookup"
            fullWidth
          />
          <TextField
            label="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            helperText="e.g. Tools, Raw materials"
            placeholder="Optional group"
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
            helperText={errors.quantity || 'Total units stored at this rack'}
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
                const a = sortedAisles.find((x) => x.code === value)
                return a?.label?.trim() ? `${a.code} — ${a.label.trim()}` : value
              },
            }}
            helperText={
              aisles.length === 0 ? (
                <>
                  No aisles yet — add one on the{' '}
                  <Link component={RouterLink} to="/aisles" underline="hover">
                    Aisle map
                  </Link>
                  .
                </>
              ) : (
                <>
                  <Link component={RouterLink} to="/aisles" underline="hover">
                    Aisle map
                  </Link>{' '}
                  defines capacity for each code.
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
          </TextField>
          {matchedAisle ? (
            <Alert
              severity={
                Number(quantity) > matchedAisle.availableSpace ? 'warning' : 'info'
              }
            >
              <strong>{matchedAisle.code}</strong>: {matchedAisle.usedSpace} / {matchedAisle.maxSpace}{' '}
              used — <strong>{matchedAisle.availableSpace}</strong> available for new stock.
            </Alert>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving…' : 'Save item'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
