import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as PackageIcon,
  Storage as QueueIcon,
  Monitor as MonitoringIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import SystemStats from '../components/Admin/SystemStats';
import UserManager from '../components/Admin/UserManager';
import PackageManager from '../components/Admin/PackageManager';
import TaskQueueManager from '../components/Admin/TaskQueueManager';
import SystemMonitoring from '../components/Admin/SystemMonitoring';
import OpenRouterConfig from '../components/Admin/OpenRouterConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        管理员控制台
      </Typography>
      
      <Paper sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="admin tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<DashboardIcon />} 
              label="系统统计" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<PeopleIcon />} 
              label="用户管理" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<PackageIcon />} 
              label="套餐管理" 
              {...a11yProps(2)} 
            />
            <Tab 
              icon={<QueueIcon />} 
              label="任务队列" 
              {...a11yProps(3)} 
            />
            <Tab 
              icon={<MonitoringIcon />} 
              label="系统监控" 
              {...a11yProps(4)} 
            />
            <Tab 
              icon={<ApiIcon />} 
              label="API配置" 
              {...a11yProps(5)} 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <SystemStats />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <UserManager />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <PackageManager />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <TaskQueueManager />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <SystemMonitoring />
        </TabPanel>
        
        <TabPanel value={tabValue} index={5}>
          <OpenRouterConfig />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AdminPage;