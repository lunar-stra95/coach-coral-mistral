/**
 * Interview Service - Frontend-compatible implementation
 * 
 * This service simulates the multi-agent backend system within the frontend
 * for development and demonstration purposes. In production, this would
 * communicate with the actual backend agents via API calls.
 */

import { useToast } from "@/hooks/use-toast";

export interface InterviewQuestion {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  context: string;
  expectedElements: string[];
}

export interface AnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  detailedFeedback: string;
  categoryScore: number;
  improvementAreas: string[];
}

export interface SessionConfig {
  candidateProfile?: {
    name: string;
    role: string;
    experience: string;
    industry: string;
  };
  interviewType: 'general' | 'technical' | 'behavioral' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  duration?: number;
}

export interface InterviewMessage {
  id: string;
  type: 'question' | 'answer' | 'feedback';
  content: string;
  timestamp: Date;
  feedback?: AnalysisResult;
}

/**
 * Interview Service Class
 * Simulates the multi-agent system for frontend development
 */
export class InterviewService {
  private sessionId: string | null = null;
  private messageHistory: InterviewMessage[] = [];
  private currentQuestionIndex = 0;
  private questionBank: InterviewQuestion[] = [];
  private eventHandlers: Record<string, Function[]> = {};

  constructor() {
    this.initializeQuestionBank();
  }

  /**
   * Initialize question bank with realistic interview questions
   */
  private initializeQuestionBank() {
    this.questionBank = [
      {
        id: 'intro-1',
        category: 'introduction',
        difficulty: 'easy',
        question: "Tell me about yourself and why you're interested in this position. I'm looking for insights into your background, motivations, and how your experience aligns with the role.",
        context: 'Opening question to assess communication skills and self-awareness',
        expectedElements: ['background summary', 'relevant experience', 'motivation', 'role connection']
      },
      {
        id: 'experience-1',
        category: 'experience',
        difficulty: 'medium',
        question: "Can you describe a challenging project you've worked on and how you overcame obstacles? I'm particularly interested in your problem-solving approach and collaboration skills.",
        context: 'Behavioral question to assess problem-solving and teamwork',
        expectedElements: ['specific example', 'challenges identified', 'actions taken', 'results achieved', 'lessons learned']
      },
      {
        id: 'technical-1',
        category: 'technical',
        difficulty: 'medium',
        question: "Walk me through your approach to debugging a complex technical issue. What tools and methodologies do you use?",
        context: 'Technical competency and systematic thinking assessment',
        expectedElements: ['systematic approach', 'tools mentioned', 'debugging strategies', 'documentation practices']
      },
      {
        id: 'leadership-1',
        category: 'leadership',
        difficulty: 'hard',
        question: "Describe a time when you had to lead a team through a difficult situation or major change. How did you ensure everyone stayed motivated and aligned?",
        context: 'Leadership and change management capabilities',
        expectedElements: ['leadership style', 'communication strategies', 'team motivation', 'change management', 'outcomes']
      },
      {
        id: 'conflict-1',
        category: 'behavioral',
        difficulty: 'hard',
        question: "Tell me about a time when you disagreed with your manager or team lead on an important decision. How did you handle the situation?",
        context: 'Conflict resolution and professional maturity assessment',
        expectedElements: ['specific situation', 'communication approach', 'compromise or resolution', 'relationship preservation']
      },
      {
        id: 'growth-1',
        category: 'development',
        difficulty: 'medium',
        question: "What's the most significant skill or knowledge area you've developed in the past year? How did you approach learning it?",
        context: 'Continuous learning and growth mindset evaluation',
        expectedElements: ['specific skill/knowledge', 'learning approach', 'application examples', 'impact on work']
      },
      {
        id: 'innovation-1',
        category: 'innovation',
        difficulty: 'hard',
        question: "Describe a time when you had to think outside the box to solve a problem. What was your creative process and what was the outcome?",
        context: 'Creative thinking and innovation capabilities',
        expectedElements: ['creative problem-solving', 'process description', 'innovative solution', 'measurable outcome']
      },
      {
        id: 'pressure-1',
        category: 'behavioral',
        difficulty: 'medium',
        question: "Tell me about a time when you had to work under significant pressure or tight deadlines. How did you manage the stress and ensure quality?",
        context: 'Stress management and performance under pressure',
        expectedElements: ['pressure situation', 'stress management', 'quality maintenance', 'time management']
      }
    ];
  }

