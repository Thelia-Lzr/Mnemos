"""
支付相关模型定义
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    Integer,
    Boolean,
    CheckConstraint,
    text,
    Index,
    DECIMAL,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class PaymentStatus(str):
    """支付状态"""
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PaymentOrder(Base, TimestampMixin):
    """支付订单"""

    __tablename__ = "payment_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id = Column(UUID(as_uuid=True), ForeignKey("recharge_packages.id"), nullable=False)

    # 金额
    amount = Column(Integer, nullable=False)  # 美分
    currency = Column(String(10), default="USD")
    credit_amount = Column(Integer, nullable=False)  # 积分数量

    # 支付信息
    payment_method = Column(String(50))
    payment_gateway = Column(String(100))
    gateway_order_id = Column(String(255))

    # 状态
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('pending', 'paid', 'processing', 'completed', 'failed', 'cancelled', 'expired')",
            name="check_payment_status",
        ),
        default=PaymentStatus.PENDING,
    )

    # 时间
    paid_at = Column(DateTime(timezone=True), nullable=True)
    expired_at = Column(DateTime(timezone=True), nullable=True)

    # 失败信息
    failure_reason = Column(Text)
    retry_count = Column(Integer, default=0)

    # 关系
    user = relationship("User", back_populates="payment_orders")
    package = relationship("RechargePackage")

    __table_args__ = (
        Index("idx_payment_orders_user_created", "user_id", "created_at"),
        Index("idx_payment_orders_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<PaymentOrder(id={self.id}, user_id={self.user_id}, status={self.status})>"


class RechargePackage(Base, TimestampMixin):
    """充值套餐"""

    __tablename__ = "recharge_packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # 价格
    price_in_cents = Column(Integer, nullable=False)
    currency = Column(String(10), default="USD")
    credit_amount = Column(Integer, nullable=False)
    bonus_credits = Column(Integer, default=0)

    # 显示设置
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)

    # 折扣信息
    original_price = Column(Integer)
    discount_percentage = Column(Integer)

    # 创建者
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # 关系
    orders = relationship("PaymentOrder", back_populates="package")

    __table_args__ = (
        Index("idx_recharge_packages_display", "is_active", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<RechargePackage(id={self.id}, name={self.name})>"


class UserCredit(Base, TimestampMixin):
    """用户积分"""

    __tablename__ = "user_credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_balance = Column(Integer, default=0)
    total_earned = Column(Integer, default=0)
    total_spent = Column(Integer, default=0)
    last_purchase_at = Column(DateTime(timezone=True), nullable=True)
    average_monthly_spending = Column(DECIMAL(10, 2), default=0.0)

    # 关系
    user = relationship("User", back_populates="credits")
    transactions = relationship("CreditTransaction", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<UserCredit(user_id={self.user_id}, current_balance={self.current_balance})>"


class CreditTransaction(Base, TimestampMixin):
    """积分交易记录"""

    __tablename__ = "credit_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 交易信息
    amount = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    transaction_type = Column(String(50), nullable=False)

    # 描述
    description = Column(Text)
    reference_id = Column(String(255))  # 关联的订单 ID 或其他参考 ID

    # 关系
    user = relationship("User", back_populates="transactions")

    __table_args__ = (
        Index("idx_credit_transactions_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<CreditTransaction(id={self.id}, user_id={self.user_id}, amount={self.amount})>"
