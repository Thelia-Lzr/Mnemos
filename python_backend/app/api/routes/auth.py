"""
认证路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid

from app.api.deps import get_db, get_current_user
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    PasswordChange,
    RefreshTokenRequest,
    UserAuthResponse,
)
from app.schemas.user import UserResponse, UserProfileResponse
from app.models.user import User, UserPreferences, UserCredit
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.database import AsyncSession

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=UserAuthResponse)
async def register(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserRegister,
) -> UserAuthResponse:
    """用户注册"""
    # 检查邮箱是否已存在
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == user_in.username))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # 创建用户
    user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # 创建默认偏好设置
    preferences = UserPreferences(user_id=user.id)
    db.add(preferences)

    # 创建默认积分账户
    credits = UserCredit(user_id=user.id, balance=100)  # 新用户赠送 100 积分
    db.add(credits)

    await db.commit()
    await db.refresh(user)

    # 生成令牌
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "username": user.username}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return UserAuthResponse(
        user=UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=1800,
        ),
    )


@router.post("/login", response_model=UserAuthResponse)
async def login(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserLogin,
) -> UserAuthResponse:
    """用户登录"""
    # 查找用户
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # 更新最后登录时间
    user.last_login_at = datetime.utcnow()
    await db.commit()

    # 生成令牌
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "username": user.username, "role": user.role}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return UserAuthResponse(
        user=UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=1800,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    *,
    token_in: RefreshTokenRequest,
) -> TokenResponse:
    """刷新访问令牌"""
    payload = decode_token(token_in.refresh_token, token_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    # 生成新的访问令牌
    access_token = create_access_token(
        data={"sub": user_id, "email": email}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=token_in.refresh_token,  # 返回相同的刷新令牌
        expires_in=1800,
    )


@router.post("/logout")
async def logout():
    """用户登出"""
    # 在客户端删除令牌即可
    # 如果需要将令牌加入黑名单，可以在这里实现
    return {"success": True, "message": "Logged out successfully"}


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """获取当前用户资料"""
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
    )


@router.post("/change-password")
async def change_password(
    *,
    db: AsyncSession = Depends(get_db),
    password_in: PasswordChange,
    current_user: User = Depends(get_current_user),
):
    """修改密码"""
    # 验证当前密码
    if not verify_password(password_in.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password",
        )

    # 更新密码
    current_user.password_hash = get_password_hash(password_in.new_password)
    await db.commit()

    return {"success": True, "message": "Password changed successfully"}
