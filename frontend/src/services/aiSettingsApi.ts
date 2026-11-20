import api from './api';

export const aiFeatures = {
  default: '默认路由',
  conversation: 'AI 对话',
  material_analysis: '学习材料分析',
  exercise_generation: '练习生成',
  practice_analysis: '练习结果分析',
  practice_followup: '练习追问',
  vocabulary_extraction: '词汇提取',
  vocabulary_practice: '词汇练习',
  daily_recommendation: '每日推荐',
  function_calling: '聊天功能识别',
  intent_recognition: '聊天意图识别',
};

export const providers = {
  responses: 'Responses API',
  codex: '本机 Codex',
  claude_code: '本机 Claude Code',
};

export type AIFeature = keyof typeof aiFeatures;
export type AIProvider = keyof typeof providers;

export interface AIProfile {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;
  endpoint: string;
  timeout_seconds: number;
  max_output_tokens: number;
  has_api_key: boolean;
  api_key?: string | null;
}

export interface AISettings {
  revision: number;
  profiles: AIProfile[];
  routes: Partial<Record<AIFeature, string[]>>;
}

export async function loadAISettings(): Promise<AISettings> {
  const { data } = await api.get<AISettings>('/ai-settings');
  return data;
}

export async function saveAISettings(settings: AISettings): Promise<AISettings> {
  const profiles = settings.profiles.map(({ has_api_key, ...profile }) => profile);
  const { data } = await api.put<AISettings>('/ai-settings', { ...settings, profiles });
  return data;
}

export async function testAIProfile(profile: AIProfile) {
  const { data } = await api.post<{ model: string; processing_time: number }>(
    `/ai-settings/profiles/${profile.id}/test`, null, { timeout: (profile.timeout_seconds + 5) * 1000 },
  );
  return data;
}
