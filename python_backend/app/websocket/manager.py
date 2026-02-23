"""
WebSocket 管理器
"""
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # 活跃连接
        self.active_connections: Dict[str, WebSocket] = {}
        # 房间
        self.rooms: Dict[str, List[str]] = {}
        # 用户到连接的映射
        self.user_connections: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, connection_id: str) -> None:
        """接受 WebSocket 连接"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"New WebSocket connection: {connection_id}")

    def disconnect(self, connection_id: str) -> None:
        """断开 WebSocket 连接"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # 从所有房间中移除
        for room_id in list(self.rooms.keys()):
            if connection_id in self.rooms[room_id]:
                self.rooms[room_id].remove(connection_id)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]

        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_personal(self, message: dict, connection_id: str) -> bool:
        """发送个人消息"""
        if connection_id not in self.active_connections:
            return False

        websocket = self.active_connections[connection_id]
        try:
            await websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(f"Error sending message to {connection_id}: {e}")
            return False

    async def broadcast(self, message: dict) -> None:
        """广播消息到所有连接"""
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected.append(connection_id)

        # 清理断开的连接
        for connection_id in disconnected:
            self.disconnect(connection_id)

    async def join_room(self, connection_id: str, room_id: str) -> None:
        """加入房间"""
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(connection_id)
        logger.info(f"Connection {connection_id} joined room {room_id}")

    async def leave_room(self, connection_id: str, room_id: str) -> None:
        """离开房间"""
        if room_id in self.rooms and connection_id in self.rooms[room_id]:
            self.rooms[room_id].remove(connection_id)
            logger.info(f"Connection {connection_id} left room {room_id}")

    async def send_to_room(self, message: dict, room_id: str) -> None:
        """发送消息到房间"""
        if room_id not in self.rooms:
            return

        disconnected = []
        for connection_id in self.rooms[room_id]:
            if connection_id in self.active_connections:
                websocket = self.active_connections[connection_id]
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to room {room_id}, connection {connection_id}: {e}")
                    disconnected.append(connection_id)

        # 清理断开的连接
        for connection_id in disconnected:
            self.disconnect(connection_id)

    def get_room_members(self, room_id: str) -> List[str]:
        """获取房间成员"""
        return self.rooms.get(room_id, [])

    def get_user_connections(self, user_id: str) -> List[str]:
        """获取用户的连接"""
        return self.user_connections.get(user_id, [])

    async def send_to_user(self, message: dict, user_id: str) -> None:
        """发送消息到用户的所有连接"""
        connection_ids = self.get_user_connections(user_id)
        for connection_id in connection_ids:
            await self.send_personal(message, connection_id)


# 全局 WebSocket 管理器实例
websocket_manager = ConnectionManager()


def get_websocket_manager() -> ConnectionManager:
    """获取 WebSocket 管理器实例"""
    return websocket_manager
