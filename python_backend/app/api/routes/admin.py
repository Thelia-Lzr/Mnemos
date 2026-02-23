"""
管理员路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user, require_admin
from app.core.config import settings
from app.models.user import User
from app.models.task import AsyncTask
from app.models.practice import PracticeResult
from app.models.payment import UserCredit, CreditTransaction, PaymentOrder, RechargePackage
from app.schemas.payment import CreditAdjustRequest

router = APIRouter(prefix="/api/admin", tags=["管理员"])


_openrouter_config_store = {
    "apiKey": settings.OPENROUTER_API_KEY,
    "baseUrl": settings.OPENROUTER_BASE_URL,
    "timeout": 30000,
    "maxRetries": 3,
    "retryDelay": 1000,
    "dailyTokenLimit": None,
    "monthlyTokenLimit": None,
    "costThreshold": None,
    "isActive": bool(settings.OPENROUTER_API_KEY),
    "lastTestedAt": None,
    "testStatus": "untested",
    "updatedAt": None,
    "updatedBy": None,
}


def _to_package_dict(p: RechargePackage) -> dict:
    return {
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
        "originalPrice": p.original_price,
        "discountPercentage": p.discount_percentage,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
        "createdBy": str(p.created_by) if p.created_by else None,
    }


@router.get("/users")
async def get_users(
    *,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
):
    """获取用户列表"""
    if page > 1 and offset == 0:
        offset = (page - 1) * limit

    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    users = list(result.scalars().all())

    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    user_rows = []
    for u in users:
        credit_result = await db.execute(
            select(UserCredit).where(UserCredit.user_id == u.id)
        )
        credits = credit_result.scalar_one_or_none()
        user_rows.append(
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "createdAt": u.created_at.isoformat() if u.created_at else None,
                "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None,
                "creditBalance": credits.current_balance if credits else 0,
                "totalCreditsEarned": credits.total_earned if credits else 0,
                "totalCreditsSpent": credits.total_spent if credits else 0,
            }
        )

    total_pages = max((total + limit - 1) // limit, 1)
    current_page = (offset // limit) + 1

    return {
        "success": True,
        "data": {
            "users": user_rows,
            "pagination": {
                "currentPage": current_page,
                "totalPages": total_pages,
                "totalUsers": total,
                "limit": limit,
            },
        },
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

    credit_result = await db.execute(
        select(UserCredit).where(UserCredit.user_id == user.id)
    )
    credits = credit_result.scalar_one_or_none()

    capabilities = [
        {
            "language": c.language,
            "currentLevel": c.current_level,
            "overallLevel": c.overall_level,
            "confidenceScore": c.confidence_score,
            "listeningLevel": c.listening_level,
            "speakingLevel": c.speaking_level,
            "readingLevel": c.reading_level,
            "writingLevel": c.writing_level,
            "lastAssessedAt": c.last_assessed_at.isoformat() if c.last_assessed_at else None,
        }
        for c in (user.capabilities or [])
    ]

    tx_result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user.id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(10)
    )
    recent_transactions = list(tx_result.scalars().all())

    stats_result = await db.execute(
        select(
            func.count(PracticeResult.id),
            func.avg(PracticeResult.accuracy),
            func.sum(PracticeResult.total_time),
            func.max(PracticeResult.completed_at),
        ).where(PracticeResult.user_id == user.id)
    )
    total_practices, average_accuracy, total_practice_time, last_practice_at = stats_result.one()

    return {
        "success": True,
        "data": {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "createdAt": user.created_at.isoformat() if user.created_at else None,
                "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
                "creditBalance": credits.current_balance if credits else 0,
                "totalCreditsEarned": credits.total_earned if credits else 0,
                "totalCreditsSpent": credits.total_spent if credits else 0,
            },
            "capabilities": capabilities,
            "recentTransactions": [
                {
                    "type": t.transaction_type,
                    "amount": t.amount,
                    "description": t.description,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in recent_transactions
            ],
            "practiceStats": {
                "total_practices": total_practices or 0,
                "average_accuracy": float(average_accuracy or 0),
                "total_practice_time": int(total_practice_time or 0),
                "last_practice_at": last_practice_at.isoformat() if last_practice_at else None,
            },
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
        "data": {
            "packages": [_to_package_dict(p) for p in packages],
            "salesStats": [],
        },
    }


@router.post("/packages")
async def create_package(
    *,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """创建套餐"""
    package = RechargePackage(
        name=request.get("name", ""),
        description=request.get("description"),
        price_in_cents=request.get("priceInCents", 0),
        currency=request.get("currency", "USD"),
        credit_amount=request.get("creditAmount", 0),
        bonus_credits=request.get("bonusCredits", 0),
        is_active=request.get("isActive", True),
        is_popular=request.get("isPopular", False),
        display_order=request.get("displayOrder", 0),
        original_price=request.get("originalPrice"),
        discount_percentage=request.get("discountPercentage"),
        created_by=current_user.id,
    )
    db.add(package)
    await db.commit()
    await db.refresh(package)

    return {
        "success": True,
        "data": _to_package_dict(package),
        "message": "Package created",
    }


@router.put("/packages/{package_id}")
async def update_package(
    *,
    package_id: str,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """更新套餐"""
    result = await db.execute(
        select(RechargePackage).where(RechargePackage.id == uuid.UUID(package_id))
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    field_map = {
        "name": "name",
        "description": "description",
        "priceInCents": "price_in_cents",
        "currency": "currency",
        "creditAmount": "credit_amount",
        "bonusCredits": "bonus_credits",
        "isActive": "is_active",
        "isPopular": "is_popular",
        "displayOrder": "display_order",
        "originalPrice": "original_price",
        "discountPercentage": "discount_percentage",
    }
    for req_key, model_key in field_map.items():
        if req_key in request:
            setattr(package, model_key, request[req_key])

    await db.commit()
    await db.refresh(package)
    return {
        "success": True,
        "data": _to_package_dict(package),
        "message": "Package updated",
    }


@router.delete("/packages/{package_id}")
async def delete_package(
    *,
    package_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """删除套餐（软删除）"""
    result = await db.execute(
        select(RechargePackage).where(RechargePackage.id == uuid.UUID(package_id))
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    package.is_active = False
    await db.commit()
    return {"success": True, "message": "Package disabled"}


@router.get("/credit-stats")
async def get_credit_statistics(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取积分统计"""
    # 总积分
    total_credits_result = await db.execute(
        select(func.sum(UserCredit.current_balance))
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
            "totalCreditsRemaining": total_credits,
            "totalCreditsIssued": total_earned,
            "totalCreditsConsumed": total_spent,
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
            current_balance=0,
            total_earned=0,
            total_spent=0,
        )
        db.add(credits)

    old_balance = credits.current_balance
    credits.current_balance += request.amount

    if request.amount > 0:
        credits.total_earned += request.amount
    else:
        credits.total_spent += abs(request.amount)

    # 创建交易记录
    transaction = CreditTransaction(
        user_id=uuid.UUID(user_id),
        amount=request.amount,
        balance_after=credits.current_balance,
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
            "newBalance": credits.current_balance,
            "adjustment": request.amount,
        },
        "message": f"Credits adjusted: {'+' if request.amount > 0 else ''}{request.amount}",
    }


