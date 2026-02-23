"""
支付服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

from app.models.payment import (
    PaymentOrder,
    RechargePackage,
    UserCredit,
    CreditTransaction,
    PaymentStatus,
)
from app.models.user import User


class PaymentService:
    """支付服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_packages(
        self,
        is_active: bool = True,
    ) -> List[RechargePackage]:
        """获取充值套餐列表"""
        query = select(RechargePackage)
        if is_active:
            query = query.where(RechargePackage.is_active == True)
        query = query.order_by(RechargePackage.display_order, RechargePackage.created_at)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_package(self, package_id: str) -> Optional[RechargePackage]:
        """获取套餐详情"""
        result = await self.db.execute(
            select(RechargePackage).where(RechargePackage.id == uuid.UUID(package_id))
        )
        return result.scalar_one_or_none()

    async def create_order(
        self,
        user_id: str,
        package_id: str,
        payment_method: Optional[str] = None,
    ) -> PaymentOrder:
        """
        创建支付订单

        Args:
            user_id: 用户 ID
            package_id: 套餐 ID
            payment_method: 支付方式

        Returns:
            创建的订单
        """
        package = await self.get_package(package_id)
        if not package:
            raise ValueError("Package not found")

        order = PaymentOrder(
            user_id=uuid.UUID(user_id),
            package_id=package.id,
            amount=package.price_in_cents,
            currency=package.currency,
            credit_amount=package.credit_amount + package.bonus_credits,
            payment_method=payment_method,
            status=PaymentStatus.PENDING,
            expired_at=datetime.utcnow() + timedelta(minutes=30),  # 30 分钟过期
        )
        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)

        return order

    async def confirm_payment(
        self,
        user_id: str,
        order_id: str,
        payment_method: str,
        gateway_order_id: Optional[str] = None,
    ) -> PaymentOrder:
        """
        确认支付

        Args:
            user_id: 用户 ID
            order_id: 订单 ID
            payment_method: 支付方式
            gateway_order_id: 支付网关订单 ID

        Returns:
            更新后的订单
        """
        order = await self.get_order(order_id)

        if not order:
            raise ValueError("Order not found")

        if str(order.user_id) != user_id:
            raise ValueError("Order does not belong to user")

        if order.status != PaymentStatus.PENDING:
            raise ValueError(f"Order status is {order.status}, not PENDING")

        # 更新订单状态
        order.status = PaymentStatus.PAID
        order.payment_method = payment_method
        order.gateway_order_id = gateway_order_id
        order.paid_at = datetime.utcnow()

        # 添加积分
        await self._add_credits(
            user_id=str(order.user_id),
            amount=order.credit_amount,
            transaction_type="purchase",
            description=f"购买套餐积分",
            reference_id=str(order.id),
        )

        await self.db.commit()
        await self.db.refresh(order)

        return order

    async def cancel_order(self, user_id: str, order_id: str) -> PaymentOrder:
        """取消订单"""
        order = await self.get_order(order_id)

        if not order:
            raise ValueError("Order not found")

        if str(order.user_id) != user_id:
            raise ValueError("Order does not belong to user")

        if order.status != PaymentStatus.PENDING:
            raise ValueError(f"Cannot cancel order with status {order.status}")

        order.status = PaymentStatus.CANCELLED
        await self.db.commit()
        await self.db.refresh(order)

        return order

    async def get_order(self, order_id: str) -> Optional[PaymentOrder]:
        """获取订单详情"""
        result = await self.db.execute(
            select(PaymentOrder).where(PaymentOrder.id == uuid.UUID(order_id))
        )
        return result.scalar_one_or_none()

    async def get_order_status(self, user_id: str, order_id: str) -> Dict[str, Any]:
        """获取订单状态"""
        order = await self.get_order(order_id)

        if not order:
            raise ValueError("Order not found")

        if str(order.user_id) != user_id:
            raise ValueError("Order does not belong to user")

        return {
            "orderId": str(order.id),
            "status": order.status,
            "amount": order.amount,
            "creditAmount": order.credit_amount,
            "paidAt": order.paid_at.isoformat() if order.paid_at else None,
            "expiredAt": order.expired_at.isoformat() if order.expired_at else None,
        }

    async def get_transactions(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> List[CreditTransaction]:
        """获取交易历史"""
        result = await self.db.execute(
            select(CreditTransaction)
            .where(CreditTransaction.user_id == uuid.UUID(user_id))
            .order_by(CreditTransaction.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_credit_balance(self, user_id: str) -> Dict[str, Any]:
        """获取积分余额"""
        credits = await self._get_or_create_credits(user_id)

        return {
            "userId": user_id,
            "balance": credits.balance,
            "totalEarned": credits.total_earned,
            "totalSpent": credits.total_spent,
            "lastUpdated": credits.updated_at.isoformat() if credits.updated_at else None,
        }

    async def adjust_credits(
        self,
        user_id: str,
        amount: int,
        description: str,
        reference_id: Optional[str] = None,
    ) -> UserCredit:
        """
        调整积分（管理员操作）

        Args:
            user_id: 用户 ID
            amount: 调整数量（正数增加，负数减少）
            description: 描述
            reference_id: 参考 ID

        Returns:
            更新后的积分记录
        """
        return await self._add_credits(
            user_id=user_id,
            amount=amount,
            transaction_type="adjustment",
            description=description,
            reference_id=reference_id,
        )

    async def _add_credits(
        self,
        user_id: str,
        amount: int,
        transaction_type: str,
        description: str,
        reference_id: Optional[str] = None,
    ) -> UserCredit:
        """添加/扣除积分"""
        credits = await self._get_or_create_credits(user_id)

        old_balance = credits.balance
        credits.balance += amount

        if amount > 0:
            credits.total_earned += amount
        else:
            credits.total_spent += abs(amount)

        # 创建交易记录
        transaction = CreditTransaction(
            user_id=uuid.UUID(user_id),
            amount=amount,
            balance_after=credits.balance,
            transaction_type=transaction_type,
            description=description,
            reference_id=reference_id,
        )
        self.db.add(transaction)

        return credits

    async def _get_or_create_credits(self, user_id: str) -> UserCredit:
        """获取或创建积分记录"""
        result = await self.db.execute(
            select(UserCredit).where(UserCredit.user_id == uuid.UUID(user_id))
        )
        credits = result.scalar_one_or_none()

        if not credits:
            credits = UserCredit(
                user_id=uuid.UUID(user_id),
                balance=0,
                total_earned=0,
                total_spent=0,
            )
            self.db.add(credits)
            await self.db.flush()

        return credits


def get_payment_service(db: AsyncSession) -> PaymentService:
    """获取支付服务实例"""
    return PaymentService(db)
