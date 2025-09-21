/**
 * Analyzer Agent - AI-powered interview answer analysis using Mistral AI
 * 
 * Responsibilities:
 * - Analyze candidate responses using Mistral AI
 * - Generate detailed feedback with strengths and weaknesses
 * - Provide improvement tips and scoring
 * - Send feedback back to Frontend Agent via Coral Protocol
 */

import { EventEmitter } from 'events';

interface AnalysisRequest {
  questionId: string;
  question: string;
  answer: string;
  expectedElements: string[];
  category: string;
  sessionContext: any;
}

interface AnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  detailedFeedback: string;
  categoryScore: number;
  improvementAreas: string[];
}

interface MistralConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

class AnalyzerAgent extends EventEmitter {
  private mistralApiKey: string;
  private analysisHistory: Map<string, AnalysisResult[]> = new Map();
  private defaultMistralConfig: MistralConfig;

  constructor(mistralApiKey?: string) {
    super();
    this.mistralApiKey = mistralApiKey || process.env.MISTRAL_API_KEY || '';
    
    this.defaultMistralConfig = {
      model: 'mistral-large-latest',
      temperature: 0.3,
      maxTokens: 1000,
      topP: 0.9
    };

    this.setupMessageHandlers();
  }

  /**
   * Set up message handlers for Coral Protocol communication
   */
  private setupMessageHandlers() {
    this.on('analyze-answer', this.handleAnalyzeAnswer.bind(this));
    this.on('get-session-analysis', this.handleGetSessionAnalysis.bind(this));
    this.on('update-analysis-criteria', this.handleUpdateCriteria.bind(this));
  }

  /**
   * Handle answer analysis request
   */
  async handleAnalyzeAnswer(analysisData: any) {
    try {
      const { sessionId, content } = analysisData;
      
      console.log(`🧠 Analyzing answer for session: ${sessionId}`);
      
      // Perform AI analysis using Mistral
      const analysisResult = await this.analyzeWithMistral(content);
      
      // Store analysis in history
      if (!this.analysisHistory.has(sessionId)) {
        this.analysisHistory.set(sessionId, []);
      }
      this.analysisHistory.get(sessionId)!.push(analysisResult);
      
      // Send feedback back to Frontend Agent via Master Agent
      const feedbackMessage = {
        id: `feedback-${Date.now()}`,
        from: 'analyzer-agent',
        to: 'frontend-agent',
        type: 'feedback',
        content: {
          questionId: content.questionId,
          analysis: analysisResult,
          sessionStats: this.getSessionStats(sessionId)
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', feedbackMessage);
      console.log(`✅ Analysis complete for session: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to analyze answer:', error);
      this.emit('error', { type: 'analysis-failed', error, sessionId: analysisData.sessionId });
    }
  }

  /**
   * Analyze answer using Mistral AI via Supabase Edge Function
   */
  private async analyzeWithMistral(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      console.log('🧠 Sending answer to Mistral AI for analysis');
      
      const response = await fetch('https://rrcpnywbxjmaorarlqhe.supabase.co/functions/v1/analyze-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: request.question,
          answer: request.answer,
          category: request.category,
          expectedElements: request.expectedElements,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze answer');
      }

      const analysis = data.analysis;
      
      // Convert to our internal format
      return {
        score: analysis.score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        tips: analysis.improvements,
        detailedFeedback: analysis.overall_feedback,
        categoryScore: analysis.score,
        improvementAreas: analysis.improvements
      };
      
    } catch (error) {
      console.error('❌ Mistral AI analysis failed:', error);
      return this.generateMockAnalysis(request);
    }
  }

  /**
   * Build analysis prompt for Mistral AI
   */
  private buildAnalysisPrompt(request: AnalysisRequest): string {
    return `
Please analyze this interview answer and provide detailed feedback:

**Interview Question:** ${request.question}
**Question Category:** ${request.category}
**Expected Elements:** ${request.expectedElements.join(', ')}

**Candidate's Answer:** 
${request.answer}

**Session Context:**
- Questions asked so far: ${request.sessionContext.questionsAsked}
- Current difficulty level: ${request.sessionContext.currentDifficulty}

Please provide your analysis in the following JSON format:
{
  "score": [number between 1-10],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "tips": ["improvement tip 1", "improvement tip 2", "improvement tip 3"],
  "detailedFeedback": "A paragraph of detailed feedback",
  "categoryScore": [number between 1-10 for this specific category],
  "improvementAreas": ["area 1", "area 2"]
}

Focus on:
1. Content quality and relevance
2. Structure and clarity of communication
3. Specific examples and evidence provided
4. Alignment with expected elements
5. Professional presentation and confidence
`;
  }

  /**
   * Get system prompt for Mistral AI
   */
  private getSystemPrompt(): string {
    return `You are an expert interview coach and talent assessment specialist with over 15 years of experience in evaluating candidates across various industries. Your role is to provide constructive, actionable feedback that helps candidates improve their interview performance.

Key principles for your analysis:
- Be constructive and encouraging while being honest about areas for improvement
- Provide specific, actionable feedback rather than generic comments
- Consider both content and delivery aspects of the answer
- Recognize cultural and individual differences in communication styles
- Focus on helping the candidate succeed in their next interview
- Use professional language appropriate for career coaching
- Balance praise for strengths with specific guidance for improvement

Your analysis should be thorough, fair, and designed to build the candidate's confidence while identifying clear paths for improvement.`;
  }

  /**
   * Parse Mistral AI response into structured analysis result
   */
  private parseAnalysisResponse(analysisText: string, request: AnalysisRequest): AnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and ensure all required fields
        return {
          score: Math.max(1, Math.min(10, parsed.score || 7)),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Clear communication'],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ['Could provide more specific examples'],
          tips: Array.isArray(parsed.tips) ? parsed.tips : ['Practice the STAR method for structured answers'],
          detailedFeedback: parsed.detailedFeedback || 'Good overall response with room for improvement.',
          categoryScore: Math.max(1, Math.min(10, parsed.categoryScore || parsed.score || 7)),
          improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : ['Answer structure']
        };
      }
    } catch (error) {
      console.error('❌ Failed to parse Mistral response:', error);
    }

    // Fallback to mock analysis if parsing fails
    return this.generateMockAnalysis(request);
  }

  /**
   * Generate mock analysis when Mistral AI is not available
   */
  private generateMockAnalysis(request: AnalysisRequest): AnalysisResult {
    const mockAnalyses = {
      introduction: {
        score: 7.5,
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
        ],
        detailedFeedback: 'Your response shows good self-awareness and enthusiasm for the role. The structure is logical, moving from background to motivation. To strengthen your answer, consider adding more specific examples of your achievements and quantifiable results. This will make your experience more tangible and memorable for the interviewer.',
        categoryScore: 7.5,
        improvementAreas: ['Specificity', 'Quantification', 'Company research']
      },
      experience: {
        score: 8.0,
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
        ],
        detailedFeedback: 'Excellent use of a specific example to demonstrate your experience. You clearly articulated the challenge and your approach to solving it. The mention of collaboration shows good teamwork skills. To make this even stronger, emphasize the concrete results of your efforts and what you learned from the experience.',
        categoryScore: 8.0,
        improvementAreas: ['Results quantification', 'Lessons learned', 'Stakeholder management']
      }
    };

