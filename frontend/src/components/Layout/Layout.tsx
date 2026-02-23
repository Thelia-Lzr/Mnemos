import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItemIcon, 
  ListItemText,
  Breadcrumbs,
  Link,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  Collapse,
  ListItemButton,
  Chip,
  alpha
} from '@mui/material';
import { 
  Dashboard, 
  Chat, 
  School, 
  Book, 
  SportsEsports, 
  Person, 
  Payment, 
  AdminPanelSettings,
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Logout,
  Settings,
  NavigateNext,
  Home,
  ExpandLess,
  ExpandMore,
  Assignment,
  TrendingUp
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { logout } from '../../store/slices/authSlice';

const drawerWidth = 260;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  children?: MenuItem[];
  adminOnly?: boolean;
}

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const menuItems: MenuItem[] = [
    { 
      text: '仪表板', 
      icon: <Dashboard />, 
      path: '/',
      children: [
        { text: '学习概览', icon: <TrendingUp />, path: '/dashboard' }
      ]
    },
    { text: 'AI助手', icon: <Chat />, path: '/chat', badge: 0 },
    { 
      text: '学习中心', 
      icon: <School />, 
      path: '/practice',
      children: [
        { text: '练习题库', icon: <Assignment />, path: '/practice' },
        { text: '练习历史', icon: <Assignment />, path: '/practice-history' },
        { text: '能力评估', icon: <TrendingUp />, path: '/assessment' }
      ]
    },
    { text: '生词表', icon: <Book />, path: '/vocabulary' },
    { text: 'PK对战', icon: <SportsEsports />, path: '/pk' },
    { text: '个人资料', icon: <Person />, path: '/profile' },
    { text: '充值中心', icon: <Payment />, path: '/recharge' },
    { text: '管理员', icon: <AdminPanelSettings />, path: '/admin', adminOnly: true },
  ];

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: '首页', path: '/' }
    ];

    const pathMap: Record<string, string> = {
      'dashboard': '仪表板',
      'chat': 'AI助手',
      'practice': '练习中心',
      'practice-history': '练习历史',
      'vocabulary': '生词表',
      'pk': 'PK对战',
      'profile': '个人资料',
      'recharge': '充值中心',
      'admin': '管理员',
      'assessment': '能力评估'
    };

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = pathMap[segment] || segment;
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleMenuClose();
    navigate('/auth');
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      const isExpanded = expandedItems.includes(item.text);
      if (isExpanded) {
        setExpandedItems(expandedItems.filter(text => text !== item.text));
      } else {
        setExpandedItems([...expandedItems, item.text]);
      }
    } else {
      navigate(item.path);
      if (isMobile) {
        setMobileOpen(false);
      }
    }
  };

  // Touch gesture handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && mobileOpen) {
      setMobileOpen(false);
    }
    if (isRightSwipe && !mobileOpen) {
      setMobileOpen(true);
    }
  };

  const isItemActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    
    // Special handling for practice routes to avoid conflicts
    if (path === '/practice') {
      return location.pathname === '/practice' || location.pathname.startsWith('/practice/');
    }
    if (path === '/practice-history') {
      return location.pathname === '/practice-history' || location.pathname.startsWith('/practice-history/');
    }
    
    // For other paths, use exact match or path with trailing slash/segments
    if (location.pathname === path) {
      return true;
    }
    
    // Check if current path starts with the menu path followed by a slash
    return location.pathname.startsWith(path + '/');
  };

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    if (item.adminOnly && user?.role !== 'admin') {
      return null;
    }

    const isActive = isItemActive(item.path);
    const isExpanded = expandedItems.includes(item.text);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.text}>
        <ListItemButton
          onClick={() => handleItemClick(item)}
          sx={{
            pl: 2 + depth * 2,
            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            borderRight: isActive ? `3px solid ${theme.palette.primary.main}` : 'none',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }
          }}
        >
          <ListItemIcon sx={{ color: isActive ? theme.palette.primary.main : 'inherit' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.text}
            sx={{ color: isActive ? theme.palette.primary.main : 'inherit' }}
          />
          {item.badge !== undefined && item.badge > 0 && (
            <Badge badgeContent={item.badge} color="error" />
          )}
          {hasChildren && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItemButton>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar 
            sx={{ 
              bgcolor: theme.palette.primary.main, 
              width: 32, 
              height: 32, 
              mr: 1 
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" noWrap>
              {user?.username || '用户'}
            </Typography>
            <Chip 
              label={user?.role === 'admin' ? '管理员' : '学习者'}
              size="small"
              color={user?.role === 'admin' ? 'secondary' : 'primary'}
              sx={{ fontSize: '0.7rem', height: 16 }}
            />
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => renderMenuItem(item))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          height: { xs: 56, sm: 64 }
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                mb: { xs: 0, sm: 0.5 },
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}
            >
              AI语言学习助手
            </Typography>
            
            {/* Breadcrumbs - Hidden on mobile */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Breadcrumbs 
                separator={<NavigateNext fontSize="small" />}
                aria-label="breadcrumb"
                sx={{ fontSize: '0.875rem' }}
              >
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  
                  if (isLast) {
                    return (
                      <Typography 
                        key={crumb.label} 
                        color="text.primary" 
                        sx={{ fontSize: '0.875rem', fontWeight: 500 }}
                      >
                        {crumb.label}
                      </Typography>
                    );
                  }
                  
                  return (
                    <Link
                      key={crumb.label}
                      color="inherit"
                      href={crumb.path}
                      onClick={(e) => {
                        e.preventDefault();
                        if (crumb.path) navigate(crumb.path);
                      }}
                      sx={{ 
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {index === 0 ? <Home sx={{ fontSize: 16, mr: 0.5 }} /> : null}
                      {crumb.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              color="inherit"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <Badge badgeContent={0} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            
            <IconButton
              onClick={handleMenuClick}
              color="inherit"
              sx={{ ml: { xs: 0, sm: 1 } }}
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: {
                    minWidth: 200,
                    mt: 1
                  }
                }
              }}
            >
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">个人资料</Typography>
              </MenuItem>
              <MenuItem 
                onClick={() => { navigate('/settings'); handleMenuClose(); }}
                sx={{ display: { xs: 'flex', sm: 'none' } }}
              >
                <ListItemIcon>
                  <Notifications fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">通知</Typography>
              </MenuItem>
              <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">设置</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">退出登录</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              bgcolor: 'background.paper'
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              bgcolor: 'background.paper',
              borderRight: `1px solid ${theme.palette.divider}`
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          overflow: 'auto',
          position: 'relative'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;