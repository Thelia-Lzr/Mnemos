import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

const BalanceCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  color: theme.palette.primary.contrastText,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
}));

interface CreditBalanceProps {
  balance: number;
  loading?: boolean;
  onRecharge?: () => void;
  showRechargeButton?: boolean;
  recentSpending?: number;
  monthlyLimit?: number;
}

const CreditBalance: React.FC<CreditBalanceProps> = ({
  balance,
  loading = false,
  onRecharge,
  showRechargeButton = true,
  recentSpending = 0,
  monthlyLimit = 1000,
}) => {
  const spendingPercentage = monthlyLimit > 0 ? (recentSpending / monthlyLimit) * 100 : 0;
  const isLowBalance = balance < 50;
  const isVeryLowBalance = balance < 20;

  return (
    <BalanceCard>
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WalletIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold">
            我的余额
          </Typography>
          {isVeryLowBalance && (
            <Chip
              label="余额不足"
              color="error"
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
          {isLowBalance && !isVeryLowBalance && (
            <Chip
              label="余额较低"
              color="warning"
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
            {loading ? '...' : balance.toLocaleString()}
            <Typography component="span" variant="h5" sx={{ ml: 1, opacity: 0.8 }}>
              Credits
            </Typography>
          </Typography>
          
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            可用于AI对话、练习生成、PK对战等功能
          </Typography>
        </Box>

        {recentSpending > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                本月消费
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {recentSpending} / {monthlyLimit} Credits
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(spendingPercentage, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: spendingPercentage > 80 ? '#ff9800' : '#4caf50',
                },
              }}
            />
          </Box>
        )}

        {showRechargeButton && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={onRecharge}
              sx={{
                flexGrow: 1,
                fontWeight: 'bold',
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 1)',
                },
              }}
            >
              立即充值
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              sx={{
                minWidth: 'auto',
                px: 2,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                color: 'inherit',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <TrendingUpIcon fontSize="small" />
            </Button>
          </Box>
        )}
      </CardContent>
    </BalanceCard>
  );
};

export default CreditBalance;