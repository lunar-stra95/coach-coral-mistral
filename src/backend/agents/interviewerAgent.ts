/**
 * Interviewer Agent - Handles interview questions and voice synthesis
 * 
 * Responsibilities:
 * - Generate contextual interview questions
 * - Convert questions to speech using ElevenLabs TTS
 * - Manage question flow and difficulty progression
 * - Send candidate answers to Analyzer Agent via Coral Protocol
 */

import { EventEmitter } from 'events';

interface InterviewQuestion {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  context: string;
  expectedElements: string[];
}

interface TTSConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
}

class InterviewerAgent extends EventEmitter {
  private elevenLabsApiKey: string;
  private sessionContext: Map<string, any> = new Map();
  private questionBank: InterviewQuestion[] = [];
  private defaultTTSConfig: TTSConfig;

  constructor(elevenLabsApiKey?: string) {
    super();
    this.elevenLabsApiKey = elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || '';
    
    this.defaultTTSConfig = {
      voiceId: '9BWtsMINqrJLrRacOk9x', // Aria voice
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75
    };

    this.initializeQuestionBank();
    this.setupMessageHandlers();
  }

  /**
   * Initialize the question bank with various interview questions
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
      }
    ];

    console.log(`✅ Interviewer Agent initialized with ${this.questionBank.length} questions`);
  }

  /**
   * Set up message handlers for Coral Protocol communication
   */
  private setupMessageHandlers() {
    this.on('start-session', this.handleStartSession.bind(this));
    this.on('candidate-answer', this.handleCandidateAnswer.bind(this));
    this.on('next-question', this.handleNextQuestion.bind(this));
    this.on('generate-audio', this.handleGenerateAudio.bind(this));
  }

