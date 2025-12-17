import { v4 as uuidv4 } from 'uuid';

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

export class PracticeFactory {
  static create(options: CreatePracticeGroupOptions = {}): TestPracticeGroup {
    const id = uuidv4();
    const userId = options.userId || uuidv4();
    const title = options.title || `Practice Group ${Date.now()}`;
    const description = options.description || 'Test practice group description';
    const language = options.language || 'en';
    const difficulty = options.difficulty || 'intermediate';
    const type = options.type || 'general';
    const questionCount = options.questionCount || 10;
    
    const questions = this.createQuestions(id, questionCount);
    
    return {
      id,
      userId,
      title,
      description,
      language,
      difficulty,
      type,
      questions
    };
  }

  static createQuestions(practiceGroupId: string, count: number): TestQuestion[] {
    const questions: TestQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      questions.push({
        id: uuidv4(),
        practiceGroupId,
        type: 'multiple_choice',
        content: `Test question ${i + 1}: What is the correct answer?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: `This is the explanation for question ${i + 1}`,
        difficulty: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return questions;
  }

  static createVocabularyPractice(options: CreatePracticeGroupOptions = {}): TestPracticeGroup {
    return this.create({
      ...options,
      type: 'vocabulary',
      title: options.title || 'Vocabulary Practice'
    });
  }

  static createGrammarPractice(options: CreatePracticeGroupOptions = {}): TestPracticeGroup {
    return this.create({
      ...options,
      type: 'grammar',
      title: options.title || 'Grammar Practice'
    });
  }
}


