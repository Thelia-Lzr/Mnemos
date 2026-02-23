# Mnemos 项目架构文档

## 概述

Mnemos 是一个全栈 AI 驱动的语言学习应用，具有实时互动功能。

## 系统架构

```mermaid
graph TB
    subgraph Client["客户端层"]
        Browser[Web 浏览器]
        React[React 18 前端]
    end

    subgraph CDN["CDN/静态资源"]
        Static[静态资源]
    end

    subgraph Server["服务器层"]
        LB[负载均衡]
        Node[Node.js/Express 服务器]
        Socket[Socket.io 服务器]
    end

    subgraph Cache["缓存层"]
        Redis[Redis 缓存]
        Session[会话存储]
    end

    subgraph Queue["任务队列"]
        Bull[Bull 队列]
        Workers[后台工作者]
    end

    subgraph Storage["存储层"]
        PG[(PostgreSQL)]
        Logs[应用日志]
    end

    subgraph External["外部服务"]
        OpenRouter[OpenRouter AI API]
        Payment[支付网关]
    end

    Browser --> React
    React --> LB
    LB --> Node
    Node --> Socket
    Node --> Redis
    Node --> Bull
    Node --> PG
    Socket --> Redis
    Bull --> Workers
    Workers --> PG
    Workers --> Redis
    Node --> OpenRouter
    Node --> Payment
    React --> Static
```

## 后端架构

```mermaid
graph TB
    subgraph Entry["入口"]
        Server[server.ts]
    end

    subgraph Middleware["中间件层"]
        ErrorHandler[errorHandler]
        Security[security/auth]
        Performance[performance]
        Validate[validate]
        NotFound[notFoundHandler]
    end

    subgraph Routes["API 路由"]
        Auth[authRoutes]
        User[userRoutes]
        Chat[chatRoutes]
        Practice[practiceRoutes]
        Vocab[vocabularyRoutes]
        PK[pkRoutes]
        Payment[paymentRoutes]
        Admin[adminRoutes]
        Tasks[taskRoutes]
        Assessment[assessmentRoutes]
        DailyRec[dailyRecommendationRoutes]
        Monitoring[monitoringRoutes]
        UserLang[userLanguageRoutes]
    end

    subgraph Controllers["控制器"]
        AuthCtrl[AuthController]
        UserCtrl[UserController]
        ChatCtrl[ChatController]
        PracticeCtrl[PracticeController]
        VocabCtrl[VocabularyController]
        PKCtrl[PKController]
        PaymentCtrl[PaymentController]
        AdminCtrl[AdminController]
        TaskCtrl[TaskController]
        AssessCtrl[AssessmentController]
        DailyRecCtrl[DailyRecommendationController]
        UserLangCtrl[UserLanguageController]
        SimpleUserCtrl[SimpleUserController]
    end

    subgraph Services["业务服务"]
        AISvc[AIService]
        AIFunc[AIFunctionService]
        AIPrompt[AIPromptService]
        AIAssess[AIAssessmentService]
        ChatService[ChatService]
        UserService[UserService]
        PracticeGen[PracticeGenerationService]
        PracticeQ[PracticeQuestionService]
        PracticeAna[PracticeAnalysisService]
        PracticeEval[PracticeEvaluationService]
        VocabPractice[VocabularyPracticeService]
        VocabService[VocabularyService]
        PKBattle[PKBattleService]
        PKMatch[PKMatchingService]
        PKReward[PKRewardService]
        PKScheduler[PKSchedulerService]
        MMR[MMRService]
        PaymentSvc[PaymentService]
        PaymentGW[PaymentGatewayService]
        Credit[CreditService]
        TaskQueue[TaskQueueManager]
        AsyncTask[AsyncTaskManager]
        TaskResult[TaskResultManager]
        DailyRecSvc[DailyRecommendationService]
        Capability[UserCapabilityService]
        CapabilityUpdate[CapabilityUpdateService]
        Reassessment[ReassessmentService]
        UserLangSvc[UserLanguageService]
        MonitorSvc[MonitoringService]
        DBOptim[DatabaseOptimizationService]
        CacheSvc[CacheService]
        Forgetting[ForgettingCurveService]
        OpenRouter[OpenRouterService]
    end

    subgraph Models["数据模型"]
        User[User]
        ChatMsg[ChatMessage]
        PracticeGp[PracticeGroup]
        VocabWord[VocabularyWord]
        UserCap[UserCapability]
        PaymentOrd[PaymentOrder]
        RechargePkg[RechargePackage]
    end

    subgraph Config["配置"]
        DB[database.ts]
        Redis[redis.ts]
        Migration[migration.ts]
        Models[modelConfig.ts]
    end

    Server --> Middleware
    Middleware --> Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> Models
    Services --> Config
```