@router.get("/queue-metrics")
async def get_queue_metrics(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取任务队列指标"""
    status_counts_result = await db.execute(
        select(AsyncTask.status, func.count(AsyncTask.id)).group_by(AsyncTask.status)
    )
    status_counts = {row[0]: row[1] for row in status_counts_result.all()}
    total_tasks = sum(status_counts.values())
    completed = status_counts.get("completed", 0)
    failed = status_counts.get("failed", 0)

    return {
        "success": True,
        "data": {
            "totalTasks": total_tasks,
            "queuedTasks": status_counts.get("queued", 0) + status_counts.get("pending", 0),
            "processingTasks": status_counts.get("processing", 0),
            "completedTasks": completed,
            "failedTasks": failed,
            "averageWaitTime": 0,
            "averageProcessingTime": 0,
            "throughputPerMinute": 0,
            "resourceUtilization": 0,
            "errorRate": float((failed / total_tasks) * 100) if total_tasks else 0,
            "statusBreakdown": status_counts,
        },
    }


@router.get("/tasks")
async def get_admin_tasks(
    *,
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
):
    """获取管理员任务列表"""
    query = select(AsyncTask)
    count_query = select(func.count(AsyncTask.id))

    if status:
        query = query.where(AsyncTask.status == status)
        count_query = count_query.where(AsyncTask.status == status)
    if type:
        query = query.where(AsyncTask.task_type == type)
        count_query = count_query.where(AsyncTask.task_type == type)

    query = query.order_by(AsyncTask.created_at.desc()).offset(offset).limit(limit)
    task_result = await db.execute(query)
    tasks = list(task_result.scalars().all())

    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "tasks": [
                {
                    "id": str(t.id),
                    "user_id": str(t.user_id),
                    "type": t.task_type,
                    "status": t.status,
                    "priority": t.priority,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "started_at": t.started_at.isoformat() if t.started_at else None,
                    "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                    "progress": t.progress_percent or 0,
                    "retry_count": 0,
                    "error_message": t.error_message,
                }
                for t in tasks
            ],
            "totalCount": total_count,
        },
    }


@router.post("/retry-failed-tasks")
async def retry_failed_tasks(
    *,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """重试失败任务"""
    task_ids = request.get("taskIds", [])
    retried = 0

    for task_id in task_ids:
        result = await db.execute(
            select(AsyncTask).where(AsyncTask.id == uuid.UUID(task_id))
        )
        task = result.scalar_one_or_none()
        if task and task.status == "failed":
            task.status = "queued"
            task.error_message = None
            task.progress_percent = 0
            retried += 1

    await db.commit()
    return {
        "success": True,
        "data": {"retriedTasks": retried, "taskIds": task_ids},
        "message": f"Retried {retried} task(s)",
    }


@router.post("/clear-queue")
async def clear_queue(
    *,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """清理任务队列（清理完成/失败任务）"""
    include_completed = request.get("includeCompleted", True)
    include_failed = request.get("includeFailed", False)

    statuses = []
    if include_completed:
        statuses.append("completed")
    if include_failed:
        statuses.append("failed")

    if not statuses:
        return {"success": True, "data": {"deletedTasks": 0, "clearedDays": request.get("days", 0)}}

    result = await db.execute(
        select(AsyncTask).where(AsyncTask.status.in_(statuses))
    )
    tasks = list(result.scalars().all())
    deleted_count = len(tasks)
    for task in tasks:
        await db.delete(task)

    await db.commit()
    return {
        "success": True,
        "data": {
            "deletedTasks": deleted_count,
            "clearedDays": request.get("days", 0),
        },
    }


@router.get("/openrouter/config")
async def get_openrouter_config(
    *,
    current_user: User = Depends(require_admin),
):
    """获取 OpenRouter 配置"""
    return {"success": True, "data": _openrouter_config_store}


@router.put("/openrouter/config")
async def update_openrouter_config(
    *,
    request: dict,
    current_user: User = Depends(require_admin),
):
    """更新 OpenRouter 配置"""
    allowed_keys = {
        "apiKey",
        "baseUrl",
        "timeout",
        "maxRetries",
        "retryDelay",
        "dailyTokenLimit",
        "monthlyTokenLimit",
        "costThreshold",
        "isActive",
    }
    for key in allowed_keys:
        if key in request:
            _openrouter_config_store[key] = request[key]

    _openrouter_config_store["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _openrouter_config_store["updatedBy"] = str(current_user.id)
    _openrouter_config_store["isActive"] = bool(_openrouter_config_store.get("apiKey"))

    return {
        "success": True,
        "data": _openrouter_config_store,
        "message": "OpenRouter config updated",
    }


@router.post("/openrouter/test-key")
async def test_openrouter_key(
    *,
    request: dict,
    current_user: User = Depends(require_admin),
):
    """测试 OpenRouter API Key（轻量模拟）"""
    api_key = request.get("apiKey", "")
    is_valid = isinstance(api_key, str) and api_key.startswith("sk-or-") and len(api_key) > 10
    test_status = "success" if is_valid else "failed"
    now = datetime.now(timezone.utc).isoformat()

    _openrouter_config_store["lastTestedAt"] = now
    _openrouter_config_store["testStatus"] = test_status

    result = {
        "success": is_valid,
        "responseTime": 120,
        "availableModels": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
        "errorMessage": None if is_valid else "Invalid API key format",
        "connectionTest": {
            "success": is_valid,
            "latency": 120,
            "error": None if is_valid else "Authentication failed",
        },
        "modelTests": [
            {
                "model": "openai/gpt-4o",
                "success": is_valid,
                "responseTime": 130,
                "tokensUsed": 25,
            }
        ],
        "testedAt": now,
    }

    return {"success": True, "data": result}


@router.get("/openrouter/usage-stats")
async def get_openrouter_usage_stats(
    *,
    current_user: User = Depends(require_admin),
):
    """获取 OpenRouter 使用统计（最小可用响应）"""
    now = datetime.now(timezone.utc).isoformat()
    empty_period = {
        "totalRequests": 0,
        "totalTokens": 0,
        "totalCost": 0,
        "averageResponseTime": 0,
        "errorRate": 0,
    }
    data = {
        "daily": empty_period,
        "weekly": empty_period,
        "monthly": empty_period,
        "modelUsage": {},
        "costAnalysis": {
            "totalCost": 0,
            "costByModel": {},
            "costByTaskType": {},
            "projectedMonthlyCost": 0,
            "costTrend": [],
        },
        "performanceMetrics": {
            "averageResponseTime": 0,
            "p95ResponseTime": 0,
            "p99ResponseTime": 0,
            "uptime": 100,
            "errorRate": 0,
            "throughput": 0,
        },
        "generatedAt": now,
    }
    return {"success": True, "data": data}


@router.get("/openrouter/models")
async def get_openrouter_models(
    *,
    current_user: User = Depends(require_admin),
):
    """获取可用模型列表"""
    return {
        "success": True,
        "data": [
            {
                "id": "openai/gpt-4o",
                "name": "GPT-4o",
                "description": "General-purpose multimodal model",
                "contextLength": 128000,
                "pricing": {"prompt": 0.0, "completion": 0.0},
                "capabilities": ["chat", "analysis", "tools"],
                "isAvailable": True,
            },
            {
                "id": "anthropic/claude-3.5-sonnet",
                "name": "Claude 3.5 Sonnet",
                "description": "High-quality reasoning model",
                "contextLength": 200000,
                "pricing": {"prompt": 0.0, "completion": 0.0},
                "capabilities": ["chat", "analysis", "coding"],
                "isAvailable": True,
            },
        ],
    }