  /**
   * Handle audio generation request
   */
  async handleGenerateAudio(audioData: any) {
    try {
      const { sessionId, text } = audioData;
      
      console.log(`🔊 Generating audio for session: ${sessionId}`);
      
      const audioUrl = await this.generateQuestionAudio(text);
      
      const response = {
        id: `audio-${Date.now()}`,
        from: 'interviewer-agent',
        to: 'frontend-agent',
        type: 'command',
        content: {
          command: 'audio-generated',
          audioUrl,
          originalText: text
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', response);
      console.log(`✅ Audio generated for session: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to generate audio:', error);
      this.emit('error', { type: 'audio-generation', error, sessionId: audioData.sessionId });
    }
  }

  /**
   * Handle session start and ask first question
   */
  async handleStartSession(sessionData: any) {
    try {
      const { sessionId, candidateProfile } = sessionData;
      
      // Initialize session context
      this.sessionContext.set(sessionId, {
        currentQuestionIndex: 0,
        questionsAsked: [],
        candidateProfile,
        startTime: new Date(),
        difficulty: 'easy'
      });

      // Get first question
      const firstQuestion = this.selectNextQuestion(sessionId);
      
      // Generate audio for the question
      const audioUrl = await this.generateQuestionAudio(firstQuestion.question);
      
      // Send question via Coral Protocol to Master Agent
      const message = {
        id: `q-${Date.now()}`,
        from: 'interviewer-agent',
        to: 'frontend-agent',
        type: 'question',
        content: {
          questionId: firstQuestion.id,
          question: firstQuestion.question,
          category: firstQuestion.category,
          audioUrl,
          context: firstQuestion.context
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', message);
      console.log(`🎤 Asked first question for session: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to start interview session:', error);
      this.emit('error', { type: 'session-start', error, sessionId: sessionData.sessionId });
    }
  }

  /**
   * Handle candidate answer and forward to analyzer
   */
  async handleCandidateAnswer(answerData: any) {
    try {
      const { sessionId, answer, questionId } = answerData;
      const context = this.sessionContext.get(sessionId);
      
      if (!context) {
        throw new Error(`No session context found for: ${sessionId}`);
      }

      // Get the question details for context
      const question = this.questionBank.find(q => q.id === questionId);
      
      // Forward answer to Analyzer Agent via Master Agent
      const message = {
        id: `a-${Date.now()}`,
        from: 'interviewer-agent',
        to: 'analyzer-agent',
        type: 'answer',
        content: {
          questionId,
          question: question?.question,
          answer,
          expectedElements: question?.expectedElements,
          category: question?.category,
          sessionContext: {
            questionsAsked: context.questionsAsked.length,
            currentDifficulty: context.difficulty
          }
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', message);
      
      // Update session context
      context.questionsAsked.push({
        questionId,
        question: question?.question,
        answer,
        timestamp: new Date()
      });

      console.log(`📤 Forwarded answer to Analyzer Agent for session: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to handle candidate answer:', error);
      this.emit('error', { type: 'answer-handling', error, sessionId: answerData.sessionId });
    }
  }

  /**
   * Handle request for next question
   */
  async handleNextQuestion(requestData: any) {
    try {
      const { sessionId, previousFeedback } = requestData;
      const context = this.sessionContext.get(sessionId);
      
      if (!context) {
        throw new Error(`No session context found for: ${sessionId}`);
      }

      // Adjust difficulty based on previous feedback
      if (previousFeedback?.score) {
        if (previousFeedback.score >= 8) {
          context.difficulty = 'hard';
        } else if (previousFeedback.score >= 6) {
          context.difficulty = 'medium';
        } else {
          context.difficulty = 'easy';
        }
      }

      // Select next question
      const nextQuestion = this.selectNextQuestion(sessionId);
      
      if (!nextQuestion) {
        // End of interview
        const endMessage = {
          id: `end-${Date.now()}`,
          from: 'interviewer-agent',
          to: 'frontend-agent',
          type: 'command',
          content: {
            command: 'interview-complete',
            summary: this.generateInterviewSummary(sessionId)
          },
          sessionId,
          timestamp: new Date()
        };

        this.emit('send-message', endMessage);
        return;
      }

      // Generate audio for the question
      const audioUrl = await this.generateQuestionAudio(nextQuestion.question);
      
      // Send next question
      const message = {
        id: `q-${Date.now()}`,
        from: 'interviewer-agent',
        to: 'frontend-agent',
        type: 'question',
        content: {
          questionId: nextQuestion.id,
          question: nextQuestion.question,
          category: nextQuestion.category,
          audioUrl,
          context: nextQuestion.context
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', message);
      console.log(`🎤 Asked next question for session: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to generate next question:', error);
      this.emit('error', { type: 'next-question', error, sessionId: requestData.sessionId });
    }
  }

  /**
   * Select the next appropriate question based on session context
   */
  private selectNextQuestion(sessionId: string): InterviewQuestion | null {
    const context = this.sessionContext.get(sessionId);
    if (!context) return null;

    const askedQuestionIds = context.questionsAsked.map((q: any) => q.questionId);
    const availableQuestions = this.questionBank.filter(q => 
      !askedQuestionIds.includes(q.id) && 
      (q.difficulty === context.difficulty || context.questionsAsked.length === 0)
    );

    if (availableQuestions.length === 0) {
      // No more questions at current difficulty, try any remaining
      const remainingQuestions = this.questionBank.filter(q => 
        !askedQuestionIds.includes(q.id)
      );
      
      if (remainingQuestions.length === 0) {
        return null; // Interview complete
      }
      
      return remainingQuestions[0];
    }

    // Prefer questions from different categories for variety
    const lastCategory = context.questionsAsked.length > 0 
      ? context.questionsAsked[context.questionsAsked.length - 1].category 
      : null;
    
    const differentCategoryQuestions = availableQuestions.filter(q => 
      q.category !== lastCategory
    );

    const selectedQuestions = differentCategoryQuestions.length > 0 
      ? differentCategoryQuestions 
      : availableQuestions;

    return selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];
  }

  /**
   * Generate audio for question using ElevenLabs TTS
   */
  async generateQuestionAudio(questionText: string): Promise<string> {
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️ ElevenLabs API key not configured, skipping audio generation');
      return '';
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.defaultTTSConfig.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: questionText,
          model_id: this.defaultTTSConfig.modelId,
          voice_settings: {
            stability: this.defaultTTSConfig.stability,
            similarity_boost: this.defaultTTSConfig.similarityBoost,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      // In a real implementation, you'd save the audio file and return a URL
      // For now, we'll return a placeholder URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('🔊 Generated audio for question');
      return audioUrl;
      
    } catch (error) {
      console.error('❌ Failed to generate question audio:', error);
      return '';
    }
  }

  /**
   * Generate interview summary
   */
  private generateInterviewSummary(sessionId: string) {
    const context = this.sessionContext.get(sessionId);
    if (!context) return null;

    return {
      sessionId,
      totalQuestions: context.questionsAsked.length,
      duration: new Date().getTime() - context.startTime.getTime(),
      categoriesCovered: [...new Set(context.questionsAsked.map((q: any) => q.category))],
      finalDifficulty: context.difficulty
    };
  }

  /**
   * Update TTS configuration
   */
  updateTTSConfig(config: Partial<TTSConfig>) {
    this.defaultTTSConfig = { ...this.defaultTTSConfig, ...config };
    console.log('🔧 Updated TTS configuration');
  }

  /**
   * Add custom question to the bank
   */
  addCustomQuestion(question: Omit<InterviewQuestion, 'id'>) {
    const customQuestion: InterviewQuestion = {
      ...question,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.questionBank.push(customQuestion);
    console.log(`➕ Added custom question: ${customQuestion.id}`);
  }

  /**
   * Get agent health status
   */
  healthCheck() {
    return {
      status: 'healthy',
      questionsAvailable: this.questionBank.length,
      activeSessions: this.sessionContext.size,
      elevenLabsConfigured: !!this.elevenLabsApiKey,
      timestamp: new Date()
    };
  }
}

export default InterviewerAgent;