## 前端架构

```mermaid
graph TB
    subgraph Root["应用根组件"]
        App[App.tsx]
        Index[index.tsx]
    end

    subgraph Theme["主题系统"]
        Theme[theme.ts]
        Light[浅色模式]
        Dark[深色模式]
    end

    subgraph Store["Redux Store"]
        Store[store.ts]
        Hooks[hooks.ts]
    end

    subgraph Slices["Redux Slices"]
        Auth[authSlice]
        Chat[chatSlice]
        Practice[practiceSlice]
        Vocab[vocabularySlice]
        PK[pkSlice]
        Payment[paymentSlice]
        DailyRec[dailyRecommendationSlice]
    end

    subgraph Pages["页面组件"]
        Dashboard[DashboardPage]
        AuthP[AuthPage]
        ChatP[ChatPage]
        PracticeP[PracticePage]
        VocabP[VocabularyPage]
        PKP[PKArenaPage]
        ProfileP[ProfilePage]
        AdminP[AdminPage]
        AssessmentP[AssessmentPage]
        RechargeP[RechargePage]
        PracticeHist[PracticeHistoryPage]
    end

    subgraph Components["组件层"]
        Layout[布局组件]
        Common[通用 UI 组件]
        Feature[功能组件]
    end

    subgraph Services["API 服务"]
        Api[api.ts]
        ChatApi[chatApi]
        PracticeApi[practiceApi]
        VocabApi[vocabularyApi]
        PaymentApi[paymentApi]
        AdminApi[adminApi]
        AssessmentApi[assessmentApi]
        UserLangApi[userLanguageApi]
        DailyRecApi[dailyRecommendationApi]
    end

    subgraph Utils["工具函数"]
        Security[security.ts]
        Validation[validation.ts]
        ErrorH[errorHandler.ts]
        Perf[performance.ts]
        Constants[constants.ts]
    end

    subgraph Types["类型定义"]
        Types[types/index.ts]
    end

    Index --> App
    App --> Theme
    App --> Store
    Store --> Slices
    App --> Pages
    Pages --> Components
    Pages --> Services
    Services --> Utils
    Services --> Types
```

## 组件架构

