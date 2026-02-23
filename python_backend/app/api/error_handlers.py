"""
错误处理器
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """注册异常处理器"""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """处理请求验证错误"""
        logger.warning(f"Validation error: {exc.errors()}")

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": "Validation error",
                "details": exc.errors(),
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(
        request: Request,
        exc: SQLAlchemyError,
    ) -> JSONResponse:
        """处理数据库错误"""
        logger.error(f"Database error: {exc}", exc_info=True)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Database error",
            },
        )

    @app.exception_handler(ValidationError)
    async def pydantic_exception_handler(
        request: Request,
        exc: ValidationError,
    ) -> JSONResponse:
        """处理 Pydantic 验证错误"""
        logger.warning(f"Pydantic validation error: {exc.errors()}")

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Response validation error",
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """处理通用异常"""
        logger.error(f"Unhandled error: {exc}", exc_info=True)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Internal server error",
            },
        )

    @app.exception_handler(404)
    async def not_found_handler(
        request: Request,
        exc: Any,
    ) -> JSONResponse:
        """处理 404 错误"""
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "error": "Not found",
            },
        )


def create_error_response(
    error: str,
    detail: Optional[dict] = None,
    code: Optional[str] = None,
    status_code: int = 400,
) -> JSONResponse:
    """创建错误响应"""
    content = {
        "success": False,
        "error": error,
    }
    if detail:
        content["detail"] = detail
    if code:
        content["code"] = code

    return JSONResponse(status_code=status_code, content=content)
