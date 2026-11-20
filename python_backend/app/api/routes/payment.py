"""
支付路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime
import uuid

from app.api.deps import get_db, get_workspace_user
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentStatus,
    PaymentMethod,
    RechargePackageResponse,
    PaymentMethodResponse,
    CreditBalanceResponse,
    CreditTransactionResponse,
    TransactionHistoryResponse,
)
from app.services.payment_service import PaymentService, get_payment_service
from app.models.user import User
from app.models.payment import PaymentOrder, RechargePackage, UserCredit, CreditTransaction

router = APIRouter(prefix="/api/payment", tags=["支付"])


@router.get("/packages")
async def get_packages(
    *,
    db: AsyncSession = Depends(get_db),
):
    """获取充值套餐列表"""
    payment_service = get_payment_service(db)

    packages = await payment_service.get_packages(is_active=True)

    return {
        "success": True,
        "data": [
            RechargePackageResponse(
                id=str(p.id),
                name=p.name,
                description=p.description,
                priceInCents=p.price_in_cents,
                currency=p.currency,
                creditAmount=p.credit_amount,
                bonusCredits=p.bonus_credits,
                isActive=p.is_active,
                isPopular=p.is_popular,
                displayOrder=p.display_order,
                originalPrice=p.original_price,
                discountPercentage=p.discount_percentage,
            )
            for p in packages
        ],
    }


@router.get("/package/{package_id}")
async def get_package(
    *,
    package_id: str,
    db: AsyncSession = Depends(get_db),
):
    """获取套餐详情"""
    payment_service = get_payment_service(db)

    package = await payment_service.get_package(package_id)

    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    return {
        "success": True,
        "data": RechargePackageResponse(
            id=str(package.id),
            name=package.name,
            description=package.description,
            priceInCents=package.price_in_cents,
            currency=package.currency,
            creditAmount=package.credit_amount,
            bonusCredits=package.bonus_credits,
            isActive=package.is_active,
            isPopular=package.is_popular,
            displayOrder=package.display_order,
            originalPrice=package.original_price,
            discountPercentage=package.discount_percentage,
        ),
    }


@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_order(
    *,
    request: PaymentOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """创建支付订单"""
    payment_service = get_payment_service(db)

    try:
        order = await payment_service.create_order(
            user_id=str(current_user.id),
            package_id=request.packageId,
            payment_method=request.paymentMethod.value if request.paymentMethod else None,
        )

        return PaymentOrderResponse(
            id=str(order.id),
            userId=str(order.user_id),
            packageId=str(order.package_id),
            amount=order.amount,
            currency=order.currency,
            creditAmount=order.credit_amount,
            paymentMethod=order.payment_method,
            paymentGateway=order.payment_gateway,
            gatewayOrderId=order.gateway_order_id,
            status=order.status,
            paidAt=order.paid_at,
            expiredAt=order.expired_at,
            failureReason=order.failure_reason,
            createdAt=order.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/order/{order_id}")
async def get_order(
    *,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取订单详情"""
    payment_service = get_payment_service(db)

    order = await payment_service.get_order(order_id)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if str(order.user_id) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "success": True,
        "data": PaymentOrderResponse(
            id=str(order.id),
            userId=str(order.user_id),
            packageId=str(order.package_id),
            amount=order.amount,
            currency=order.currency,
            creditAmount=order.credit_amount,
            paymentMethod=order.payment_method,
            paymentGateway=order.payment_gateway,
            gatewayOrderId=order.gateway_order_id,
            status=order.status,
            paidAt=order.paid_at,
            expiredAt=order.expired_at,
            failureReason=order.failure_reason,
            createdAt=order.created_at,
        ),
    }