  /**
   * Start a new interview session
   */
  async startSession(config: SessionConfig): Promise<string> {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.messageHistory = [];
    this.currentQuestionIndex = 0;

    console.log('🎯 Starting interview session:', this.sessionId);
    console.log('📋 Session config:', config);

    // Simulate agent initialization delay
    await this.delay(1000);

    // Ask first question
    setTimeout(() => {
      this.askNextQuestion();
    }, 500);

    return this.sessionId;
  }

  /**
   * Submit an answer and get feedback
   */
  async submitAnswer(questionId: string, answer: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    // Add user answer to history
    const userMessage: InterviewMessage = {
      id: `answer-${Date.now()}`,
      type: 'answer',
      content: answer,
      timestamp: new Date()
    };

    this.messageHistory.push(userMessage);
    this.emit('answer-submitted', userMessage);

    console.log('📝 Answer submitted for question:', questionId);

    // Simulate AI analysis delay
    this.emit('analysis-started');
    await this.delay(2000);

    // Generate feedback
    const feedback = await this.generateFeedback(questionId, answer);
    
    const feedbackMessage: InterviewMessage = {
      id: `feedback-${Date.now()}`,
      type: 'feedback',
      content: 'Analysis complete',
      timestamp: new Date(),
      feedback
    };

    this.messageHistory.push(feedbackMessage);
    this.emit('feedback-received', feedbackMessage);

    // Ask next question after a brief delay
    setTimeout(() => {
      this.askNextQuestion();
    }, 1000);
  }

  /**
   * Ask the next question in the sequence
   */
  private askNextQuestion() {
    if (this.currentQuestionIndex >= this.questionBank.length) {
      this.endInterview();
      return;
    }

    const question = this.questionBank[this.currentQuestionIndex];
    this.currentQuestionIndex++;

    const questionMessage: InterviewMessage = {
      id: question.id,
      type: 'question',
      content: question.question,
      timestamp: new Date()
    };

    this.messageHistory.push(questionMessage);
    this.emit('question-asked', { ...questionMessage, ...question });

    console.log('❓ Asked question:', question.category);
  }

  /**
   * Generate feedback using simulated AI analysis
   */
  private async generateFeedback(questionId: string, answer: string): Promise<AnalysisResult> {
    // Find the question details
    const question = this.questionBank.find(q => q.id === questionId);
    
    // Simulate different feedback based on question category and answer quality
    const analysisTemplates = {
      introduction: {
        score: this.calculateScore(answer, ['background', 'experience', 'motivation']),
        strengths: [
          'Clear structure and logical flow',
          'Relevant experience mentioned',
          'Confident tone and enthusiasm'
        ],
        weaknesses: [
          'Could provide more specific examples',
          'Consider mentioning quantifiable achievements',
          'Opportunity to better connect experience to role'
        ],
        tips: [
          'Use the STAR method (Situation, Task, Action, Result) for stronger examples',
          'Quantify your achievements with numbers and metrics when possible',
          'Research the company more deeply to show specific interest'
        ]
      },
      experience: {
        score: this.calculateScore(answer, ['challenge', 'solution', 'result', 'collaboration']),
        strengths: [
          'Specific project example provided',
          'Clear problem identification',
          'Good demonstration of problem-solving skills',
          'Mentioned collaboration effectively'
        ],
        weaknesses: [
          'Could elaborate more on the results achieved',
          'Missing discussion of lessons learned',
          'Limited mention of stakeholder management'
        ],
        tips: [
          'Always conclude with measurable results and impact',
          'Include what you learned from the experience',
          'Mention how you managed different stakeholders during challenges'
        ]
      },
      technical: {
        score: this.calculateScore(answer, ['systematic', 'tools', 'process', 'testing']),
        strengths: [
          'Methodical approach to problem-solving',
          'Good understanding of debugging tools',
          'Clear explanation of technical concepts'
        ],
        weaknesses: [
          'Could provide more specific tool examples',
          'Missing discussion of prevention strategies',
          'Limited mention of documentation practices'
        ],
        tips: [
          'Name specific debugging tools and their use cases',
          'Discuss how you prevent similar issues in the future',
          'Mention the importance of documenting solutions for team knowledge'
        ]
      },
      leadership: {
        score: this.calculateScore(answer, ['leadership', 'communication', 'motivation', 'change']),
        strengths: [
          'Strong leadership qualities demonstrated',
          'Effective communication strategies mentioned',
          'Good understanding of change management'
        ],
        weaknesses: [
          'Could provide more specific examples of team motivation',
          'Missing discussion of individual team member needs',
          'Limited mention of measuring success'
        ],
        tips: [
          'Describe specific techniques for motivating different personality types',
          'Explain how you adapt your leadership style to individual needs',
          'Include metrics or indicators you use to measure team success'
        ]
      }
    };

    const category = question?.category || 'general';
    const template = analysisTemplates[category as keyof typeof analysisTemplates] || analysisTemplates.introduction;
    
    // Add some variation to make feedback feel more dynamic
    const scoreVariation = (Math.random() - 0.5) * 1.5; // -0.75 to +0.75
    const finalScore = Math.max(1, Math.min(10, template.score + scoreVariation));

    return {
      score: Math.round(finalScore * 10) / 10,
      strengths: template.strengths,
      weaknesses: template.weaknesses,
      tips: template.tips,
      detailedFeedback: this.generateDetailedFeedback(answer, category),
      categoryScore: Math.round(finalScore * 10) / 10,
      improvementAreas: template.weaknesses.map(w => w.split(' ')[0])
    };
  }

