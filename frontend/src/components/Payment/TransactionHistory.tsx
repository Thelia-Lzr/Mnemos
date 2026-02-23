import {
    AdminPanelSettings as AdminIcon,
    Chat as ChatIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    SportsEsports as PKIcon,
    Quiz as PracticeIcon,
    ShoppingCart as PurchaseIcon,
    Receipt as ReceiptIcon,
    Undo as RefundIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Collapse,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import { PaymentOrder, TransactionHistory as TransactionHistoryType } from '../../services/paymentApi';

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'purchase':
      return <PurchaseIcon color="success" />;
    case 'chat':
      return <ChatIcon color="primary" />;
    case 'practice':
      return <PracticeIcon color="info" />;
    case 'pk_entry':
      return <PKIcon color="warning" />;
    case 'pk_reward':
      return <PKIcon color="success" />;
    case 'refund':
      return <RefundIcon color="error" />;
    case 'admin_adjust':
      return <AdminIcon color="secondary" />;
    default:
      return <ReceiptIcon />;
  }
};

const getTransactionColor = (type: string, amount: number) => {
  if (amount > 0) return 'success';
  if (type === 'purchase') return 'success';
  if (type === 'pk_reward') return 'success';
  return 'error';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'processing':
      return 'info';
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'error';
    default:
      return 'default';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface TransactionHistoryProps {
  transactions: TransactionHistoryType;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading = false,
  onLoadMore,
  hasMore = false,
}) => {
  const orders = Array.isArray(transactions?.orders) ? transactions.orders : [];
  const creditTransactions = Array.isArray(transactions?.creditTransactions)
    ? transactions.creditTransactions
    : [];

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    orders: false,
    credits: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderOrderItem = (order: PaymentOrder) => (
    <ListItem key={order.id} sx={{ px: 0 }}>
      <ListItemIcon>
        <PurchaseIcon color="primary" />
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" fontWeight="bold">
              充值订单
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="success.main" fontWeight="bold">
                +{order.creditAmount} Credits
              </Typography>
              <Chip
                label={order.status === 'completed' ? '已完成' : 
                      order.status === 'pending' ? '待支付' :
                      order.status === 'processing' ? '处理中' :
                      order.status === 'failed' ? '失败' : order.status}
                size="small"
                color={getStatusColor(order.status)}
              />
            </Box>
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="caption" color="text.secondary">
              {formatDate(order.createdAt)} • ¥{(order.amount / 100).toFixed(2)}
            </Typography>
            {order.paymentMethod && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                • {order.paymentMethod}
              </Typography>
            )}
          </Box>
        }
      />
    </ListItem>
  );

  const renderCreditTransaction = (transaction: any) => (
    <ListItem key={transaction.id} sx={{ px: 0 }}>
      <ListItemIcon>
        {getTransactionIcon(transaction.type)}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              {transaction.description || '消费记录'}
            </Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={`${getTransactionColor(transaction.type, transaction.amount)}.main`}
            >
              {transaction.amount > 0 ? '+' : ''}{transaction.amount} Credits
            </Typography>
          </Box>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {formatDate(transaction.createdAt)}
            {transaction.relatedService && ` • ${transaction.relatedService}`}
          </Typography>
        }
      />
    </ListItem>
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          交易记录
        </Typography>

        {/* Payment Orders Section */}
        <Box sx={{ mb: 2 }}>
          <Button
            onClick={() => toggleSection('orders')}
            startIcon={expandedSections.orders ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ justifyContent: 'flex-start', textTransform: 'none', p: 1 }}
          >
            <Typography variant="subtitle2">
              充值订单 ({orders.length})
            </Typography>
          </Button>
          
          <Collapse in={expandedSections.orders}>
            <List dense>
              {orders.length > 0 ? (
                orders.map(renderOrderItem)
              ) : (
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        暂无充值记录
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </Box>

        <Divider />

        {/* Credit Transactions Section */}
        <Box sx={{ mt: 2 }}>
          <Button
            onClick={() => toggleSection('credits')}
            startIcon={expandedSections.credits ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ justifyContent: 'flex-start', textTransform: 'none', p: 1 }}
          >
            <Typography variant="subtitle2">
              Credit消费 ({creditTransactions.length})
            </Typography>
          </Button>
          
          <Collapse in={expandedSections.credits}>
            <List dense>
              {creditTransactions.length > 0 ? (
                creditTransactions.map(renderCreditTransaction)
              ) : (
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        暂无消费记录
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </Box>

        {hasMore && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="outlined"
              size="small"
            >
              {loading ? '加载中...' : '加载更多'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;