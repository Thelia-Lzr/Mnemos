import {
    AdminPanelSettings,
    Assignment,
    Tune,
    Book,
    Chat,
    Dashboard,
    ExpandLess,
    ExpandMore,
    Home,
    Menu as MenuIcon,
    NavigateNext,
    Person,
    School,
    SportsEsports,
    TrendingUp
} from '@mui/icons-material';
import {
    AppBar,
    Avatar,
    Badge,
    Box,
    Breadcrumbs,
    Collapse,
    Divider,
    Drawer,
    IconButton,
    Link,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    alpha,
    useMediaQuery,
    useTheme
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { RootState } from '../../store/store';

const drawerWidth = 228;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  children?: MenuItem[];
}

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => { main.current?.scrollTo(0, 0); }, [location.pathname]);
  
  const profile = useSelector((state: RootState) => state.workspace.profile);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const menuItems: MenuItem[] = [
    { 
      text: '学习概览',
      icon: <Dashboard />, 
      path: '/',
    },
    { text: 'AI 对话', icon: <Chat />, path: '/chat', badge: 0 },
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
    { text: 'PK 对战', icon: <SportsEsports />, path: '/pk' },
    { text: '个人资料', icon: <Person />, path: '/profile' },
    { text: 'AI 配置', icon: <Tune />, path: '/ai-settings' },
    { text: '工作台管理', icon: <AdminPanelSettings />, path: '/admin' },
  ];

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: '首页', path: '/' }
    ];

    const pathMap: Record<string, string> = {
      'dashboard': '学习概览',
      'chat': 'AI 对话',
      'practice': '练习中心',
      'practice-history': '练习历史',
      'vocabulary': '生词表',
      'pk': 'PK 对战',
      'profile': '个人资料',
      'ai-settings': 'AI 配置',
      'admin': '工作台管理',
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
    const isActive = isItemActive(item.path);
    const childIsActive = item.children?.some((child) => isItemActive(child.path)) ?? false;
    const isExpanded = expandedItems[item.text] ?? childIsActive;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.text}>
        <ListItemButton
          {...(hasChildren
            ? { component: 'button', type: 'button' }
            : { component: RouterLink, to: item.path })}
          onClick={(event) => {
            if (hasChildren) {
              setExpandedItems((previous) => ({ ...previous, [item.text]: !isExpanded }));
            } else if (isMobile && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              setMobileOpen(false);
            }
          }}
          selected={!hasChildren && isActive}
          aria-current={!hasChildren && isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          sx={{
            pl: 1.5 + depth * 2, textAlign: 'start', width: 'calc(100% - 24px)', mx: 1.5, mb: 0.5, minHeight: 42,
            borderLeft: '3px solid transparent',
            '&.Mui-selected': { borderLeftColor: 'primary.main' },
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.07) },
          }}
        >
          <ListItemIcon sx={{ minWidth: 33, color: isActive ? 'primary.main' : 'text.secondary', '& svg': { fontSize: 18 } }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{ variant: 'body2', fontWeight: isActive ? 750 : 550 }}
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
    <Box component="nav" aria-label="主导航" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box aria-hidden="true" sx={{ width: 15, height: 15, bgcolor: 'currentColor', transform: 'rotate(45deg)', mr: 1.75 }} />
        <Typography variant="h5" component="span">Mnemos</Typography>
      </Toolbar>
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => renderMenuItem(item))}
      </List>
      <Box sx={{ mt: 'auto', borderTop: 1, borderColor: 'divider', p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 0.5,
              width: 32, 
              height: 32, 
              mr: 1 
            }}
          >
            {profile?.username?.charAt(0).toUpperCase() || 'M'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {profile?.username || '本地资料'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100dvh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
          height: { xs: 56, sm: 64 }
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            aria-label="打开导航"
            aria-expanded={mobileOpen}
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
              sx={{ display: { xs: 'block', sm: 'none' } }}
            >
              Mnemos
            </Typography>
            
            {/* Breadcrumbs - Hidden on mobile */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Breadcrumbs 
                separator={<NavigateNext fontSize="small" />}
                aria-label="当前位置"
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
                      component={RouterLink}
                      to={crumb.path || '/'}
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

        </Toolbar>
      </AppBar>
      
      <Box
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
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
        ref={main}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
          p: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
          minHeight: 0,
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