```mermaid
graph TB
    subgraph Layout["布局组件"]
        Layout[Layout.tsx]
    end

    subgraph Auth["认证"]
        Protected[ProtectedRoute]
        Password[PasswordStrengthIndicator]
    end

    subgraph Common["通用 UI"]
        Loading[LoadingSpinner]
        LoadBtn[LoadingButton]
        ErrorB[ErrorBoundary]
        Markdown[MarkdownRenderer]
        Notif[NotificationProvider]
        PageTrans[PageTransition]
    end

    subgraph Chat["聊天组件"]
        ChatInterface[ChatInterface]
        MsgBubble[MessageBubble]
        TaskProg[TaskProgressIndicator]
    end

    subgraph Practice["练习组件"]
        Question[QuestionCard]
        Group[PracticeGroup]
        Result[PracticeResultDetail]
        Summary[ResultSummary]
        FollowUp[FollowUpDialog]
        InlineFollow[InlineFollowUp]
    end

    subgraph Vocabulary["词汇组件"]
        WordCard[VocabularyWordCard]
        Mastery[MasteryStatsCard]
        VocabPractice[VocabularyPractice]
    end

    subgraph PK["PK 对战组件"]
        Battle[PKBattleInterface]
        Match[PKMatchingInterface]
        History[PKBattleHistory]
        Leaderboard[PKLeaderboard]
    end

    subgraph Payment["支付组件"]
        PkgCard[PackageCard]
        Method[PaymentMethodSelector]
        Balance[CreditBalance]
        TransHist[TransactionHistory]
    end

    subgraph DailyRec["每日推荐"]
        RecCard[DailyRecommendationCard]
        RecItem[RecommendationItem]
        QuickPractice[QuickPracticeOptions]
        Feedback[FeedbackModal]
    end

    subgraph Admin["管理组件"]
        SysStats[SystemStats]
        UserMgr[UserManager]
        PkgMgr[PackageManager]
        TaskMgr[TaskQueueManager]
        Monitor[OpenRouterConfig]
        SysMon[SystemMonitoring]
    end

    subgraph Profile["用户资料"]
        PracticeHist[PracticeHistorySummary]
    end
```

