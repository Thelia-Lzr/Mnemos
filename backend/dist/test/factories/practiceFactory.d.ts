export interface TestPracticeGroup {
    id: string;
    userId: string;
    title: string;
    description: string;
    language: 'en' | 'ja' | 'fr';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    type: string;
    questions: TestQuestion[];
}
export interface TestQuestion {
    id: string;
    practiceGroupId: string;
    type: string;
    content: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: number;
}
export interface CreatePracticeGroupOptions {
    userId?: string;
    title?: string;
    description?: string;
    language?: 'en' | 'ja' | 'fr';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    type?: string;
    questionCount?: number;
}
export declare class PracticeFactory {
    static create(options?: CreatePracticeGroupOptions): TestPracticeGroup;
    static createQuestions(practiceGroupId: string, count: number): TestQuestion[];
    static createVocabularyPractice(options?: CreatePracticeGroupOptions): TestPracticeGroup;
    static createGrammarPractice(options?: CreatePracticeGroupOptions): TestPracticeGroup;
}
//# sourceMappingURL=practiceFactory.d.ts.map