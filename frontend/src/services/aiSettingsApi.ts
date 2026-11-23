import api from './api';

export interface AiSettings {
  personalKey: boolean;
  serverKey: boolean;
  canSavePersonalKey: boolean;
}

const path = '/users/ai-settings';

export const aiSettingsApi = {
  async get() {
    return (await api.get<AiSettings>(path)).data;
  },
  async save(apiKey: string) {
    await api.put(path, { apiKey });
  },
  async remove() {
    return (await api.delete<AiSettings>(path)).data;
  },
};
