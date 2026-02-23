"""
API 路由集成测试
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash


class TestAuthEndpoints:
    """测试认证端点"""

    def test_register_user_success(self, client: TestClient):
        """测试用户注册成功"""
        response = client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "user" in data
        assert "tokens" in data
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]

    def test_register_user_duplicate_email(self, client: TestClient):
        """测试注册用户邮箱重复"""
        # 先注册一个用户
        client.post("/api/auth/register", json={
            "username": "testuser",
            "email": "duplicate@example.com",
            "password": "password123",
        })

        # 尝试用相同邮箱注册
        response = client.post("/api/auth/register", json={
            "username": "anotheruser",
            "email": "duplicate@example.com",
            "password": "password123",
        })

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Email already registered" in data["detail"]

    def test_register_user_duplicate_username(self, client: TestClient):
        """测试注册用户用户名重复"""
        # 先注册一个用户
        client.post("/api/auth/register", json={
            "username": "uniqueuser",
            "email": "unique@example.com",
            "password": "password123",
        })

        # 尝试用相同用户名注册
        response = client.post("/api/auth/register", json={
            "username": "uniqueuser",
            "email": "another@example.com",
            "password": "password123",
        })

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Username already taken" in data["detail"]

    def test_login_success(self, client: TestClient):
        """测试登录成功"""
        # 先注册用户
        client.post("/api/auth/register", json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "password123",
        })

        # 登录
        response = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "user" in data
        assert "tokens" in data
        assert data["user"]["email"] == "login@example.com"

    def test_login_wrong_password(self, client: TestClient):
        """测试登录密码错误"""
        # 先注册用户
        client.post("/api/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
        })

        # 尝试错误密码
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword",
        })

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Incorrect email or password" in data["detail"]

    def test_login_user_not_found(self, client: TestClient):
        """测试登录用户不存在"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123",
        })

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Incorrect email or password" in data["detail"]

    def test_refresh_token_success(self, client: TestClient):
        """测试刷新令牌成功"""
        # 先注册并登录
        register_response = client.post("/api/auth/register", json={
            "username": "refreshuser",
            "email": "refresh@example.com",
            "password": "password123",
        })
        refresh_token = register_response.json()["tokens"]["refresh_token"]

        # 刷新令牌
        response = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token,
        })

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_token_invalid(self, client: TestClient):
        """测试刷新无效令牌"""
        response = client.post("/api/auth/refresh", json={
            "refresh_token": "invalid_token",
        })

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_get_profile_authenticated(self, client: TestClient):
        """测试获取用户资料（已认证）"""
        # 先注册并登录
        login_response = client.post("/api/auth/register", json={
            "username": "profileuser",
            "email": "profile@example.com",
            "password": "password123",
        })
        access_token = login_response.json()["tokens"]["access_token"]

        # 获取资料
        response = client.get(
            "/api/auth/profile",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["username"] == "profileuser"
        assert data["email"] == "profile@example.com"

    def test_get_profile_unauthenticated(self, client: TestClient):
        """测试获取用户资料（未认证）"""
        response = client.get("/api/auth/profile")

        assert response.status_code == 401

    def test_change_password_success(self, client: TestClient):
        """测试修改密码成功"""
        # 先注册并登录
        login_response = client.post("/api/auth/register", json={
            "username": "changepassuser",
            "email": "changepass@example.com",
            "password": "oldpassword",
        })
        access_token = login_response.json()["tokens"]["access_token"]

        # 修改密码
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "oldpassword",
                "new_password": "newpassword",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # 验证新密码可以登录
        login_response = client.post("/api/auth/login", json={
            "email": "changepass@example.com",
            "password": "newpassword",
        })

        assert login_response.status_code == 200

    def test_change_password_wrong_current(self, client: TestClient):
        """测试修改密码时当前密码错误"""
        # 先注册并登录
        login_response = client.post("/api/auth/register", json={
            "username": "wrongpassuser",
            "email": "wrongpass@example.com",
            "password": "correctpassword",
        })
        access_token = login_response.json()["tokens"]["access_token"]

        # 尝试修改密码（当前密码错误）
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword",
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Incorrect password" in data["detail"]


class TestHealthEndpoint:
    """测试健康检查端点"""

    def test_health_check(self, client: TestClient):
        """测试健康检查"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "timestamp" in data


class TestRootEndpoint:
    """测试根端点"""

    def test_root(self, client: TestClient):
        """测试根路径"""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()

        assert "name" in data
        assert data["name"] == "Mnemos API"
        assert "version" in data
