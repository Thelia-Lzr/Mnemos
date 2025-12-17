import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Divider,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchPackages,
  fetchPaymentMethods,
  fetchTransactions,
  createOrder,
  confirmPayment,
  setSelectedPackage,
  setSelectedPaymentMethod,
  clearCurrentOrder,
  clearError,
} from '../store/slices/paymentSlice';
import PackageCard from '../components/Payment/PackageCard';
import PaymentMethodSelector from '../components/Payment/PaymentMethodSelector';
import CreditBalance from '../components/Payment/CreditBalance';
import TransactionHistory from '../components/Payment/TransactionHistory';
import { RechargePackage } from '../services/paymentApi';

const steps = ['选择套餐', '选择支付方式', '确认支付'];

const RechargePage: React.FC = () => {
  const dispatch = useDispatch();
  const {
    packages,
    paymentMethods,
    creditBalance,
    transactions,
    currentOrder,
    selectedPackage,
    selectedPaymentMethod,
    loading,
    paymentInProgress,
    error,
  } = useSelector((state: RootState) => state.payment);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchPackages() as any);
    dispatch(fetchPaymentMethods() as any);
    dispatch(fetchTransactions() as any);
  }, [dispatch]);

  const handlePackageSelect = (pkg: RechargePackage) => {
    dispatch(setSelectedPackage(pkg));
    setDialogOpen(true);
    setActiveStep(0);
  };

  const handlePaymentMethodSelect = (method: string) => {
    dispatch(setSelectedPaymentMethod(method));
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Move to payment method selection
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Create order
      if (selectedPackage && selectedPaymentMethod) {
        try {
          const orderAction = await dispatch(createOrder({
            packageId: selectedPackage.id,
            paymentMethod: selectedPaymentMethod,
          }) as any);
          
          if (orderAction.type.endsWith('/fulfilled')) {
            setActiveStep(2);
          }
        } catch (error) {
          console.error('Failed to create order:', error);
        }
      }
    } else if (activeStep === 2) {
      // Confirm payment
      if (currentOrder && selectedPaymentMethod) {
        try {
          const paymentAction = await dispatch(confirmPayment({
            orderId: currentOrder.id,
            paymentMethod: selectedPaymentMethod,
          }) as any);
          
          if (paymentAction.type.endsWith('/fulfilled')) {
            const result = paymentAction.payload;
            if (result.success && result.paymentUrl) {
              setPaymentUrl(result.paymentUrl);
              // In a real app, you might redirect to the payment URL
              // window.open(result.paymentUrl, '_blank');
            }
          }
        } catch (error) {
          console.error('Payment failed:', error);
        }
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setActiveStep(0);
    setPaymentUrl(null);
    dispatch(clearCurrentOrder());
    dispatch(clearError());
  };

  const handleRechargeClick = () => {
    if (packages.length > 0) {
      // Auto-select the first package or most popular one
      const popularPackage = packages.find(pkg => pkg.isPopular) || packages[0];
      handlePackageSelect(popularPackage);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return selectedPackage !== null;
    if (activeStep === 1) return selectedPaymentMethod !== null;
    if (activeStep === 2) return currentOrder !== null;
    return false;
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              选择充值套餐
            </Typography>
            <Grid container spacing={2}>
              {packages.map((pkg) => (
                <Grid item xs={12} sm={6} md={4} key={pkg.id}>
                  <PackageCard
                    package={pkg}
                    isSelected={selectedPackage?.id === pkg.id}
                    onSelect={(pkg) => dispatch(setSelectedPackage(pkg))}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <PaymentMethodSelector
              availableMethods={paymentMethods}
              selectedMethod={selectedPaymentMethod}
              onMethodSelect={handlePaymentMethodSelect}
            />
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              确认支付信息
            </Typography>
            {selectedPackage && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {selectedPackage.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPackage.description}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Credits数量:</Typography>
                  <Typography fontWeight="bold">
                    {selectedPackage.creditAmount + selectedPackage.bonusCredits}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>支付金额:</Typography>
                  <Typography fontWeight="bold" color="primary">
                    ¥{(selectedPackage.priceInCents / 100).toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            )}
            
            {paymentUrl && (
              <Alert severity="info" sx={{ mt: 2 }}>
                支付链接已生成，请点击下方按钮前往支付页面
                <Button
                  variant="contained"
                  size="small"
                  sx={{ ml: 2 }}
                  onClick={() => window.open(paymentUrl, '_blank')}
                >
                  前往支付
                </Button>
              </Alert>
            )}
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        充值中心
      </Typography>

      <Grid container spacing={3}>
        {/* Credit Balance */}
        <Grid item xs={12} md={4}>
          <CreditBalance
            balance={creditBalance}
            loading={loading}
            onRecharge={handleRechargeClick}
          />
        </Grid>

        {/* Package Selection */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            选择充值套餐
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {packages.map((pkg) => (
                <Grid item xs={12} sm={6} lg={4} key={pkg.id}>
                  <PackageCard
                    package={pkg}
                    onSelect={handlePackageSelect}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        {/* Transaction History */}
        <Grid item xs={12}>
          {transactions && (
            <TransactionHistory
              transactions={transactions}
              loading={loading}
            />
          )}
        </Grid>
      </Grid>

      {/* Payment Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          充值流程
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}
          
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {getStepContent(activeStep)}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleDialogClose}>
            取消
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              上一步
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed() || loading || paymentInProgress}
          >
            {paymentInProgress ? (
              <CircularProgress size={20} />
            ) : activeStep === steps.length - 1 ? (
              '确认支付'
            ) : (
              '下一步'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RechargePage;