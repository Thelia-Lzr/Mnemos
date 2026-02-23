"""
SQLAlchemy 基础模型类
"""
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, func
import uuid


class Base(AsyncAttrs, DeclarativeBase):
    """所有模型的基础类"""

    # 通用的 id 生成方法
    @staticmethod
    def generate_uuid() -> str:
        """生成 UUID"""
        return str(uuid.uuid4())

    # 通用的 to_dict 方法
    def to_dict(self) -> dict:
        """将模型转换为字典"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }

    # 通用的 to_json 方法（排除 None 值）
    def to_json(self) -> dict:
        """将模型转换为 JSON 兼容的字典"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
            if getattr(self, column.name) is not None
        }


class TimestampMixin:
    """时间戳混合类"""

    created_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
