import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Avatar,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  AccountBalance as BankIcon,
  CreditCard as CreditCardIcon,
  Payment as PaymentIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';

const PaymentMethodCard = styled(Card)<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: selected 
      ? `2px solid ${theme.palette.primary.main}` 
      : `1px solid ${theme.palette.divider}`,
    '&:hover': {
      borderColor: theme.palette.primary.main,
      boxShadow: theme.shadows[2],
    },
  })
);

interface PaymentMethodInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  isRecommended?: boolean;
  processingTime?: string;
}

const paymentMethodsInfo: Record<string, PaymentMethodInfo> = {
  alipay: {
    id: 'alipay',
    name: '支付宝',
    description: '使用支付宝扫码支付',
    icon: <QrCodeIcon />,
    color: '#1677FF',
    isRecommended: true,
    processingTime: '即时到账',
  },
  wechat: {
    id: 'wechat',
    name: '微信支付',
    description: '使用微信扫码支付',
    icon: <QrCodeIcon />,
    color: '#07C160',
    processingTime: '即时到账',
  },
  credit_card: {
    id: 'credit_card',
    name: '信用卡',
    description: '支持Visa、MasterCard等',
    icon: <CreditCardIcon />,
    color: '#FF6B35',
    processingTime: '1-3分钟',
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    description: '国际支付，支持多种货币',
    icon: <PaymentIcon />,
    color: '#0070BA',
    processingTime: '即时到账',
  },
};

interface PaymentMethodSelectorProps {
  availableMethods: string[];
  selectedMethod: string | null;
  onMethodSelect: (method: string) => void;
  disabled?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  availableMethods,
  selectedMethod,
  onMethodSelect,
  disabled = false,
}) => {
  const handleMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onMethodSelect(event.target.value);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        选择支付方式
      </Typography>

      <FormControl component="fieldset" fullWidth disabled={disabled}>
        <RadioGroup
          value={selectedMethod || ''}
          onChange={handleMethodChange}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {availableMethods.map((methodId) => {
              const methodInfo = paymentMethodsInfo[methodId];
              if (!methodInfo) return null;

              const isSelected = selectedMethod === methodId;

              return (
                <PaymentMethodCard
                  key={methodId}
                  selected={isSelected}
                  onClick={() => !disabled && onMethodSelect(methodId)}
                >
                  <CardContent sx={{ py: 2 }}>
                    <FormControlLabel
                      value={methodId}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Avatar
                            sx={{
                              bgcolor: methodInfo.color,
                              width: 40,
                              height: 40,
                            }}
                          >
                            {methodInfo.icon}
                          </Avatar>
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {methodInfo.name}
                              </Typography>
                              {methodInfo.isRecommended && (
                                <Chip
                                  label="推荐"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary">
                              {methodInfo.description}
                            </Typography>
                            
                            {methodInfo.processingTime && (
                              <Typography variant="caption" color="text.secondary">
                                到账时间: {methodInfo.processingTime}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                      sx={{ 
                        margin: 0,
                        width: '100%',
                        '& .MuiFormControlLabel-label': {
                          width: '100%',
                        },
                      }}
                    />
                  </CardContent>
                </PaymentMethodCard>
              );
            })}
          </Box>
        </RadioGroup>
      </FormControl>

      {availableMethods.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            暂无可用的支付方式
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PaymentMethodSelector;