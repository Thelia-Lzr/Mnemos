"""
认证服务单元测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth_service import AuthService, get_auth_service
from app.models.user import User


class TestAuthService:
    """测试 AuthService 类"""

    @pytest.fixture
    def mock_db(self) -> AsyncSession:
        """模拟数据库会话"""
        db = AsyncMock(spec=AsyncSession)
        return db

    @pytest.fixture
    def auth_service(self, mock_db: AsyncSession) -> AuthService:
        """创建认证服务实例"""
        return AuthService(mock_db)

    @pytest.mark.asyncio
    async def test_authenticate_success(self, auth_service: AuthService, mock_db: AsyncSession):
        """测试认证成功"""
        # 准备测试数据
        mock_user = User(
            id="123e4567-e89b-12d3-a456-426614174000",
            username="testuser",
            email="test@example.com",
            password_hash="$2b$12$KIXxwJ7..",  # bcrypt hash of "password123"
            role="user",
        )

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute = AsyncMock(return_value=mock_result)

        # 执行测试
        with patch('app.services.auth_service.verify_password', return_value=True):
            result = await auth_service.authenticate("test@example.com", "password123")

        # 验证结果
        assert result is not None
        assert result.email == "test@example.com"
        assert result.username == "testuser"

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, auth_service: AuthService, mock_db: AsyncSession):
        """测试用户不存在"""
        # 模拟数据库查询返回 None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # 执行测试
        result = await auth_service.authenticate("nonexistent@example.com", "password123")

        # 验证结果
        assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_wrong_password(self, auth_service: AuthService, mock_db: AsyncSession):
        """测试密码错误"""
        # 准备测试数据
        mock_user = User(
            id="123e4567-e89b-12d3-a456-426614174000",
            username="testuser",
            email="test@example.com",
            password_hash="$2b$12$KIXxwJ7..",
            role="user",
        )

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute = AsyncMock(return_value=mock_result)

        # 模拟密码验证失败
        with patch('app.services.auth_service.verify_password', return_value=False):
            result = await auth_service.authenticate("test@example.com", "wrongpassword")

        # 验证结果
        assert result is None

    @pytest.mark.asyncio
    async def test_generate_tokens(self, auth_service: AuthService):
        """测试生成令牌"""
        # 准备测试数据
        mock_user = User(
            id="123e4567-e89b-12d3-a456-426614174000",
            username="testuser",
            email="test@example.com",
            role="user",
        )

        # 执行测试
        tokens = auth_service.generate_tokens(mock_user)

        # 验证结果
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
        assert tokens["expires_in"] == 1800
        assert isinstance(tokens["access_token"], str)
        assert isinstance(tokens["refresh_token"], str)

    @pytest.mark.asyncio
    async def test_change_password_success(self, auth_service: AuthService, mock_db: AsyncSession):
        """测试修改密码成功"""
        # 准备测试数据
        mock_user = User(
            id="123e4567-e89b-12d3-a456-426614174000",
            username="testuser",
            email="test@example.com",
            password_hash="$2b$12$KIXxwJ7..",
            role="user",
        )

        # 模拟密码验证成功
        with patch('app.services.auth_service.verify_password', return_value=True):
            with patch('app.services.auth_service.get_password_hash', return_value="new_hash"):
                mock_db.commit = AsyncMock()

                result = await auth_service.change_password(
                    mock_user,
                    "current_password",
                    "new_password",
                )

        # 验证结果
        assert result is True
        assert mock_user.password_hash == "new_hash"

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, auth_service: AuthService, mock_db: AsyncSession):
        """测试修改密码时当前密码错误"""
        # 准备测试数据
        mock_user = User(
            id="123e4567-e89b-12d3-a456-426614174000",
            username="testuser",
            email="test@example.com",
            password_hash="$2b$12$KIXxwJ7..",
            role="user",
        )

        # 模拟密码验证失败
        with patch('app.services.auth_service.verify_password', return_value=False):
            result = await auth_service.change_password(
                mock_user,
                "wrong_password",
                "new_password",
            )

        # 验证结果
        assert result is False


class TestGetAuthService:
    """测试 get_auth_service 工厂函数"""

    def test_get_auth_service(self):
        """测试获取认证服务实例"""
        mock_db = AsyncMock(spec=AsyncSession)

        service = get_auth_service(mock_db)

        assert isinstance(service, AuthService)
        assert service.db == mock_db