@router.get("/order/{order_id}/status")
async def get_order_status(
    *,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取订单状态"""
    payment_service = get_payment_service(db)

    try:
        status_data = await payment_service.get_order_status(
            user_id=str(current_user.id),
            order_id=order_id,
        )

        return {
            "success": True,
            "data": status_data,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/order/{order_id}/confirm")
async def confirm_payment(
    *,
    order_id: str,
    payment_method: PaymentMethod = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """确认支付"""
    payment_service = get_payment_service(db)

    try:
        order = await payment_service.confirm_payment(
            user_id=str(current_user.id),
            order_id=order_id,
            payment_method=payment_method.value,
        )

        return {
            "success": True,
            "data": PaymentOrderResponse(
                id=str(order.id),
                userId=str(order.user_id),
                packageId=str(order.package_id),
                amount=order.amount,
                currency=order.currency,
                creditAmount=order.credit_amount,
                paymentMethod=order.payment_method,
                paymentGateway=order.payment_gateway,
                gatewayOrderId=order.gateway_order_id,
                status=order.status,
                paidAt=order.paid_at,
                expiredAt=order.expired_at,
                failureReason=order.failure_reason,
                createdAt=order.created_at,
            ),
            "message": "Payment confirmed successfully",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/order/{order_id}/cancel")
async def cancel_order(
    *,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """取消订单"""
    payment_service = get_payment_service(db)

    try:
        order = await payment_service.cancel_order(
            user_id=str(current_user.id),
            order_id=order_id,
        )

        return {
            "success": True,
            "message": "Order cancelled successfully",
            "data": {
                "orderId": str(order.id),
                "status": order.status,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/transactions", response_model=TransactionHistoryResponse)
async def get_transactions(
    *,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
):
    """获取交易历史"""
    payment_service = get_payment_service(db)

    transactions = await payment_service.get_transactions(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset,
    )

    total_query = await db.execute(
        select(func.count(CreditTransaction.id)).where(
            CreditTransaction.user_id == uuid.UUID(str(current_user.id))
        )
    )
    total = total_query.scalar() or 0

    return TransactionHistoryResponse(
        success=True,
        data=[
            CreditTransactionResponse(
                id=str(t.id),
                userId=str(t.user_id),
                amount=t.amount,
                balanceAfter=t.balance_after,
                transactionType=t.transaction_type,
                description=t.description,
                referenceId=t.reference_id,
                createdAt=t.created_at,
            )
            for t in transactions
        ],
        pagination={"total": total, "limit": limit, "offset": offset},
    )


@router.get("/credits", response_model=CreditBalanceResponse)
async def get_credits(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取积分余额"""
    payment_service = get_payment_service(db)

    balance_data = await payment_service.get_credit_balance(
        user_id=str(current_user.id),
    )

    return CreditBalanceResponse(
        userId=balance_data["userId"],
        balance=balance_data["balance"],
        totalEarned=balance_data["totalEarned"],
        totalSpent=balance_data["totalSpent"],
        lastUpdated=datetime.fromisoformat(balance_data["lastUpdated"]) if balance_data.get("lastUpdated") else None,
    )


@router.get("/methods")
async def get_payment_methods():
    """获取支付方式列表"""
    methods = [
        {
            "id": "alipay",
            "name": "Alipay",
            "description": "支付宝支付",
            "icon": "alipay.svg",
            "enabled": True,
            "processingTime": "即时",
        },
        {
            "id": "wechat_pay",
            "name": "WeChat Pay",
            "description": "微信支付",
            "icon": "wechat.svg",
            "enabled": True,
            "processingTime": "即时",
        },
        {
            "id": "credit_card",
            "name": "Credit Card",
            "description": "信用卡支付",
            "icon": "credit_card.svg",
            "enabled": True,
            "processingTime": "1-2 分钟",
        },
        {
            "id": "paypal",
            "name": "PayPal",
            "description": "PayPal 支付",
            "icon": "paypal.svg",
            "enabled": False,
            "processingTime": "即时",
        },
    ]

    return {
        "success": True,
        "data": methods,
    }


@router.post("/webhook")
async def handle_webhook(
    *,
    db: AsyncSession = Depends(get_db),
):
    """
    处理支付网关 webhook 回调

    注意：此端点不需要认证，由支付网关调用
    """
    # TODO: 实现 webhook 处理逻辑
    # 需要验证 webhook 签名
    # 更新订单状态

    return {"success": True, "message": "Webhook received"}
