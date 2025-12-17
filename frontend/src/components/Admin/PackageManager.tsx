import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar
} from '@mui/material';
import SecurityUtils from '../../utils/security';
import api from '../../services/api';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface RechargePackage {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  creditAmount: number;
  bonusCredits: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  originalPrice?: number;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

interface PackageSalesStats {
  packageId: string;
  packageName: string;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface PackageFormData {
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  creditAmount: number;
  bonusCredits: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  originalPrice?: number;
  discountPercentage?: number;
}

const PackageManager: React.FC = () => {
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [salesStats, setSalesStats] = useState<PackageSalesStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<RechargePackage | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    priceInCents: 0,
    currency: 'USD',
    creditAmount: 0,
    bonusCredits: 0,
    isActive: true,
    isPopular: false,
    displayOrder: 0
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await api.get('/admin/packages');
      
      if (response.data.success) {
        setPackages(response.data.data.packages);
        setSalesStats(response.data.data.salesStats);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      showSnackbar('Failed to fetch packages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      priceInCents: 0,
      currency: 'USD',
      creditAmount: 0,
      bonusCredits: 0,
      isActive: true,
      isPopular: false,
      displayOrder: packages ? packages.length : 0
    });
    setDialogOpen(true);
  };

  const handleEditPackage = (pkg: RechargePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      priceInCents: pkg.priceInCents,
      currency: pkg.currency,
      creditAmount: pkg.creditAmount,
      bonusCredits: pkg.bonusCredits,
      isActive: pkg.isActive,
      isPopular: pkg.isPopular,
      displayOrder: pkg.displayOrder,
      originalPrice: pkg.originalPrice,
      discountPercentage: pkg.discountPercentage
    });
    setDialogOpen(true);
  };

  const handleSavePackage = async () => {
    try {
      // Basic form validation
      if (!formData.name.trim()) {
        showSnackbar('Package name is required', 'error');
        return;
      }
      
      if (!formData.description.trim()) {
        showSnackbar('Package description is required', 'error');
        return;
      }
      
      if (formData.priceInCents <= 0) {
        showSnackbar('Price must be greater than 0', 'error');
        return;
      }
      
      if (formData.creditAmount <= 0) {
        showSnackbar('Credit amount must be greater than 0', 'error');
        return;
      }

      let response;
      
      if (editingPackage) {
        // Update existing package
        response = await api.put(`/admin/packages/${editingPackage.id}`, formData);
      } else {
        // Create new package
        response = await api.post('/admin/packages', formData);
      }

      if (response.data.success) {
        showSnackbar(
          editingPackage ? 'Package updated successfully' : 'Package created successfully',
          'success'
        );
        setDialogOpen(false);
        fetchPackages();
      } else {
        showSnackbar(response.data.message || 'Failed to save package', 'error');
      }
    } catch (error: any) {
      console.error('Failed to save package:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save package';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!window.confirm('Are you sure you want to delete this package?')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/packages/${packageId}`);

      if (response.data.success) {
        showSnackbar('Package deleted successfully', 'success');
        fetchPackages();
      } else {
        showSnackbar(response.data.message || 'Failed to delete package', 'error');
      }
    } catch (error: any) {
      console.error('Failed to delete package:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete package';
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatPrice = (priceInCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(priceInCents / 100);
  };

  const getSalesStatsForPackage = (packageId: string) => {
    return salesStats.find(stat => stat.packageId === packageId);
  };

  if (loading) {
    return <Typography>Loading packages...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Package Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePackage}
        >
          Create Package
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Credits</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sales</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.map((pkg) => {
              const stats = getSalesStatsForPackage(pkg.id);
              return (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{pkg.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pkg.description}
                      </Typography>
                      {pkg.isPopular && (
                        <Chip label="Popular" size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {formatPrice(pkg.priceInCents, pkg.currency)}
                    {pkg.originalPrice && (
                      <Typography variant="caption" sx={{ textDecoration: 'line-through', ml: 1 }}>
                        {formatPrice(pkg.originalPrice, pkg.currency)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {pkg.creditAmount}
                    {pkg.bonusCredits > 0 && (
                      <Typography variant="caption" color="primary">
                        {' '}+ {pkg.bonusCredits} bonus
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={pkg.isActive ? 'Active' : 'Inactive'}
                      color={pkg.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{stats?.totalSales || 0}</TableCell>
                  <TableCell>
                    {stats ? formatPrice(stats.totalRevenue, pkg.currency) : '$0.00'}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditPackage(pkg)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeletePackage(pkg.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Package Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPackage ? 'Edit Package' : 'Create New Package'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Package Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price (cents)"
                type="number"
                value={formData.priceInCents}
                onChange={(e) => setFormData({ ...formData, priceInCents: parseInt(e.target.value) || 0 })}
                required
              />
              <TextField
                label="Currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                select
                SelectProps={{ native: true }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Credit Amount"
                type="number"
                value={formData.creditAmount}
                onChange={(e) => setFormData({ ...formData, creditAmount: parseInt(e.target.value) || 0 })}
                required
              />
              <TextField
                label="Bonus Credits"
                type="number"
                value={formData.bonusCredits}
                onChange={(e) => setFormData({ ...formData, bonusCredits: parseInt(e.target.value) || 0 })}
              />
              <TextField
                label="Display Order"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Original Price (cents)"
                type="number"
                value={formData.originalPrice || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  originalPrice: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
              <TextField
                label="Discount %"
                type="number"
                value={formData.discountPercentage || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  discountPercentage: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  />
                }
                label="Popular"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePackage} variant="contained">
            {editingPackage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PackageManager;