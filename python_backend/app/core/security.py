"""
安全相关工具：JWT 认证、密码加密
"""
from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
import secrets
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 相关常量
ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.JWT_SECRET
REFRESH_SECRET_KEY = settings.JWT_REFRESH_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access",
) -> str:
    """
    创建访问令牌

    Args:
        data: 要编码的数据（通常包含 user_id, email 等）
        expires_delta: 过期时间增量
        token_type: 令牌类型（access/refresh）

    Returns:
        JWT 令牌字符串
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            if token_type == "access"
            else REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60
        )

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_type": token_type,
        }
    )

    secret = SECRET_KEY if token_type == "access" else REFRESH_SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=ALGORITHM)

    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    创建刷新令牌

    Args:
        data: 要编码的数据

    Returns:
        刷新令牌字符串
    """
    return create_access_token(
        data,
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh",
    )


def decode_token(token: str, token_type: str = "access") -> Optional[dict]:
    """
    解码令牌

    Args:
        token: JWT 令牌
        token_type: 期望的令牌类型

    Returns:
        解码后的数据，如果失败返回 None
    """
    try:
        secret = SECRET_KEY if token_type == "access" else REFRESH_SECRET_KEY
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])

        # 验证令牌类型
        if payload.get("token_type") != token_type:
            logger.warning(f"Token type mismatch: expected {token_type}")
            return None

        return payload
    except JWTError as e:
        logger.warning(f"Token decode error: {e}")
        return None


def verify_token(token: str, token_type: str = "access") -> bool:
    """
    验证令牌是否有效

    Args:
        token: JWT 令牌
        token_type: 期望的令牌类型

    Returns:
        是否有效
    """
    payload = decode_token(token, token_type)
    if payload is None:
        return False

    # 检查是否过期
    exp = payload.get("exp")
    if exp is None:
        return False

    try:
        expire_time = datetime.fromtimestamp(exp)
        if expire_time < datetime.utcnow():
            return False
    except (ValueError, TypeError):
        return False

    return True


def generate_verification_code(length: int = 6) -> str:
    """生成验证码"""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def generate_secure_token(length: int = 32) -> str:
    """生成安全令牌"""
    return secrets.token_urlsafe(length)


def get_user_id_from_token(token: str) -> Optional[str]:
    """从令牌中获取用户 ID"""
    payload = decode_token(token, "access")
    if payload:
        return payload.get("sub")  # sub 字段通常存储 user_id
    return None


def get_user_info_from_token(token: str) -> Optional[dict]:
    """从令牌中获取用户信息"""
    payload = decode_token(token, "access")
    if payload:
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "username": payload.get("username"),
            "role": payload.get("role"),
        }
    return None


# 兼容 Node.js jsonwebtoken 的选项
class VerifyOptions:
    """JWT 验证选项（兼容 jsonwebtoken）"""

    def __init__(
        self,
        algorithms: list = None,
        issuer: str = None,
        audience: Union[str, list] = None,
        ignore_expiration: bool = False,
    ):
        self.algorithms = algorithms or [ALGORITHM]
        self.issuer = issuer
        self.audience = audience
        self.ignore_expiration = ignore_expiration
