"""
管理员路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import uuid

from app.api.deps import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.payment import UserCredit, CreditTransaction, PaymentOrder, RechargePackage
from app.schemas.payment import CreditAdjustRequest

router = APIRouter(prefix="/api/admin", tags=["管理员"])


@router.get("/users")
async def get_users(
    *,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
):
    """获取用户列表"""
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    users = list(result.scalars().all())

    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    return {
        "success": True,
        "data": [
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "createdAt": u.created_at.isoformat() if u.created_at else None,
                "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ],
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.get("/users/{user_id}")
async def get_user(
    *,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取用户详情"""
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "success": True,
        "data": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
            "preferences": user.preferences,
            "avatar": user.avatar_url,
        },
    }


@router.get("/statistics")
async def get_system_statistics(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取系统统计"""
    # 用户统计
    user_count_result = await db.execute(select(func.count(User.id)))
    user_count = user_count_result.scalar() or 0

    # 订单统计
    order_count_result = await db.execute(select(func.count(PaymentOrder.id)))
    order_count = order_count_result.scalar() or 0

    # 收入统计
    revenue_result = await db.execute(
        select(func.sum(PaymentOrder.amount)).where(
            PaymentOrder.status == "paid"
        )
    )
    revenue = revenue_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "totalUsers": user_count,
            "totalOrders": order_count,
            "totalRevenue": revenue,
            "activeUsers": 0,  # TODO: 实现
        },
    }


@router.get("/packages")
async def get_admin_packages(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取所有套餐（包括非激活）"""
    result = await db.execute(
        select(RechargePackage).order_by(RechargePackage.display_order)
    )
    packages = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "priceInCents": p.price_in_cents,
                "currency": p.currency,
                "creditAmount": p.credit_amount,
                "bonusCredits": p.bonus_credits,
                "isActive": p.is_active,
                "isPopular": p.is_popular,
                "displayOrder": p.display_order,
            }
            for p in packages
        ],
    }


@router.post("/packages")
async def create_package(
    *,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """创建套餐"""
    # TODO: 实现套餐创建
    return {
        "success": True,
        "message": "Package creation not implemented yet",
    }


@router.get("/credit-stats")
async def get_credit_statistics(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取积分统计"""
    # 总积分
    total_credits_result = await db.execute(
        select(func.sum(UserCredit.balance))
    )
    total_credits = total_credits_result.scalar() or 0

    # 总发放
    total_earned_result = await db.execute(
        select(func.sum(UserCredit.total_earned))
    )
    total_earned = total_earned_result.scalar() or 0

    # 总消费
    total_spent_result = await db.execute(
        select(func.sum(UserCredit.total_spent))
    )
    total_spent = total_spent_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "totalCreditsInCirculation": total_credits,
            "totalCreditsEarned": total_earned,
            "totalCreditsSpent": total_spent,
        },
    }


@router.post("/users/{user_id}/credits/adjust")
async def adjust_user_credits(
    *,
    user_id: str,
    request: CreditAdjustRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """调整用户积分"""
    # 获取用户
    user_result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    target_user = user_result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 获取或创建积分记录
    credit_result = await db.execute(
        select(UserCredit).where(UserCredit.user_id == uuid.UUID(user_id))
    )
    credits = credit_result.scalar_one_or_none()

    if not credits:
        credits = UserCredit(
            user_id=uuid.UUID(user_id),
            balance=0,
            total_earned=0,
            total_spent=0,
        )
        db.add(credits)

    old_balance = credits.balance
    credits.balance += request.amount

    if request.amount > 0:
        credits.total_earned += request.amount
    else:
        credits.total_spent += abs(request.amount)

    # 创建交易记录
    transaction = CreditTransaction(
        user_id=uuid.UUID(user_id),
        amount=request.amount,
        balance_after=credits.balance,
        transaction_type="admin_adjustment",
        description=request.description,
        reference_id=None,
    )
    db.add(transaction)
    await db.commit()

    return {
        "success": True,
        "data": {
            "userId": user_id,
            "oldBalance": old_balance,
            "newBalance": credits.balance,
            "adjustment": request.amount,
        },
        "message": f"Credits adjusted: {'+' if request.amount > 0 else ''}{request.amount}",
    }
