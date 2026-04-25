import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  filterAndSortEquipment,
  EQUIPMENT_SORT_OPTIONS,
  getEquipmentColumnFilterOptions,
  statusChipColor,
} from './equipmentDisplayUtils'

const TRASH_LOCATION = 'Trash'

export default function EquipmentList({ reloadKey, onEdit, onRefresh, onRequestAdd }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [damageTarget, setDamageTarget] = useState(null)
  const [damageAmount, setDamageAmount] = useState('1')
  const [damaging, setDamaging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const { statusValues, locationValues } = useMemo(() => getEquipmentColumnFilterOptions(rows), [rows])

  const displayRows = useMemo(
    () =>
      filterAndSortEquipment(rows, searchQuery, sortField, sortDir, {
        status: statusFilter,
        location: locationFilter,
      }),
    [rows, searchQuery, sortField, sortDir, statusFilter, locationFilter],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await axios.get('http://localhost:5001/api/equipment')
        if (!cancelled) setRows(res.data.equipment || [])
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setRows([])
          toast.error('Failed to load inventory. Is the server running?')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const confirmDamage = async () => {
    if (!damageTarget?._id) return
    const n = Number(damageAmount)
    if (Number.isNaN(n) || n < 1) {
      toast.error('Enter how many units to move to Trash (1 or more).')
      return
    }
    setDamaging(true)
    try {
      await axios.put(`http://localhost:5001/api/equipment/damage/${damageTarget._id}`, { amount: n })
      setDamageTarget(null)
      setDamageAmount('1')
      onRefresh?.()
      toast.success('Damaged stock moved to Trash; rack quantity updated.')
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.message || 'Could not update damaged stock.'
      toast.error(msg)
    } finally {
      setDamaging(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return
    setDeleting(true)
    try {
      await axios.delete(`http://localhost:5001/api/equipment/${deleteTarget._id}`)
      setDeleteTarget(null)
      onRefresh?.()
      toast.success('Row removed from inventory.')
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.message || 'Delete failed.'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 1, mb: 2 }} aria-label="Loading inventory" />
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Loading inventory…
        </Typography>
      </Box>
    )
  }

  if (rows.length === 0) {
    return (
      <Card sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
        <Inventory2RoundedIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} aria-hidden />
        <Typography variant="h6" gutterBottom>
          No inventory yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
          Create your first line item with name, quantity, and optionally a rack code from the Aisle map. You can also
          leave location empty if you are not using aisle limits.
        </Typography>
        {onRequestAdd ? (
          <Button variant="contained" size="large" onClick={onRequestAdd} sx={{ borderRadius: 2 }}>
            Add first item
          </Button>
        ) : null}
      </Card>
    )
  }

  const hasFilter =
    searchQuery.trim().length > 0 || Boolean(statusFilter) || Boolean(locationFilter)
  const countLabel = hasFilter
    ? `${displayRows.length} of ${rows.length} line${rows.length === 1 ? '' : 's'}`
    : `${rows.length} line${rows.length === 1 ? '' : 's'}`

  const clearTextSearch = () => setSearchQuery('')
  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setLocationFilter('')
  }

  return (
    <>
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }}
          flexWrap="wrap"
        >
          <TextField
            size="small"
            label="Search"
            placeholder="Name, item ID, category, quantity…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: '1 1 200px', minWidth: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" aria-hidden />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={clearTextSearch} edge="end">
                    <ClearRoundedIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="inv-filter-status-label">Status</InputLabel>
            <Select
              labelId="inv-filter-status-label"
              id="inv-filter-status"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {statusValues.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="inv-filter-location-label">Rack / aisle</InputLabel>
            <Select
              labelId="inv-filter-location-label"
              id="inv-filter-location"
              label="Rack / aisle"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {locationValues.map((loc) => (
                <MenuItem key={loc} value={loc}>
                  {loc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasFilter ? (
            <Button
              type="button"
              size="small"
              variant="text"
              onClick={clearAllFilters}
              sx={{ alignSelf: 'center', textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Clear filters
            </Button>
          ) : null}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="inv-sort-by-label">Sort by</InputLabel>
            <Select
              labelId="inv-sort-by-label"
              id="inv-sort-by"
              label="Sort by"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              {EQUIPMENT_SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title={sortDir === 'asc' ? 'Ascending (A→Z, low→high)' : 'Descending (Z→A, high→low)'}>
            <IconButton
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label="Toggle sort direction"
              size="small"
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
            >
              {sortDir === 'asc' ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Chip label={countLabel} variant="outlined" />
          {onRefresh ? (
            <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={onRefresh} sx={{ borderRadius: 2 }}>
              Refresh list
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {hasFilter && displayRows.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              No items match the current filters.
            </Typography>
            <Button size="small" onClick={clearAllFilters} sx={{ textTransform: 'none' }}>
              Clear all filters
            </Button>
          </Box>
        ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            overflow: 'auto',
            maxWidth: '100%',
            maxHeight: { xs: 'none', md: 'min(70vh, 640px)' },
            border: 1,
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          <Table size="small" aria-label="Inventory table" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Item ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>Rack / aisle</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((row) => {
                const atTrash = (row.location || '').trim() === TRASH_LOCATION
                const canMarkDamaged = !atTrash && row.quantity > 0
                return (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.itemId || '—'}</TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>{row.name}</Typography>
                    </TableCell>
                    <TableCell>{row.category || '—'}</TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell>{row.location || '—'}</TableCell>
                    <TableCell>
                      {row.status ? (
                        <Chip size="small" label={row.status} color={statusChipColor(row.status)} variant="outlined" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit this row">
                        <IconButton
                          aria-label={`Edit ${row.name}`}
                          color="primary"
                          onClick={() => onEdit?.(row)}
                          size="small"
                        >
                          <EditRoundedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={canMarkDamaged ? 'Move damaged units to Trash' : 'Nothing to move or already in Trash'}>
                        <span>
                          <IconButton
                            aria-label="Move damaged to trash"
                            color="warning"
                            disabled={!canMarkDamaged}
                            onClick={() => {
                              setDamageTarget(row)
                              setDamageAmount('1')
                            }}
                            size="small"
                          >
                            <DeleteSweepRoundedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete this inventory row permanently">
                        <IconButton
                          aria-label={`Delete ${row.name}`}
                          color="error"
                          onClick={() => setDeleteTarget(row)}
                          size="small"
                        >
                          <DeleteRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </Card>

      <Dialog open={!!damageTarget} onClose={() => !damaging && setDamageTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Move damaged stock to Trash</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This removes units from <strong>{damageTarget?.location || 'this rack'}</strong> and adds them to the{' '}
            <strong>{TRASH_LOCATION}</strong> row for <strong>{damageTarget?.name}</strong>. On-hand quantity here goes
            down; Trash goes up (same item).
          </DialogContentText>
          <TextField
            label="How many units?"
            type="number"
            size="small"
            fullWidth
            inputProps={{ min: 1, max: damageTarget?.quantity ?? 9999 }}
            value={damageAmount}
            onChange={(e) => setDamageAmount(e.target.value)}
            helperText={`Up to ${damageTarget?.quantity ?? 0} available on this row`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDamageTarget(null)} disabled={damaging}>
            Cancel
          </Button>
          <Button color="warning" variant="contained" onClick={confirmDamage} disabled={damaging}>
            {damaging ? 'Updating…' : 'Move to Trash'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete inventory row?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently remove <strong>{deleteTarget?.name}</strong> from the list. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
