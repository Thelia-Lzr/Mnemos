import { Alert, Box, FormControl, InputLabel, MenuItem, Select, Tab, Tabs, Typography } from '@mui/material';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PKBattleHistory from '../components/PK/PKBattleHistory';
import PKLeaderboard from '../components/PK/PKLeaderboard';

const PKArenaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [language, setLanguage] = useState('en');

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Typography variant="h4" component="h1">PK 对战</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="pk-language">语言</InputLabel>
          <Select labelId="pk-language" label="语言" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <MenuItem value="en">英语</MenuItem>
            <MenuItem value="ja">日语</MenuItem>
            <MenuItem value="fr">法语</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        本地工作台可查看过往对战记录。要继续学习，可以前往<Link to="/practice">练习题库</Link>。
      </Alert>
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} aria-label="对战记录" sx={{ mb: 2 }}>
        <Tab label="对战历史" id="pk-history" aria-controls="pk-history-panel" />
        <Tab label="排行榜" id="pk-ranking" aria-controls="pk-ranking-panel" />
      </Tabs>
      <Box role="tabpanel" id="pk-history-panel" aria-labelledby="pk-history" hidden={activeTab !== 0}>
        {activeTab === 0 && <PKBattleHistory language={language} />}
      </Box>
      <Box role="tabpanel" id="pk-ranking-panel" aria-labelledby="pk-ranking" hidden={activeTab !== 1}>
        {activeTab === 1 && <PKLeaderboard language={language} />}
      </Box>
    </Box>
  );
};

export default PKArenaPage;