  /**
   * Calculate score based on answer quality and expected elements
   */
  private calculateScore(answer: string, expectedKeywords: string[]): number {
    const answerLower = answer.toLowerCase();
    const wordCount = answer.split(' ').length;
    
    // Base score on length (minimum viable answer)
    let score = Math.min(5, wordCount / 20); // Up to 5 points for length
    
    // Add points for expected keywords/concepts
    expectedKeywords.forEach(keyword => {
      if (answerLower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    // Bonus for detailed answers
    if (wordCount > 100) score += 0.5;
    if (wordCount > 200) score += 0.5;
    
    // Cap at 9 (perfect 10 is rare)
    return Math.min(9, score);
  }

  /**
   * Generate detailed feedback text
   */
  private generateDetailedFeedback(answer: string, category: string): string {
    const templates = {
      introduction: "Your response shows good self-awareness and enthusiasm. The structure is logical and flows well. To strengthen your answer, consider adding more specific examples of your achievements with quantifiable results.",
      experience: "Excellent use of a specific example to demonstrate your experience. You clearly articulated the challenge and your approach. To make this even stronger, emphasize the concrete results and lessons learned.",
      technical: "Your technical explanation demonstrates solid understanding. The methodical approach you described is valuable. Consider adding more details about specific tools and prevention strategies.",
      leadership: "Strong demonstration of leadership capabilities. Your communication strategies are well-thought-out. To enhance this further, include specific examples of how you measure team success.",
      general: "Good overall response with clear communication. Your answer shows relevant experience and understanding. Focus on providing more specific examples and quantifiable outcomes."
    };

    return templates[category as keyof typeof templates] || templates.general;
  }

  /**
   * End the interview session
   */
  private endInterview() {
    console.log('🏁 Interview session completed');
    
    const summary = {
      sessionId: this.sessionId,
      totalQuestions: this.messageHistory.filter(m => m.type === 'question').length,
      totalAnswers: this.messageHistory.filter(m => m.type === 'answer').length,
      averageScore: this.calculateAverageScore(),
      completedAt: new Date()
    };

    this.emit('interview-completed', summary);
  }

  /**
   * Calculate average score across all feedback
   */
  private calculateAverageScore(): number {
    const feedbackMessages = this.messageHistory.filter(m => m.type === 'feedback' && m.feedback);
    
    if (feedbackMessages.length === 0) return 0;
    
    const totalScore = feedbackMessages.reduce((sum, msg) => sum + (msg.feedback?.score || 0), 0);
    return Math.round((totalScore / feedbackMessages.length) * 10) / 10;
  }

  /**
   * Play question audio (simulated)
   */
  async playQuestionAudio(questionText: string): Promise<string> {
    console.log('🔊 Generating audio for question...');
    
    // Simulate audio generation delay
    await this.delay(1500);
    
    // In a real implementation, this would call ElevenLabs API
    // For now, return a placeholder
    return 'data:audio/wav;base64,placeholder-audio-data';
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const questions = this.messageHistory.filter(m => m.type === 'question').length;
    const answers = this.messageHistory.filter(m => m.type === 'answer').length;
    const feedbacks = this.messageHistory.filter(m => m.type === 'feedback');
    
    return {
      totalQuestions: questions,
      answeredQuestions: answers,
      averageScore: this.calculateAverageScore(),
      sessionDuration: this.sessionId ? Date.now() - parseInt(this.sessionId.split('-')[1]) : 0,
      completionRate: questions > 0 ? (answers / questions) * 100 : 0
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(): InterviewMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Event handling
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event: string, handler: Function) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  private emit(event: string, data?: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const interviewService = new InterviewService();