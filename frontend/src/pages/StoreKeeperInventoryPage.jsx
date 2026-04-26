import { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Paper,
  Chip,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  filterAndSortEquipment,
  EQUIPMENT_SORT_OPTIONS,
  getEquipmentColumnFilterOptions,
  statusChipColor,
} from '../components/equipment/equipmentDisplayUtils'
import DashboardLayout from '../components/layout/DashboardLayout'

const LOW_STOCK_THRESHOLD = 5

const CHART_COLORS = [
  '#5c6bc0',
  '#26a69a',
  '#7e57c2',
  '#42a5f5',
  '#66bb6a',
  '#ffa726',
  '#ef5350',
  '#ab47bc',
  '#26c6da',
  '#78909c',
]

function truncateLabel(value, max = 14) {
  const s = String(value ?? '')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function StatHighlightCard({ icon, title, value, hint, loading }) {
  const theme = useTheme()
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        background: (t) =>
          `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${alpha(t.palette.secondary.main, 0.05)} 100%)`,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.3}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={96} height={40} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="h4" component="p" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.25 }}>
                {value}
              </Typography>
            )}
            {hint && !loading ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {hint}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, subtitle, children, minHeight = 300 }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
            {subtitle}
          </Typography>
        ) : (
          <Box sx={{ mb: 1 }} />
        )}
        <Box sx={{ flex: 1, minHeight, width: '100%' }}>{children}</Box>
      </CardContent>
    </Card>
  )
}

/**
 * Stock overview for Store Keeper. GET /api/equipment (proxy → API).
 * Search + sort match Manage stock (EquipmentList).
 */