## 数据库 Schema

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email
        varchar password_hash
        jsonb capabilities
        integer credits
        timestamp created_at
    }

    chat_messages {
        uuid id PK
        uuid user_id FK
        text message
        text response
        jsonb analysis
        timestamp created_at
    }

    practice_groups {
        uuid id PK
        uuid user_id FK
        jsonb questions
        integer score
        timestamp created_at
    }

    vocabulary_words {
        uuid id PK
        uuid user_id FK
        varchar word
        varchar meaning
        varchar example_sentence
        integer mastery_level
        timestamp next_review
        timestamp created_at
    }

    user_capabilities {
        uuid id PK
        uuid user_id FK
        varchar capability_type
        integer level
        jsonb metrics
        timestamp updated_at
    }

    payment_orders {
        uuid id PK
        uuid user_id FK
        integer package_id
        varchar payment_method
        varchar status
        timestamp created_at
    }

    recharge_packages {
        integer id PK
        varchar name
        integer credits
        decimal price
    }

    users ||--o{ chat_messages : "拥有"
    users ||--o{ practice_groups : "拥有"
    users ||--o{ vocabulary_words : "拥有"
    users ||--o{ user_capabilities : "拥有"
    users ||--o{ payment_orders : "下单"
```

## 数据流

### 认证流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端
    participant DB as 数据库
    participant R as Redis

    U->>F: 输入凭证
    F->>B: POST /api/auth/login
    B->>DB: 验证凭证
    DB-->>B: 用户数据
    B->>B: 生成 JWT 令牌
    B->>R: 存储刷新令牌
    B-->>F: 返回访问 + 刷新令牌
    F->>F: 安全存储令牌
    F-->>U: 导航到仪表盘
```

### AI 聊天流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant S as Socket.io
    participant B as 后端
    participant AI as OpenRouter
    participant DB as 数据库

    U->>F: 发送消息
    F->>S: 发送聊天消息
    S->>B: 接收消息
    B->>DB: 存储消息
    B->>AI: 发送到 AI
    AI-->>B: AI 响应
    B->>B: 分析响应
    B->>DB: 存储分析
    B->>S: 发送响应
    S->>F: 接收响应
    F-->>U: 显示响应
```

### PK 对战流程

```mermaid
sequenceDiagram
    participant P1 as 玩家 1
    participant P2 as 玩家 2
    participant F as 前端
    participant S as Socket.io
    participant B as 后端
    participant DB as 数据库

    P1->>F: 加入 PK 竞技场
    F->>S: 发送加入请求
    S->>B: 加入队列
    B->>B: 匹配玩家 (MMR)
    B->>S: 发送匹配成功
    S->>F: 通知双方玩家
    P1->>F: 提交答案
    F->>S: 发送答案
    S->>B: 验证答案
    B->>DB: 更新分数
    B->>S: 广播更新
    S->>F: 更新 UI
    F-->>P1: 显示结果
    F-->>P2: 显示结果
```

### 练习流程（含遗忘曲线）

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant B as 后端
    participant FC as 遗忘曲线服务
    participant DB as 数据库

    U->>F: 开始练习
    F->>B: GET /api/practice/generate
    B->>DB: 获取用户能力
    B->>FC: 计算最优题目
    FC-->>B: 题目集
    B->>DB: 创建练习组
    B-->>F: 返回题目
    U->>F: 提交答案
    F->>B: POST /api/practice/submit
    B->>B: 评估答案
    B->>FC: 更新遗忘曲线
    B->>DB: 存储结果
    B->>DB: 更新能力
    B-->>F: 返回分析
    F-->>U: 显示结果
```

## 目录结构

```
Mnemos/
├── backend/
│   ├── database/
│   │   └── migrations/          # SQL 迁移文件
│   ├── scripts/                 # 工具脚本
│   └── src/
│       ├── config/              # 配置文件
│       ├── controllers/         # 请求处理器
│       ├── middleware/          # Express 中间件
│       ├── models/              # 数据模型
│       ├── routes/              # API 路由定义
│       ├── services/            # 业务逻辑
│       ├── test/                # 测试文件
│       ├── types/               # TypeScript 类型
│       └── utils/               # 工具函数
│
├── frontend/
│   └── src/
│       ├── components/          # React 组件
│       │   ├── Admin/           # 管理组件
│       │   ├── Auth/            # 认证组件
│       │   ├── Chat/            # 聊天组件
│       │   ├── DailyRecommendation/ # 每日推荐组件
│       │   ├── Layout/          # 布局组件
│       │   ├── Payment/         # 支付组件
│       │   ├── PK/              # PK 对战组件
│       │   ├── Practice/        # 练习组件
│       │   ├── Profile/         # 用户资料组件
│       │   ├── Vocabulary/      # 词汇组件
│       │   └── common/          # 通用组件
│       ├── pages/               # 页面组件
│       ├── services/            # API 服务
│       ├── store/               # Redux store
│       │   ├── slices/          # Redux slices
│       │   └── store.ts         # Store 配置
│       ├── theme/               # Material-UI 主题
│       ├── types/               # TypeScript 类型
│       └── utils/               # 工具函数
│
├── database/                    # 数据库文件
├── doc/                         # 文档
│   └── architecture.md          # 架构文档
├── scripts/                     # 根目录脚本
└── .github/                     # GitHub 配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18, Redux Toolkit, Material-UI, TypeScript |
| **后端** | Node.js, Express, TypeScript |
| **数据库** | PostgreSQL 15 |
| **缓存** | Redis 7 |
| **实时通信** | Socket.io |
| **任务队列** | Bull |
| **AI** | OpenRouter API |
| **容器化** | Docker, Docker Compose |

## API 端点概览

| 端点 | 描述 |
|------|------|
| `/api/auth` | 认证（注册、登录、刷新） |
| `/api/users` | 用户管理 |
| `/api/chat` | AI 聊天及分析 |
| `/api/practice` | 练习题目 |
| `/api/vocabulary` | 词汇管理 |
| `/api/pk` | PK 对战 |
| `/api/payment` | 支付处理 |
| `/api/admin` | 管理功能 |
| `/api/tasks` | 后台任务 |
| `/api/daily-recommendations` | 个性化推荐 |
| `/api/monitoring` | 系统监控 |
| `/api/user-languages` | 语言能力 |
| `/api/assessment` | 测试评估 |
