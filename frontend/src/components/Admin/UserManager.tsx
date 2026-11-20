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
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string;
}

interface UserDetails {
  user: User;
  capabilities: Array<{
    language: string;
    currentLevel: string;
    overallLevel: string;
    confidenceScore: number;
    listeningLevel: number;
    speakingLevel: number;
    readingLevel: number;
    writingLevel: number;
    lastAssessedAt: string;
  }>;
  practiceStats: {
    total_practices: number;
    average_accuracy: number;
    total_practice_time: number;
    last_practice_at: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 20
  });
  const [loading, setLoading] = useState(true);
  const page = pagination.currentPage;
  const limit = pagination.limit;
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // User details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  
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
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void fetchUsers(controller.signal); }, search ? 200 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, limit, search, sortBy, sortOrder]);

  const fetchUsers = async (signal: AbortSignal) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        sortBy,
        sortOrder
      });

      const response = await api.get(`/admin/users?${params}`, { signal });
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      if (!signal.aborted) showSnackbar('无法加载本地资料。', 'error');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      
      if (response.data.success) {
        setSelectedUser(response.data.data);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      showSnackbar('Failed to fetch user details', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPagination({ ...pagination, currentPage: 1 });
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setPagination({ ...pagination, currentPage: page });
  };

  if (loading) {
    return <Typography>Loading users...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        本地资料
      </Typography>

      {/* Search and Filter Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="搜索资料"
                inputProps={{ maxLength: 255 }}
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="created_at">Created Date</MenuItem>
                  <MenuItem value="username">Username</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="last_login_at">Last Login</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  label="Order"
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!users.length && <TableRow><TableCell colSpan={5}>未找到符合条件的资料</TableCell></TableRow>}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{user.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    color={user.role === 'admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => fetchUserDetails(user.id)} size="small" aria-label={`查看 ${user.username} 的资料`}>
                    <ViewIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      {/* 资料详情 Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>资料详情</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 1 }}>
              {/* Basic Info */}
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Username</Typography>
                  <Typography variant="body1">{selectedUser.user.username}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedUser.user.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                  <Typography variant="body1">{selectedUser.user.role}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Language Capabilities */}
              <Typography variant="h6" gutterBottom>Language Capabilities</Typography>
              {selectedUser.capabilities.map((cap, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {cap.language.toUpperCase()} - Level {cap.currentLevel}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Listening</Typography>
                        <Typography variant="body1">{typeof cap.listeningLevel === 'number' && cap.lastAssessedAt ? `${cap.listeningLevel}/100` : '—'}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Speaking</Typography>
                        <Typography variant="body1">{typeof cap.speakingLevel === 'number' && cap.lastAssessedAt ? `${cap.speakingLevel}/100` : '—'}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Reading</Typography>
                        <Typography variant="body1">{typeof cap.readingLevel === 'number' && cap.lastAssessedAt ? `${cap.readingLevel}/100` : '—'}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Writing</Typography>
                        <Typography variant="body1">{typeof cap.writingLevel === 'number' && cap.lastAssessedAt ? `${cap.writingLevel}/100` : '—'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}

              <Divider sx={{ my: 2 }} />

              {/* Practice Statistics */}
              <Typography variant="h6" gutterBottom>Practice Statistics</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Total Practices</Typography>
                  <Typography variant="body1">{selectedUser.practiceStats.total_practices}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Average Accuracy</Typography>
                  <Typography variant="body1">{Math.round(selectedUser.practiceStats.average_accuracy)}%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Total Time</Typography>
                  <Typography variant="body1">{Math.round(selectedUser.practiceStats.total_practice_time / 60000)} min</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Last Practice</Typography>
                  <Typography variant="body1">
                    {selectedUser.practiceStats.last_practice_at 
                      ? formatDate(selectedUser.practiceStats.last_practice_at)
                      : 'Never'
                    }
                  </Typography>
                </Grid>
              </Grid>

            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>关闭</Button>
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

export default UserManager;