export default function StoreKeeperInventoryPage() {
  const theme = useTheme()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const authHeaders = useCallback(() => {
    const headers = {}
    const token = localStorage.getItem('token')
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/equipment', { headers: authHeaders() })
      setRows(data.equipment || [])
    } catch (err) {
      console.error(err)
      setRows([])
      toast.error(err.response?.data?.message || 'Could not load equipment. Is the API running?')
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    load()
  }, [load])

  const { statusValues, locationValues } = useMemo(() => getEquipmentColumnFilterOptions(rows), [rows])

  const displayRows = useMemo(
    () =>
      filterAndSortEquipment(rows, searchQuery, sortField, sortDir, {
        status: statusFilter,
        location: locationFilter,
      }),
    [rows, searchQuery, sortField, sortDir, statusFilter, locationFilter],
  )

  const chartStats = useMemo(() => {
    const byCategory = {}
    const byStatus = {}
    const byLocation = {}
    let totalQty = 0
    let lowStockSkus = 0

    for (const row of displayRows) {
      const q = Number(row.quantity) || 0
      totalQty += q
      if (q > 0 && q <= LOW_STOCK_THRESHOLD) lowStockSkus += 1

      const cat = (row.category && String(row.category).trim()) || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + q

      const st = (row.status && String(row.status).trim()) || 'Unknown'
      byStatus[st] = (byStatus[st] || 0) + q

      const loc = (row.location && String(row.location).trim()) || 'Unassigned'
      byLocation[loc] = (byLocation[loc] || 0) + q
    }

    const categoryData = Object.entries(byCategory)
      .map(([name, value]) => ({ name: truncateLabel(name, 18), fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const statusData = Object.entries(byStatus)
      .map(([name, value]) => ({ name: truncateLabel(name, 16), fullName: name, value }))
      .sort((a, b) => b.value - a.value)

    const locationData = Object.entries(byLocation)
      .map(([name, value]) => ({ name: truncateLabel(name, 20), fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    return {
      totalQty,
      lowStockSkus,
      skuCount: displayRows.length,
      categoryData,
      statusData,
      locationData,
    }
  }, [displayRows])

  const hasFilter = searchQuery.trim().length > 0 || Boolean(statusFilter) || Boolean(locationFilter)
  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setLocationFilter('')
  }
  const countLabel = hasFilter
    ? `${displayRows.length} of ${rows.length} line${rows.length === 1 ? '' : 's'}`
    : `${rows.length} line${rows.length === 1 ? '' : 's'}`

  const locationChartHeight = Math.max(220, chartStats.locationData.length * 36)

  const chartTooltipStyles = {
    contentStyle: {
      borderRadius: 8,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: theme.shadows[2],
    },
    labelStyle: { fontWeight: 600 },
  }

  return (
    <DashboardLayout
      title="Inventory Dashboard"
    >
      {loading ? <LinearProgress sx={{ mb: 2, borderRadius: 1 }} /> : <Box sx={{ height: 4, mb: 2 }} />}

      {!loading && rows.length === 0 ? (
        <Card sx={{ borderRadius: 2, p: 4, textAlign: 'center', border: 1, borderColor: 'divider' }}>
          <Typography color="text.secondary">No equipment records returned.</Typography>
          <Button sx={{ mt: 2 }} variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={load}>
            Retry
          </Button>
        </Card>
      ) : null}

      {loading && rows.length === 0 ? (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            {[0, 1, 2, 3].map((k) => (
              <Grid key={k} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Skeleton variant="rounded" height={112} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
        </Stack>
      ) : null}

      {rows.length > 0 ? (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatHighlightCard
                icon={<Inventory2RoundedIcon />}
                title="SKU lines"
                value={chartStats.skuCount.toLocaleString()}
                hint={hasFilter ? 'After current filters' : 'Distinct items in view'}
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatHighlightCard
                icon={<CategoryRoundedIcon />}
                title="Total quantity"
                value={chartStats.totalQty.toLocaleString()}
                hint="Sum of on-hand units"
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatHighlightCard
                icon={<PlaceRoundedIcon />}
                title="Locations"
                value={new Set(displayRows.map((r) => (r.location || '').trim()).filter(Boolean)).size.toLocaleString()}
                hint="Unique rack / aisle codes"
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatHighlightCard
                icon={<WarningAmberRoundedIcon />}
                title="Low stock"
                value={chartStats.lowStockSkus.toLocaleString()}
                hint={`≤ ${LOW_STOCK_THRESHOLD} units (qty > 0)`}
                loading={loading}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <ChartCard
                title="Quantity by category"
                subtitle="Top categories by on-hand units (matches filters below)."
                minHeight={300}
              >
                {loading ? (
                  <Skeleton variant="rounded" height={280} sx={{ borderRadius: 1 }} />
                ) : chartStats.categoryData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                    <Typography color="text.secondary">No data for the current filters.</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartStats.categoryData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.9)} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip
                        {...chartTooltipStyles}
                        formatter={(v) => [Number(v).toLocaleString(), 'Qty']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                      />
                      <Bar dataKey="value" name="Quantity" radius={[6, 6, 0, 0]} fill={theme.palette.primary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <ChartCard title="Stock by status" subtitle="Share of quantity across status values." minHeight={300}>
                {loading ? (
                  <Skeleton variant="rounded" height={280} sx={{ borderRadius: 1 }} />
                ) : chartStats.statusData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                    <Typography color="text.secondary">No data for the current filters.</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={chartStats.statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {chartStats.statusData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: 12, color: theme.palette.text.secondary }}
                        formatter={(_, entry) => entry.payload.fullName}
                      />
                      <RechartsTooltip
                        {...chartTooltipStyles}
                        formatter={(v) => [Number(v).toLocaleString(), 'Qty']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard
                title="Top locations"
                subtitle="Rack / aisle codes with the most on-hand units."
                minHeight={locationChartHeight}
              >
                {loading ? (
                  <Skeleton variant="rounded" height={locationChartHeight} sx={{ borderRadius: 1 }} />
                ) : chartStats.locationData.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: Math.max(200, locationChartHeight),
                    }}
                  >
                    <Typography color="text.secondary">No location data for the current filters.</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={locationChartHeight}>
                    <BarChart
                      layout="vertical"
                      data={chartStats.locationData}
                      margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={alpha(theme.palette.divider, 0.9)} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        {...chartTooltipStyles}
                        formatter={(v) => [Number(v).toLocaleString(), 'Qty']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                      />
                      <Bar dataKey="value" name="Quantity" radius={[0, 6, 6, 0]} fill={theme.palette.secondary.main} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </Grid>
          </Grid>

          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} letterSpacing={0.5}>
              FILTER &amp; TABLE
            </Typography>
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
                      <IconButton size="small" aria-label="Clear search" onClick={() => setSearchQuery('')} edge="end">
                        <ClearRoundedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="sk-inv-filter-status-label">Status</InputLabel>
                <Select
                  labelId="sk-inv-filter-status-label"
                  id="sk-inv-filter-status"
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
                <InputLabel id="sk-inv-filter-loc-label">Rack / aisle</InputLabel>
                <Select
                  labelId="sk-inv-filter-loc-label"
                  id="sk-inv-filter-loc"
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
                <Button type="button" size="small" variant="text" onClick={clearAllFilters} sx={{ alignSelf: 'center' }}>
                  Clear filters
                </Button>
              ) : null}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="sk-inv-sort-label">Sort by</InputLabel>
                <Select
                  labelId="sk-inv-sort-label"
                  id="sk-inv-sort"
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
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} justifyContent="space-between">
              <Chip label={countLabel} variant="outlined" size="small" color={hasFilter ? 'primary' : 'default'} />
              <Button variant="contained" color="secondary" size="small" startIcon={<RefreshRoundedIcon />} onClick={load}>
                Refresh data
              </Button>
            </Stack>
          </Stack>

          {hasFilter && displayRows.length === 0 ? (
            <Card sx={{ borderRadius: 2, p: 3, textAlign: 'center', border: 1, borderColor: 'divider' }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                No items match the current filters.
              </Typography>
              <Button type="button" size="small" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </Card>
          ) : (
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <TableContainer component={Paper} elevation={0} sx={{ border: 0 }}>
                <Table size="small" stickyHeader aria-label="Inventory dashboard table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Item ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                        Qty
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayRows.map((row) => (
                      <TableRow key={row._id} hover sx={{ '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.itemId || '—'}</TableCell>
                        <TableCell>{row.category || '—'}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={
                              Number(row.quantity) > 0 && Number(row.quantity) <= LOW_STOCK_THRESHOLD
                                ? 'warning.main'
                                : 'text.primary'
                            }
                          >
                            {row.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.location || '—'}</TableCell>
                        <TableCell>
                          {row.status ? (
                            <Chip size="small" label={row.status} color={statusChipColor(row.status)} variant="outlined" />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      ) : null}
    </DashboardLayout>
  )
}
