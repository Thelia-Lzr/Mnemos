"""
Pydantic 模式定义
"""
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserProfileResponse,
    UserPreferencesUpdate,
    UserPreferencesResponse,
    UserCapabilityCreate,
    UserCapabilityUpdate,
    UserCapabilityResponse,
    UserLearningLanguageCreate,
    UserLearningLanguageUpdate,
    UserLearningLanguageResponse,
    UserLearningStatusResponse,
)
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    SendMessageRequest,
    SendMessageResponse,
    UploadMaterialResponse,
    FunctionCallRequest,
    FunctionCallResponse,
    FunctionResult,
    IntentResult,
    ParseIntentResponse,
    ChatHistoryResponse,
)
from app.schemas.practice import (
    PracticeGroupCreate,
    PracticeGroupResponse,
    QuestionResponse,
    PracticeResultResponse,
    PracticeAIAnalysisResponse,
    PracticeSubmitRequest,
    PracticeGenerateRequest,
    PracticeHistoryResponse,
    PracticeFollowupRequest,
)
from app.schemas.vocabulary import (
    VocabularyWordCreate,
    VocabularyWordResponse,
    VocabularyWordUpdate,
    VocabularyWordListResponse,
    MasteryStatsResponse,
    VocabularyPracticeRequest,
    VocabularySubmitPracticeRequest,
)
from app.schemas.pk import (
    PKBattleResponse,
    PKMatchRequest,
    PKSubmitAnswerRequest,
    UserMMRResponse,
    PKLeaderboardEntry,
    PKMatchStatusResponse,
    PKStatsResponse,
)
from app.schemas.task import (
    AsyncTaskResponse,
    TaskStatusResponse,
    TaskResultResponse,
)
from app.schemas.recommendation import (
    DailyRecommendationResponse,
    RecommendationFeedbackRequest,
)
from app.schemas.assessment import (
    UserCapabilityResponse as AssessmentUserCapabilityResponse,
    ComprehensiveAssessmentRequest,
    ReassessmentRequest,
)
from app.schemas.common import (
    APIResponse,
    PaginatedResponse,
    HealthCheckResponse,
    ErrorResponse,
)

__all__ = [
    # User
    "UserResponse",
    "UserUpdate",
    "UserProfileResponse",
    "UserPreferencesUpdate",
    "UserPreferencesResponse",
    "UserCapabilityCreate",
    "UserCapabilityUpdate",
    "UserCapabilityResponse",
    "UserLearningLanguageCreate",
    "UserLearningLanguageUpdate",
    "UserLearningLanguageResponse",
    "UserLearningStatusResponse",
    # Chat
    "ChatMessageCreate",
    "ChatMessageResponse",
    "SendMessageRequest",
    "SendMessageResponse",
    "UploadMaterialResponse",
    "FunctionCallRequest",
    "FunctionCallResponse",
    "FunctionResult",
    "IntentResult",
    "ParseIntentResponse",
    "ChatHistoryResponse",
    # Practice
    "PracticeGroupCreate",
    "PracticeGroupResponse",
    "QuestionResponse",
    "PracticeResultResponse",
    "PracticeAIAnalysisResponse",
    "PracticeSubmitRequest",
    "PracticeGenerateRequest",
    "PracticeHistoryResponse",
    "PracticeFollowupRequest",
    # Vocabulary
    "VocabularyWordCreate",
    "VocabularyWordResponse",
    "VocabularyWordUpdate",
    "VocabularyWordListResponse",
    "MasteryStatsResponse",
    "VocabularyPracticeRequest",
    "VocabularySubmitPracticeRequest",
    # PK
    "PKBattleResponse",
    "PKMatchRequest",
    "PKSubmitAnswerRequest",
    "UserMMRResponse",
    "PKLeaderboardEntry",
    "PKMatchStatusResponse",
    "PKStatsResponse",
    # Task
    "AsyncTaskResponse",
    "TaskStatusResponse",
    "TaskResultResponse",
    # Recommendation
    "DailyRecommendationResponse",
    "RecommendationFeedbackRequest",
    # Assessment
    "AssessmentUserCapabilityResponse",
    "ComprehensiveAssessmentRequest",
    "ReassessmentRequest",
    # Common
    "APIResponse",
    "PaginatedResponse",
    "HealthCheckResponse",
    "ErrorResponse",
]
