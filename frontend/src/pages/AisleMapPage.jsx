import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  LinearProgress,
  TextField,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Chip,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DashboardLayout from '../components/layout/DashboardLayout'

//Visual map of aisles: max vs used space, edit capacity, add/delete aisles.

export default function AisleMapPage() {
  const [aisles, setAisles] = useState([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ code: '', label: '', maxSpace: '100', sortOrder: '0' })
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ label: '', maxSpace: '', sortOrder: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('http://localhost:5001/api/aisles')
      setAisles(res.data.aisles || [])
    } catch (error) {
      console.error(error)
      setAisles([])
      toast.error(error.response?.data?.message || 'Could not load aisles. Check that the server is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  //validations
  const submitAdd = async () => {
    const max = Number(addForm.maxSpace)
    if (!addForm.code.trim()) {
      toast.error('Enter an aisle code (must match inventory rack/aisle field).')
      return
    }
    if (Number.isNaN(max) || max < 1) {
      toast.error('Max space must be at least 1.')
      return
    }
    setAddSubmitting(true)
    try {
      await axios.post('http://localhost:5001/api/aisles', {
        code: addForm.code.trim(),
        label: addForm.label.trim(),
        maxSpace: max,
        sortOrder: Number(addForm.sortOrder) || 0,
      })
      setAddOpen(false)
      setAddForm({ code: '', label: '', maxSpace: '100', sortOrder: '0' })
      await load()
      toast.success('Aisle added.')
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Failed to add aisle.')
    } finally {
      setAddSubmitting(false)
    }
  }

  const openEdit = (a) => {
    setEditTarget(a)
    setEditForm({
      label: a.label || '',
      maxSpace: String(a.maxSpace),
      sortOrder: String(a.sortOrder ?? 0),
    })
  }

  const submitEdit = async () => {
    if (!editTarget) return
    const max = Number(editForm.maxSpace)
    const minMax = editTarget.usedSpace ?? 0
    if (Number.isNaN(max) || max < 1) {
      toast.error('Max space must be at least 1.')
      return
    }
    if (max < minMax) {
      toast.error(`Max space cannot be less than current stock (${minMax} units in this aisle).`)
      return
    }
    setEditSubmitting(true)
    try {
      await axios.put(`http://localhost:5001/api/aisles/${editTarget._id}`, {
        label: editForm.label.trim(),
        maxSpace: max,
        sortOrder: Number(editForm.sortOrder) || 0,
      })
      setEditTarget(null)
      await load()
      toast.success('Aisle updated.')
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Update failed.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const runDelete = async () => {
    if (!deleteTarget?._id) return
    setDeleteSubmitting(true)
    try {
      await axios.delete(`http://localhost:5001/api/aisles/${deleteTarget._id}`)
      setDeleteTarget(null)
      await load()
      toast.success('Aisle deleted.')
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Delete failed.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const pct = (used, max) => (max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0)

  return (
    <DashboardLayout
      title="Aisle Map"
      
    >
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2, borderRadius: 2 }}>
        <strong>How it works:</strong> Add an aisle code (e.g. <strong>A-1</strong>), set how many units fit, then
        choose that code when adding inventory. Cards show how full each aisle is; edit capacity anytime if you
        expand racking.
      </Alert>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        {!loading && aisles.length > 0 ? (
          <Chip label={`${aisles.length} aisle${aisles.length === 1 ? '' : 's'}`} variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
        ) : null}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => load()}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Add aisle
          </Button>
        </Box>
      </Stack>

      {loading ? (
        <Box sx={{ py: 2 }}>
          <LinearProgress sx={{ borderRadius: 1, mb: 1 }} aria-label="Loading aisles" />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Loading aisle map…
          </Typography>
        </Box>
      ) : aisles.length === 0 ? (
        <Card sx={{ borderRadius: 3, p: 3, textAlign: 'center' }}>
          <MapRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} aria-hidden />
          <Typography variant="h6" gutterBottom>
            No aisles yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 480, mx: 'auto' }}>
            Start by adding your first aisle code. You’ll pick the same code when you record stock under{' '}
            <strong>Manage stock</strong> so capacity limits apply automatically.
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)} sx={{ borderRadius: 2 }}>
            Add your first aisle
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {aisles.map((a) => {
            const full = a.usedSpace >= a.maxSpace
            const p = pct(a.usedSpace, a.maxSpace)
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={a._id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    border: '1px solid',
                    borderColor: full ? 'warning.main' : 'divider',
                    bgcolor: full ? 'action.hover' : 'background.paper',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={700} component="h2">
                          {a.code}
                        </Typography>
                        {a.label ? (
                          <Typography variant="body2" color="text.secondary">
                            {a.label}
                          </Typography>
                        ) : null}
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          <Chip size="small" label={`${p}% full`} color={full ? 'warning' : 'default'} variant={full ? 'filled' : 'outlined'} />
                          {full ? <Chip size="small" label="At capacity" color="warning" variant="outlined" /> : null}
                        </Stack>
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>
                        <Tooltip title="Change label, max units, or sort order">
                          <IconButton size="small" color="primary" onClick={() => openEdit(a)} aria-label={`Edit aisle ${a.code}`}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove aisle (only if no stock is stored here)">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(a)} aria-label={`Delete aisle ${a.code}`}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={p}
                        color={full ? 'warning' : 'primary'}
                        sx={{ height: 10, borderRadius: 1 }}
                        aria-valuenow={p}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${a.code}: ${p} percent capacity used`}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }} component="p">
                        <strong>{a.usedSpace}</strong> used · <strong>{a.availableSpace}</strong> free ·{' '}
                        <strong>{a.maxSpace}</strong> max units
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      <Dialog open={addOpen} onClose={() => !addSubmitting && setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add new aisle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Aisle code"
              required
              autoFocus
              value={addForm.code}
              onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value }))}
              helperText="Use letters, numbers, or dashes (e.g. A-1, RACK-02). Must match Rack / aisle when adding stock."
              placeholder="e.g. A-1"
              fullWidth
            />
            <TextField
              label="Display label (optional)"
              value={addForm.label}
              onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
              helperText="Shown in dropdowns; code is what enforces capacity."
              placeholder="e.g. North bay, Row A"
              fullWidth
            />
            <TextField
              label="Max units this aisle can hold"
              type="number"
              required
              inputProps={{ min: 1 }}
              value={addForm.maxSpace}
              onChange={(e) => setAddForm((f) => ({ ...f, maxSpace: e.target.value }))}
              helperText="Total quantity of inventory allowed in this zone."
              fullWidth
            />
           {/* <TextField
              label="Sort order"
              type="number"
              value={addForm.sortOrder}
              onChange={(e) => setAddForm((f) => ({ ...f, sortOrder: e.target.value }))}
              helperText="Lower numbers appear first on this page."
              fullWidth
            />*/}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={addSubmitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitAdd} disabled={addSubmitting}>
            {addSubmitting ? 'Saving…' : 'Save aisle'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => !editSubmitting && setEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Edit aisle {editTarget ? <strong>{editTarget.code}</strong> : ''}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Current stock in this aisle: <strong>{editTarget?.usedSpace ?? 0}</strong> units. Max capacity cannot go
              below that number.
            </Alert>
            <TextField
              label="Display label"
              value={editForm.label}
              onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Max units"
              type="number"
              required
              inputProps={{ min: editTarget ? Math.max(1, editTarget.usedSpace ?? 0) : 1 }}
              value={editForm.maxSpace}
              onChange={(e) => setEditForm((f) => ({ ...f, maxSpace: e.target.value }))}
              helperText={
                editTarget
                  ? `Minimum ${editTarget.usedSpace ?? 0} (stock already here)`
                  : undefined
              }
              fullWidth
            />
           {/*<TextField
              label="Sort order"
              type="number"
              value={editForm.sortOrder}
              onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
              helperText="Order on the map (smaller first)."
              fullWidth
            />*/}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)} disabled={editSubmitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitEdit} disabled={editSubmitting}>
            {editSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => !deleteSubmitting && setDeleteTarget(null)}>
        <DialogTitle>Delete this aisle?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove <strong>{deleteTarget?.code}</strong> from the map. This only works if no inventory is stored in this
            aisle—move or delete stock first if the server rejects the request.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={runDelete} disabled={deleteSubmitting}>
            {deleteSubmitting ? 'Deleting…' : 'Delete aisle'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  )
}
