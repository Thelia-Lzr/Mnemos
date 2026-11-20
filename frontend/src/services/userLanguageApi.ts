import api from './api';

export interface UserLanguage {
  id: string;
  userId: string;
  language: string;
  currentLevel: string;
  targetLevel?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserLanguageRequest {
  language: string;
  currentLevel: string;
  targetLevel?: string | null;
  isPrimary?: boolean;
}

export interface UpdateUserLanguageRequest {
  currentLevel?: string;
  targetLevel?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
}

class UserLanguageApi {
  private async findLanguageByCode(language: string): Promise<UserLanguage | null> {
    const languages = await this.getUserLanguages();
    return languages.find((item) => item.language === language) || null;
  }

  /**
   * Get all user languages
   */
  async getUserLanguages(activeOnly: boolean = false): Promise<UserLanguage[]> {
    const response = await api.get('/user-languages', {
      params: { active: activeOnly }
    });
    return response.data.data.map((item: UserLanguage & { proficiencyLevel: string; learningGoal: string | null }) => ({
      ...item,
      currentLevel: item.proficiencyLevel,
      targetLevel: item.learningGoal,
      isActive: item.isActive ?? true,
    })).filter((item: UserLanguage) => !activeOnly || item.isActive);
  }

  /**
   * Get primary language
   */
  async getPrimaryLanguage(): Promise<UserLanguage | null> {
    const languages = await this.getUserLanguages();
    return languages.find((item) => item.isPrimary) || null;
  }

  /**
   * Get specific user language
   */
  async getUserLanguage(language: string): Promise<UserLanguage | null> {
    return this.findLanguageByCode(language);
  }

  /**
   * Add new language
   */
  async addUserLanguage(request: CreateUserLanguageRequest): Promise<UserLanguage> {
    const response = await api.post('/user-languages', {
      language: request.language,
      proficiencyLevel: request.currentLevel,
      learningGoal: request.targetLevel ?? null,
      isPrimary: request.isPrimary,
    });
    return { ...response.data.data, currentLevel: response.data.data.proficiencyLevel, targetLevel: response.data.data.learningGoal };
  }

  /**
   * Update existing language
   */
  async updateUserLanguage(language: string, updates: UpdateUserLanguageRequest): Promise<void> {
    const target = await this.findLanguageByCode(language);
    if (!target) {
      throw new Error(`Language not found: ${language}`);
    }

    await api.put(`/user-languages/${target.id}`, {
      proficiencyLevel: updates.currentLevel,
      learningGoal: updates.targetLevel,
      isPrimary: updates.isPrimary
    });
  }

  /**
   * Remove language
   */
  async removeUserLanguage(language: string): Promise<void> {
    const target = await this.findLanguageByCode(language);
    if (!target) {
      throw new Error(`Language not found: ${language}`);
    }

    await api.delete(`/user-languages/${target.id}`);
  }

  /**
   * Set primary language
   */
  async setPrimaryLanguage(language: string): Promise<void> {
    const target = await this.findLanguageByCode(language);
    if (!target) {
      throw new Error(`Language not found: ${language}`);
    }

    await api.put(`/user-languages/${target.id}`, {
      isPrimary: true
    });
  }
}

export const userLanguageApi = new UserLanguageApi();
export default userLanguageApi;