"""
PK 对战服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import random

from app.models.pk import PKBattle, BattleAnswer, UserMMR, MMRHistory, MatchRequest, PKBattleStatus
from app.models.practice import PracticeGroup, Question
from app.models.user import User
from app.services.practice_service import PracticeService


class PKBattleService:
    """PK 对战服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.socket_io = None

    def set_socket_io(self, io):
        """设置 Socket.IO 实例"""
        self.socket_io = io

    async def find_match(
        self,
        user_id: str,
        language: str,
        mmr: int = 1000,
    ) -> Optional[MatchRequest]:
        """
        寻找 PK 对手

        Args:
            user_id: 用户 ID
            language: 语言
            mmr: 用户 MMR

        Returns:
            匹配请求
        """
        # 创建匹配请求
        match_request = MatchRequest(
            user_id=uuid.UUID(user_id),
            language=language,
            mmr=mmr,
            status="waiting",
        )
        self.db.add(match_request)

        # 查找合适的对手
        opponent = await self._find_opponent(user_id, language, mmr)

        if opponent:
            # 找到对手，创建对战
            battle = await self._create_battle(user_id, str(opponent.user_id), language)

            # 删除匹配请求
            await self.db.delete(match_request)

            # 通知双方
            if self.socket_io:
                self.socket_io.emit("match_found", {
                    "battleId": str(battle.id),
                    "opponent": str(opponent.user_id),
                }, room=str(user_id))
                self.socket_io.emit("match_found", {
                    "battleId": str(battle.id),
                    "opponent": user_id,
                }, room=str(opponent.user_id))
        else:
            await self.db.commit()
            return match_request

        await self.db.commit()
        return None

    async def cancel_match(self, user_id: str) -> bool:
        """取消匹配"""
        result = await self.db.execute(
            select(MatchRequest).where(
                MatchRequest.user_id == uuid.UUID(user_id),
                MatchRequest.status == "waiting",
            )
        )
        match_request = result.scalar_one_or_none()

        if match_request:
            await self.db.delete(match_request)
            await self.db.commit()
            return True
        return False

    async def get_battle(self, battle_id: str) -> Optional[PKBattle]:
        """获取对战信息"""
        result = await self.db.execute(
            select(PKBattle).where(PKBattle.id == uuid.UUID(battle_id))
        )
        return result.scalar_one_or_none()

    async def start_battle(self, battle_id: str, user_id: str) -> PKBattle:
        """
        开始对战

        Args:
            battle_id: 对战 ID
            user_id: 用户 ID
        """
        battle = await self.get_battle(battle_id)

        if not battle:
            raise ValueError("Battle not found")

        if str(battle.player1_id) != user_id and str(battle.player2_id) != user_id:
            raise ValueError("Not a participant")

        # 如果两个玩家都准备好了，生成练习题
        if battle.status == PKBattleStatus.WAITING:
            # 生成练习
            practice_service = PracticeService(self.db)
            practice_group = await practice_service.generate_practice_group(
                user_id=str(battle.player1_id),
                language=battle.language,
                skill_areas=["vocabulary", "grammar"],
                difficulty="intermediate",
                question_count=10,
                title=f"PK Battle: {str(battle.player1_id)[:8]} vs {str(battle.player2_id)[:8]}",
            )

            battle.practice_group_id = practice_group.id
            battle.status = PKBattleStatus.IN_PROGRESS
            battle.start_time = datetime.utcnow()

            await self.db.commit()

            # 通知双方对战开始
            if self.socket_io:
                self.socket_io.emit("battle_started", {
                    "battleId": str(battle.id),
                    "practiceGroupId": str(practice_group.id),
                }, to=str(battle.id))

        return battle

    async def submit_answer(
        self,
        battle_id: str,
        user_id: str,
        question_index: int,
        answer: str,
    ) -> Dict[str, Any]:
        """
        提交答案

        Args:
            battle_id: 对战 ID
            user_id: 用户 ID
            question_index: 题目索引
            answer: 答案

        Returns:
            提交结果
        """
        battle = await self.get_battle(battle_id)

        if not battle:
            raise ValueError("Battle not found")

        if battle.status != PKBattleStatus.IN_PROGRESS:
            raise ValueError("Battle not in progress")

        # 获取问题
        if battle.practice_group_id:
            result = await self.db.execute(
                select(Question)
                .where(Question.practice_group_id == battle.practice_group_id)
                .where(Question.order_index == question_index)
            )
            question = result.scalar_one_or_none()

            if not question:
                raise ValueError("Question not found")

            # 检查答案
            is_correct = str(answer).strip().lower() == str(question.correct_answer).strip().lower()

            # 记录答案
            battle_answer = BattleAnswer(
                battle_id=battle.id,
                user_id=uuid.UUID(user_id),
                question_index=question_index,
                answer=answer,
                is_correct=is_correct,
                time_taken=0,  # TODO: 计算用时
            )
            self.db.add(battle_answer)

            # 更新分数
            if is_correct:
                if str(user_id) == str(battle.player1_id):
                    battle.player1_score += 1
                else:
                    battle.player2_score += 1

            await self.db.commit()

            # 广播进度更新
            if self.socket_io:
                self.socket_io.emit("progress_update", {
                    "battleId": str(battle.id),
                    "player1Score": battle.player1_score,
                    "player2Score": battle.player2_score,
                    "submittedBy": user_id,
                    "isCorrect": is_correct,
                })

            return {
                "isCorrect": is_correct,
                "correctAnswer": question.correct_answer if not is_correct else None,
                "explanation": question.explanation,
            }

        raise ValueError("No practice group associated with battle")

    async def finish_battle(self, battle_id: str) -> PKBattle:
        """
        结束对战并计算结果

        Args:
            battle_id: 对战 ID
        """
        battle = await self.get_battle(battle_id)

        if not battle:
            raise ValueError("Battle not found")

        # 确定胜者
        if battle.player1_score > battle.player2_score:
            battle.winner_id = battle.player1_id
        elif battle.player2_score > battle.player1_id:
            battle.winner_id = battle.player2_id
        # 平局则 winner_id 为 None

        battle.status = PKBattleStatus.COMPLETED
        battle.end_time = datetime.utcnow()

        # 更新 MMR
        await self._update_mmr(battle)

        await self.db.commit()

        # 通知双方对战结束
        if self.socket_io:
            self.socket_io.emit("battle_finished", {
                "battleId": str(battle.id),
                "winnerId": str(battle.winner_id) if battle.winner_id else None,
                "player1Score": battle.player1_score,
                "player2Score": battle.player2_score,
                "player1MmrChange": battle.player1_mmr_change,
                "player2MmrChange": battle.player2_mmr_change,
            })

        return battle

    async def get_battle_history(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[PKBattle]:
        """获取对战历史"""
        result = await self.db.execute(
            select(PKBattle)
            .where(
                (PKBattle.player1_id == uuid.UUID(user_id)) |
                (PKBattle.player2_id == uuid.UUID(user_id))
            )
            .where(PKBattle.status == PKBattleStatus.COMPLETED)
            .order_by(PKBattle.end_time.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_user_mmr(
        self,
        user_id: str,
        language: str,
    ) -> Optional[UserMMR]:
        """获取用户 MMR"""
        result = await self.db.execute(
            select(UserMMR).where(
                UserMMR.user_id == uuid.UUID(user_id),
                UserMMR.language == language,
            )
        )
        return result.scalar_one_or_none()

    async def get_leaderboard(
        self,
        language: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """获取排行榜"""
        result = await self.db.execute(
            select(UserMMR, User.username)
            .join(User, UserMMR.user_id == User.id)
            .where(UserMMR.language == language)
            .order_by(UserMMR.current_mmr.desc())
            .limit(limit)
        )

        leaderboard = []
        for rank, (mmr, username) in enumerate(result.all(), 1):
            leaderboard.append({
                "rank": rank,
                "userId": str(mmr.user_id),
                "username": username,
                "currentMmr": mmr.current_mmr,
                "totalBattles": mmr.total_battles,
                "wins": mmr.wins,
                "winRate": mmr.win_rate,
            })

        return leaderboard

    async def _find_opponent(
        self,
        user_id: str,
        language: str,
        mmr: int,
        mmr_range: int = 200,
    ) -> Optional[MatchRequest]:
        """寻找对手"""
        result = await self.db.execute(
            select(MatchRequest).where(
                MatchRequest.language == language,
                MatchRequest.status == "waiting",
                MatchRequest.user_id != uuid.UUID(user_id),
                MatchRequest.mmr >= mmr - mmr_range,
                MatchRequest.mmr <= mmr + mmr_range,
            )
        )
        return result.scalar_one_or_none()

    async def _create_battle(
        self,
        player1_id: str,
        player2_id: str,
        language: str,
    ) -> PKBattle:
        """创建对战"""
        battle = PKBattle(
            player1_id=uuid.UUID(player1_id),
            player2_id=uuid.UUID(player2_id),
            language=language,
            status=PKBattleStatus.WAITING,
        )
        self.db.add(battle)
        await self.db.flush()
        return battle

    async def _update_mmr(self, battle: PKBattle) -> None:
        """更新 MMR"""
        if not battle.winner_id and battle.player1_score == battle.player2_score:
            # 平局
            return

        # 简单 MMR 计算（Elo 系统简化版）
        K_FACTOR = 32

        player1_mmr = await self._get_or_create_mmr(str(battle.player1_id), battle.language)
        player2_mmr = await self._get_or_create_mmr(str(battle.player2_id), battle.language)

        # 计算期望胜率
        expected1 = 1 / (1 + 10 ** ((player2_mmr.current_mmr - player1_mmr.current_mmr) / 400))
        expected2 = 1 / (1 + 10 ** ((player1_mmr.current_mmr - player2_mmr.current_mmr) / 400))

        # 实际结果
        if battle.winner_id == battle.player1_id:
            actual1, actual2 = 1, 0
            battle.winner_id = battle.player1_id
        else:
            actual1, actual2 = 0, 1
            battle.winner_id = battle.player2_id

        # 更新 MMR
        mmr_change1 = int(K_FACTOR * (actual1 - expected1))
        mmr_change2 = int(K_FACTOR * (actual2 - expected2))

        player1_mmr.current_mmr += mmr_change1
        player2_mmr.current_mmr += mmr_change2

        # 更新统计
        player1_mmr.total_battles += 1
        player2_mmr.total_battles += 1

        if actual1 == 1:
            player1_mmr.wins += 1
        else:
            player2_mmr.wins += 1

        player1_mmr.win_rate = player1_mmr.wins / player1_mmr.total_battles
        player2_mmr.win_rate = player2_mmr.wins / player2_mmr.total_battles

        # 记录 MMR 变化
        battle.player1_mmr_change = mmr_change1
        battle.player2_mmr_change = mmr_change2

        # 记录历史
        mmr_history1 = MMRHistory(
            user_id=battle.player1_id,
            language=battle.language,
            mmr_before=player1_mmr.current_mmr - mmr_change1,
            mmr_after=player1_mmr.current_mmr,
            mmr_change=mmr_change1,
            battle_id=battle.id,
            is_win=(actual1 == 1),
        )
        mmr_history2 = MMRHistory(
            user_id=battle.player2_id,
            language=battle.language,
            mmr_before=player2_mmr.current_mmr - mmr_change2,
            mmr_after=player2_mmr.current_mmr,
            mmr_change=mmr_change2,
            battle_id=battle.id,
            is_win=(actual2 == 1),
        )
        self.db.add(mmr_history1)
        self.db.add(mmr_history2)

    async def _get_or_create_mmr(self, user_id: str, language: str) -> UserMMR:
        """获取或创建 MMR 记录"""
        result = await self.db.execute(
            select(UserMMR).where(
                UserMMR.user_id == uuid.UUID(user_id),
                UserMMR.language == language,
            )
        )
        mmr = result.scalar_one_or_none()

        if not mmr:
            mmr = UserMMR(
                user_id=uuid.UUID(user_id),
                language=language,
                current_mmr=1000,
            )
            self.db.add(mmr)
            await self.db.flush()

        return mmr

    # WebSocket 房间管理
    def join_battle_room(self, connection_id: str, battle_id: str) -> None:
        """加入对战房间"""
        if self.socket_io:
            self.socket_io.enter_room(battle_id, battle_id)

    def leave_battle_room(self, connection_id: str, battle_id: str) -> None:
        """离开对战房间"""
        if self.socket_io:
            self.socket_io.leave_room(battle_id, battle_id)


def get_pk_battle_service(db: AsyncSession) -> PKBattleService:
    """获取 PK 对战服务实例"""
    return PKBattleService(db)
