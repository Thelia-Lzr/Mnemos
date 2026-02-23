"""
支付相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    """支付状态"""
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PaymentMethod(str, Enum):
    """支付方式"""
    ALIPAY = "alipay"
    WECHAT_PAY = "wechat_pay"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"


class RechargePackageResponse(BaseModel):
    """充值套餐响应"""
    id: str
    name: str
    description: Optional[str] = None
    priceInCents: int
    currency: str
    creditAmount: int
    bonusCredits: int
    isActive: bool
    isPopular: bool
    displayOrder: int
    originalPrice: Optional[int] = None
    discountPercentage: Optional[int] = None

    class Config:
        from_attributes = True


class PaymentOrderCreate(BaseModel):
    """支付订单创建"""
    packageId: str
    paymentMethod: Optional[PaymentMethod] = None


class PaymentOrderResponse(BaseModel):
    """支付订单响应"""
    id: str
    userId: str
    packageId: str
    amount: int
    currency: str
    creditAmount: int
    paymentMethod: Optional[str] = None
    paymentGateway: Optional[str] = None
    gatewayOrderId: Optional[str] = None
    status: PaymentStatus
    paidAt: Optional[datetime] = None
    expiredAt: Optional[datetime] = None
    failureReason: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True


class PaymentConfirmRequest(BaseModel):
    """支付确认请求"""
    orderId: str
    paymentMethod: PaymentMethod


class PaymentMethodResponse(BaseModel):
    """支付方式响应"""
    id: str
    name: str
    description: str
    icon: str
    enabled: bool
    processingTime: str


class CreditBalanceResponse(BaseModel):
    """积分余额响应"""
    userId: str
    balance: int
    totalEarned: int
    totalSpent: int
    lastUpdated: Optional[datetime] = None


class CreditTransactionResponse(BaseModel):
    """积分交易响应"""
    id: str
    userId: str
    amount: int
    balanceAfter: int
    transactionType: str
    description: Optional[str] = None
    referenceId: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True


class CreditAdjustRequest(BaseModel):
    """积分调整请求"""
    amount: int = Field(..., description="调整数量，正数增加，负数减少")
    description: str = Field(..., min_length=1)


class TransactionHistoryResponse(BaseModel):
    """交易历史响应"""
    success: bool
    data: List[CreditTransactionResponse]
    pagination: dict


class PaymentStatsResponse(BaseModel):
    """支付统计响应"""
    totalRevenue: int
    totalOrders: int
    completedOrders: int
    pendingOrders: int
    failedOrders: int
    averageOrderValue: float
    conversionRate: float
