import { Box, Typography } from '@mui/material'

/**
 * Page chrome for MUI inventory screens. BuildForge already has the app sidebar;
 * this only provides title band + content area (no second sidebar).
 */
export default function DashboardLayout({ title, subtitle, children }) {
  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom={Boolean(subtitle)}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, pb: 4 }}>{children}</Box>
    </Box>
  )
}
