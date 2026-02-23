"""
安全工具单元测试
"""
import pytest
from datetime import datetime, timedelta

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token,
    get_user_id_from_token,
)


class TestPasswordHashing:
    """测试密码哈希功能"""

    def test_verify_password_success(self):
        """测试验证密码成功"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_failure(self):
        """测试验证密码失败"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False

    def test_password_hash_is_unique(self):
        """测试密码哈希唯一性"""
        password = "same_password"

        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # 每次生成的哈希应该不同（因为盐不同）
        assert hash1 != hash2
        # 但验证都应该通过
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

    def test_password_hash_with_special_characters(self):
        """测试特殊字符密码"""
        password = "p@$$w0rd_!@#$%^&*()"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_password_hash_with_unicode(self):
        """测试 Unicode 字符密码"""
        password = "密码パスワード🔐"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True


class TestCreateAccessToken:
    """测试创建访问令牌"""

    def test_create_access_token_basic(self):
        """测试创建基本访问令牌"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_expiry(self):
        """测试创建带过期时间的令牌"""
        data = {"sub": "user123"}
        expires_delta = timedelta(hours=2)
        token = create_access_token(data, expires_delta=expires_delta)

        assert isinstance(token, str)

        # 解码验证
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert "exp" in payload

    def test_create_access_token_with_token_type(self):
        """测试创建带令牌类型的令牌"""
        data = {"sub": "user123"}
        token = create_access_token(data, token_type="access")

        payload = decode_token(token)
        assert payload is not None
        assert payload["token_type"] == "access"

    def test_create_access_token_contains_iat(self):
        """测试令牌包含签发时间"""
        data = {"sub": "user123"}
        token = create_access_token(data)

        payload = decode_token(token)
        assert payload is not None
        assert "iat" in payload


class TestCreateRefreshToken:
    """测试创建刷新令牌"""

    def test_create_refresh_token(self):
        """测试创建刷新令牌"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_refresh_token(data)

        assert isinstance(token, str)

        # 解码验证
        payload = decode_token(token, token_type="refresh")
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["token_type"] == "refresh"


class TestDecodeToken:
    """测试解码令牌"""

    def test_decode_valid_token(self):
        """测试解码有效令牌"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)

        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"

    def test_decode_invalid_token(self):
        """测试解码无效令牌"""
        invalid_token = "invalid.token.here"

        payload = decode_token(invalid_token)
        assert payload is None

    def test_decode_wrong_token_type(self):
        """测试解码错误类型的令牌"""
        data = {"sub": "user123"}

        # 创建访问令牌
        access_token = create_access_token(data, token_type="access")

        # 尝试作为刷新令牌解码
        payload = decode_token(access_token, token_type="refresh")
        assert payload is None

    def test_decode_expired_token(self):
        """测试解码过期令牌"""
        data = {"sub": "user123"}
        # 创建已过期的令牌
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(data, expires_delta=expires_delta)

        # 过期令牌仍可解码，但 verify_token 会返回 False
        payload = decode_token(token)
        assert payload is not None  # 解码成功
        assert "exp" in payload


class TestVerifyToken:
    """测试验证令牌"""

    def test_verify_valid_token(self):
        """测试验证有效令牌"""
        data = {"sub": "user123"}
        token = create_access_token(data)

        assert verify_token(token) is True

    def test_verify_invalid_token(self):
        """测试验证无效令牌"""
        invalid_token = "invalid.token.here"

        assert verify_token(invalid_token) is False

    def test_verify_expired_token(self):
        """测试验证过期令牌"""
        data = {"sub": "user123"}
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(data, expires_delta=expires_delta)

        assert verify_token(token) is False


class TestGetUserIdFromToken:
    """测试从令牌获取用户 ID"""

    def test_get_user_id_valid_token(self):
        """测试从有效令牌获取用户 ID"""
        data = {"sub": "test-user-id-123"}
        token = create_access_token(data)

        user_id = get_user_id_from_token(token)
        assert user_id == "test-user-id-123"

    def test_get_user_id_invalid_token(self):
        """测试从无效令牌获取用户 ID"""
        invalid_token = "invalid.token.here"

        user_id = get_user_id_from_token(invalid_token)
        assert user_id is None

    def test_get_user_id_without_sub(self):
        """测试从没有 sub 字段的令牌获取用户 ID"""
        data = {"email": "test@example.com"}  # 没有 sub 字段
        token = create_access_token(data)

        user_id = get_user_id_from_token(token)
        assert user_id is None
