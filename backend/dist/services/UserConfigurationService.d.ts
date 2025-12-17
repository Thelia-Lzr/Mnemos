import { Pool } from 'pg';
import { UserLanguageConfiguration, GlobalLearningPreferences, UserLanguageConfigurationHistory, CreateLanguageConfigurationRequest, UpdateLanguageConfigurationRequest, UpdateGlobalPreferencesRequest, UserConfigurationSummary, ConfigurationHealthStatus, Language } from '../models/UserLanguageConfiguration';
export declare class UserConfigurationService {
    private db;
    constructor(db: Pool);
    getUserLanguageConfigurations(userId: string, activeOnly?: boolean): Promise<UserLanguageConfiguration[]>;
    getUserLanguageConfiguration(userId: string, language: Language): Promise<UserLanguageConfiguration | null>;
    createLanguageConfiguration(userId: string, request: CreateLanguageConfigurationRequest, changedBy?: string, changeSource?: string): Promise<UserLanguageConfiguration | null>;
    updateLanguageConfiguration(userId: string, language: Language, updates: UpdateLanguageConfigurationRequest, changedBy?: string, changeSource?: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
    removeLanguageConfiguration(userId: string, language: Language, changedBy?: string): Promise<boolean>;
    getGlobalPreferences(userId: string): Promise<GlobalLearningPreferences | null>;
    updateGlobalPreferences(userId: string, updates: UpdateGlobalPreferencesRequest): Promise<boolean>;
    getConfigurationHistory(userId: string, language?: Language, limit?: number): Promise<UserLanguageConfigurationHistory[]>;
    getUserConfigurationSummary(userId: string): Promise<UserConfigurationSummary | null>;
    getConfigurationHealthStatus(userId: string): Promise<ConfigurationHealthStatus>;
    private validateLanguageConfiguration;
    private validateLanguageConfigurationUpdate;
    private getConfigurationConstraints;
    private ensureGlobalPreferencesExist;
    private createDefaultGlobalPreferences;
    private ensureUserCapabilityExists;
    private ensureLearningProgressExists;
    private camelToSnakeCase;
    private mapRowToLanguageConfiguration;
    private mapRowToGlobalPreferences;
    private mapRowToConfigurationHistory;
}
//# sourceMappingURL=UserConfigurationService.d.ts.map