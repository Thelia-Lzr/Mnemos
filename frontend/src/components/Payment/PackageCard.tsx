import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { RechargePackage } from '../../services/paymentApi';

const StyledCard = styled(Card)<{ isPopular?: boolean; isSelected?: boolean }>(
  ({ theme, isPopular, isSelected }) => ({
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: isSelected 
      ? `2px solid ${theme.palette.primary.main}` 
      : isPopular 
        ? `2px solid ${theme.palette.secondary.main}`
        : `1px solid ${theme.palette.divider}`,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
    ...(isPopular && {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
      },
    }),
  })
);

const PriceBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2, 0),
}));

const OriginalPrice = styled(Typography)(({ theme }) => ({
  textDecoration: 'line-through',
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

interface PackageCardProps {
  package: RechargePackage;
  isSelected?: boolean;
  onSelect: (pkg: RechargePackage) => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  package: pkg,
  isSelected = false,
  onSelect,
}) => {
  const formatPrice = (priceInCents: number) => {
    return `¥${(priceInCents / 100).toFixed(2)}`;
  };

  const totalCredits = pkg.creditAmount + pkg.bonusCredits;
  const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.priceInCents;
  const discountPercentage = hasDiscount 
    ? Math.round(((pkg.originalPrice! - pkg.priceInCents) / pkg.originalPrice!) * 100)
    : 0;

  return (
    <StyledCard
      isPopular={pkg.isPopular}
      isSelected={isSelected}
      onClick={() => onSelect(pkg)}
    >
      {pkg.isPopular && (
        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
          <Chip
            label="热门"
            color="secondary"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, pt: pkg.isPopular ? 4 : 2 }}>
        <Typography variant="h6" component="h3" gutterBottom fontWeight="bold">
          {pkg.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {pkg.description}
        </Typography>

        <PriceBox>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
            <Typography variant="h4" component="span" color="primary" fontWeight="bold">
              {formatPrice(pkg.priceInCents)}
            </Typography>
            {hasDiscount && (
              <OriginalPrice variant="body2">
                {formatPrice(pkg.originalPrice!)}
              </OriginalPrice>
            )}
          </Box>
          
          {hasDiscount && (
            <Chip
              label={`省${discountPercentage}%`}
              color="error"
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </PriceBox>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" color="primary" fontWeight="bold">
            {totalCredits} Credits
          </Typography>
          
          {pkg.bonusCredits > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                基础: {pkg.creditAmount} Credits
              </Typography>
              <Typography variant="body2" color="secondary" fontWeight="bold">
                赠送: +{pkg.bonusCredits} Credits
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            单价: ¥{((pkg.priceInCents / 100) / totalCredits).toFixed(3)}/Credit
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant={isSelected ? "contained" : "outlined"}
          color="primary"
          fullWidth
          size="large"
          sx={{ fontWeight: 'bold' }}
        >
          {isSelected ? '已选择' : '选择套餐'}
        </Button>
      </CardActions>
    </StyledCard>
  );
};

export default PackageCard;