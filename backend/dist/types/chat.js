"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserIntent = exports.ProcessingStatus = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType["USER_TEXT"] = "user_text";
    MessageType["USER_FILE"] = "user_file";
    MessageType["AI_RESPONSE"] = "ai_response";
    MessageType["SYSTEM"] = "system";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["PENDING"] = "pending";
    ProcessingStatus["PROCESSING"] = "processing";
    ProcessingStatus["COMPLETED"] = "completed";
    ProcessingStatus["FAILED"] = "failed";
})(ProcessingStatus = exports.ProcessingStatus || (exports.ProcessingStatus = {}));
var UserIntent;
(function (UserIntent) {
    UserIntent["GENERATE_PRACTICE"] = "generate_practice";
    UserIntent["VIEW_PRACTICE_HISTORY"] = "view_practice_history";
    UserIntent["START_PRACTICE"] = "start_practice";
    UserIntent["CHECK_PROGRESS"] = "check_progress";
    UserIntent["VIEW_CAPABILITIES"] = "view_capabilities";
    UserIntent["SET_LEARNING_GOALS"] = "set_learning_goals";
    UserIntent["ADD_VOCABULARY"] = "add_vocabulary";
    UserIntent["VIEW_VOCABULARY"] = "view_vocabulary";
    UserIntent["REMOVE_VOCABULARY"] = "remove_vocabulary";
    UserIntent["START_PK_MATCH"] = "start_pk_match";
    UserIntent["VIEW_PK_HISTORY"] = "view_pk_history";
    UserIntent["CHECK_MMR"] = "check_mmr";
    UserIntent["VIEW_STATISTICS"] = "view_statistics";
    UserIntent["CHECK_CREDITS"] = "check_credits";
    UserIntent["VIEW_MILESTONES"] = "view_milestones";
    UserIntent["UPDATE_PREFERENCES"] = "update_preferences";
    UserIntent["CHANGE_LANGUAGE"] = "change_language";
    UserIntent["LANGUAGE_LEARNING"] = "language_learning";
    UserIntent["MATERIAL_ANALYSIS"] = "material_analysis";
    UserIntent["ACCOUNT_MANAGEMENT"] = "account_management";
    UserIntent["PAYMENT_OPERATIONS"] = "payment_operations";
    UserIntent["PASSWORD_CHANGE"] = "password_change";
})(UserIntent = exports.UserIntent || (exports.UserIntent = {}));
//# sourceMappingURL=chat.js.map