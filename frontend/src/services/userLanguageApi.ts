import api from './api';

export interface UserLanguage {
  id: string;
  userId: string;
  language: string;
  currentLevel: string;
  targetLevel?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserLanguageRequest {
  language: string;
  currentLevel: string;
  targetLevel?: string;
  isPrimary?: boolean;
}

export interface UpdateUserLanguageRequest {
  currentLevel?: string;
  targetLevel?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

class UserLanguageApi {
  /**
   * Get all user languages
   */
  async getUserLanguages(activeOnly: boolean = false): Promise<UserLanguage[]> {
    const response = await api.get('/user-languages', {
      params: { active: activeOnly }
    });
    return response.data.data;
  }

  /**
   * Get primary language
   */
  async getPrimaryLanguage(): Promise<UserLanguage | null> {
    try {
      const response = await api.get('/user-languages/primary');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get specific user language
   */
  async getUserLanguage(language: string): Promise<UserLanguage | null> {
    try {
      const response = await api.get(`/user-languages/${language}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Add new language
   */
  async addUserLanguage(request: CreateUserLanguageRequest): Promise<UserLanguage> {
    const response = await api.post('/user-languages', request);
    return response.data.data;
  }

  /**
   * Update existing language
   */
  async updateUserLanguage(language: string, updates: UpdateUserLanguageRequest): Promise<void> {
    await api.put(`/user-languages/${language}`, updates);
  }

  /**
   * Remove language
   */
  async removeUserLanguage(language: string): Promise<void> {
    await api.delete(`/user-languages/${language}`);
  }

  /**
   * Set primary language
   */
  async setPrimaryLanguage(language: string): Promise<void> {
    await api.post(`/user-languages/${language}/primary`);
  }
}

export const userLanguageApi = new UserLanguageApi();
export default userLanguageApi;