import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import PKMatchingInterface from '../components/PK/PKMatchingInterface';
import PKBattleInterface from '../components/PK/PKBattleInterface';
import PKLeaderboard from '../components/PK/PKLeaderboard';
import PKBattleHistory from '../components/PK/PKBattleHistory';
import api from '../services/api';

const PKArenaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [userCredit, setUserCredit] = useState<number>(0);

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // 获取用户Credit余额
    fetchUserCredit();
  }, []);

  const fetchUserCredit = async () => {
    try {
      const response = await api.get('/payment/credits');
      const payload = response.data?.data ?? response.data;
      const balance = payload?.currentBalance ?? payload?.balance ?? 0;
      setUserCredit(Number.isFinite(balance) ? balance : 0);
    } catch (error) {
      setUserCredit(0);
    }
  };

  const handleMatchFound = (battleId: string) => {
    setCurrentBattleId(battleId);
    setActiveTab(1); // 切换到对战界面
  };

  const handleBattleEnd = () => {
    setCurrentBattleId(null);
    setActiveTab(0); // 返回匹配界面
    fetchUserCredit(); // 刷新Credit余额
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // 如果正在对战中，不允许切换标签
    if (currentBattleId && newValue !== 1) {
      return;
    }
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          PK对战竞技场
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Credits余额: {userCredit}
          </Typography>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>语言</InputLabel>
            <Select
              value={selectedLanguage}
              label="语言"
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={currentBattleId !== null}
            >
              <MenuItem value="en">英语</MenuItem>
              <MenuItem value="ja">日语</MenuItem>
              <MenuItem value="fr">法语</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {userCredit < 2 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          您的Credits余额不足，无法参与PK对战。每场对战需要2个Credits作为参与费。
          <Typography component="span" sx={{ ml: 1 }}>
            <a href="/recharge" style={{ color: 'inherit' }}>立即充值</a>
          </Typography>
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab label="匹配对战" disabled={currentBattleId !== null} />
          <Tab label="对战中" disabled={currentBattleId === null} />
          <Tab label="排行榜" disabled={currentBattleId !== null} />
          <Tab label="对战历史" disabled={currentBattleId !== null} />
        </Tabs>
      </Paper>

      {activeTab === 0 && !currentBattleId && (
        <PKMatchingInterface
          language={selectedLanguage}
          onMatchFound={handleMatchFound}
        />
      )}

      {activeTab === 1 && currentBattleId && (
        <PKBattleInterface
          battleId={currentBattleId}
          onBattleEnd={handleBattleEnd}
        />
      )}

      {activeTab === 2 && !currentBattleId && (
        <PKLeaderboard language={selectedLanguage} />
      )}

      {activeTab === 3 && !currentBattleId && (
        <PKBattleHistory language={selectedLanguage} />
      )}
    </Box>
  );
};

export default PKArenaPage;