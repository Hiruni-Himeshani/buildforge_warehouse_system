import { useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Button, Stack } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import DashboardLayout from '../components/layout/DashboardLayout'
import EquipmentList from '../components/equipment/EquipmentList'
import AddEquipment from '../components/equipment/AddEquipment'
import EditEquipment from '../components/equipment/EditEquipment'
import { downloadEquipmentStockPdf } from '../components/equipment/downloadEquipmentStockPdf'

export default function EquipmentPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pdfExporting, setPdfExporting] = useState(false)

  const refreshList = useCallback(() => setReloadKey((k) => k + 1), [])

  const handleEdit = useCallback((row) => {
    setEditing(row)
    setEditOpen(true)
  }, [])
  
  // backend pdf api: GET /api/equipment/pdf-stock
  const handleDownloadStockPdf = useCallback(async () => {
    setPdfExporting(true)
    try {
      const res = await axios.get('http://localhost:5001/api/equipment')
      const list = res.data.equipment || []
      downloadEquipmentStockPdf(list)
      toast.success(
        list.length === 0
          ? 'No rows to include — an empty report was generated.'
          : 'Stock details PDF downloaded.',
      )
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Could not load inventory for export.')
    } finally {
      setPdfExporting(false)
    }
  }, [])

  return (
    <DashboardLayout title="Manage Stock">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="flex-end"
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        <Button
          type="button"
          variant="outlined"
          size="large"
          startIcon={<PictureAsPdfOutlinedIcon />}
          onClick={handleDownloadStockPdf}
          disabled={pdfExporting}
          sx={{ borderRadius: 2 }}
        >
          {pdfExporting ? 'Preparing PDF…' : 'Download PDF'}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Add Equipment
        </Button>
      </Stack>

      <EquipmentList
        reloadKey={reloadKey}
        onEdit={handleEdit}
        onRefresh={refreshList}
        onRequestAdd={() => setAddOpen(true)}
      />

      <AddEquipment
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(msg) => {
          refreshList()
          toast.success(msg)
        }}
      />

      <EditEquipment
        open={editOpen}
        equipment={editing}
        onClose={() => {
          setEditOpen(false)
          setEditing(null)
        }}
        onSuccess={(msg) => {
          refreshList()
          toast.success(msg)
        }}
      />
    </DashboardLayout>
  )
}