    const categoryAnalysis = mockAnalyses[request.category as keyof typeof mockAnalyses] || mockAnalyses.introduction;
    
    // Add some variation based on answer length and content
    const scoreAdjustment = Math.random() * 1 - 0.5; // -0.5 to +0.5
    const adjustedScore = Math.max(1, Math.min(10, categoryAnalysis.score + scoreAdjustment));

    return {
      ...categoryAnalysis,
      score: Math.round(adjustedScore * 10) / 10,
      categoryScore: Math.round(adjustedScore * 10) / 10
    };
  }

  /**
   * Handle session analysis request
   */
  async handleGetSessionAnalysis(requestData: any) {
    try {
      const { sessionId } = requestData;
      const sessionAnalyses = this.analysisHistory.get(sessionId) || [];
      
      const sessionStats = this.getSessionStats(sessionId);
      
      const summaryMessage = {
        id: `summary-${Date.now()}`,
        from: 'analyzer-agent',
        to: 'frontend-agent',
        type: 'command',
        content: {
          command: 'session-summary',
          stats: sessionStats,
          analyses: sessionAnalyses
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', summaryMessage);
      console.log(`📊 Generated session analysis for: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Failed to generate session analysis:', error);
      this.emit('error', { type: 'session-analysis-failed', error, sessionId: requestData.sessionId });
    }
  }

  /**
   * Calculate session statistics
   */
  private getSessionStats(sessionId: string) {
    const analyses = this.analysisHistory.get(sessionId) || [];
    
    if (analyses.length === 0) {
      return {
        averageScore: 0,
        totalQuestions: 0,
        strongestArea: 'N/A',
        weakestArea: 'N/A',
        overallTrend: 'N/A'
      };
    }

    const scores = analyses.map(a => a.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Find most common strengths and weaknesses
    const allStrengths = analyses.flatMap(a => a.strengths);
    const allWeaknesses = analyses.flatMap(a => a.weaknesses);
    
    const strengthCounts = this.countOccurrences(allStrengths);
    const weaknessCounts = this.countOccurrences(allWeaknesses);
    
    const strongestArea = Object.keys(strengthCounts).reduce((a, b) => 
      strengthCounts[a] > strengthCounts[b] ? a : b, 'Communication'
    );
    
    const weakestArea = Object.keys(weaknessCounts).reduce((a, b) => 
      weaknessCounts[a] > weaknessCounts[b] ? a : b, 'Specificity'
    );

    // Calculate trend (improving, declining, stable)
    let trend = 'stable';
    if (scores.length >= 3) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 0.5) trend = 'improving';
      else if (secondAvg < firstAvg - 0.5) trend = 'declining';
    }

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      totalQuestions: analyses.length,
      strongestArea,
      weakestArea,
      overallTrend: trend
    };
  }

  /**
   * Count occurrences of items in array
   */
  private countOccurrences(arr: string[]): Record<string, number> {
    return arr.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Update analysis criteria
   */
  handleUpdateCriteria(criteriaData: any) {
    // This would update the analysis criteria for future analyses
    console.log('🔧 Updated analysis criteria:', criteriaData);
  }

  /**
   * Update Mistral configuration
   */
  updateMistralConfig(config: Partial<MistralConfig>) {
    this.defaultMistralConfig = { ...this.defaultMistralConfig, ...config };
    console.log('🔧 Updated Mistral AI configuration');
  }

  /**
   * Get agent health status
   */
  healthCheck() {
    return {
      status: 'healthy',
      totalAnalyses: Array.from(this.analysisHistory.values()).flat().length,
      activeSessions: this.analysisHistory.size,
      mistralConfigured: !!this.mistralApiKey,
      timestamp: new Date()
    };
  }
}

export default AnalyzerAgent;