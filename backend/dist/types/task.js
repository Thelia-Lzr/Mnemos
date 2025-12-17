"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutionStatus = exports.TaskPriority = exports.AITaskType = void 0;
var AITaskType;
(function (AITaskType) {
    AITaskType["CHAT_RESPONSE"] = "chat_response";
    AITaskType["PRACTICE_GENERATION"] = "practice_generation";
    AITaskType["MATERIAL_ANALYSIS"] = "material_analysis";
    AITaskType["LEVEL_ASSESSMENT"] = "level_assessment";
    AITaskType["DAILY_RECOMMENDATION"] = "daily_recommendation";
    AITaskType["VOCABULARY_EXTRACTION"] = "vocabulary_extraction";
    AITaskType["FUNCTION_CALL"] = "function_call";
})(AITaskType = exports.AITaskType || (exports.AITaskType = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["LOW"] = 1] = "LOW";
    TaskPriority[TaskPriority["NORMAL"] = 2] = "NORMAL";
    TaskPriority[TaskPriority["HIGH"] = 3] = "HIGH";
    TaskPriority[TaskPriority["URGENT"] = 4] = "URGENT";
})(TaskPriority = exports.TaskPriority || (exports.TaskPriority = {}));
var TaskExecutionStatus;
(function (TaskExecutionStatus) {
    TaskExecutionStatus["QUEUED"] = "queued";
    TaskExecutionStatus["PROCESSING"] = "processing";
    TaskExecutionStatus["COMPLETED"] = "completed";
    TaskExecutionStatus["FAILED"] = "failed";
    TaskExecutionStatus["CANCELLED"] = "cancelled";
    TaskExecutionStatus["TIMEOUT"] = "timeout";
})(TaskExecutionStatus = exports.TaskExecutionStatus || (exports.TaskExecutionStatus = {}));
//# sourceMappingURL=task.js.map