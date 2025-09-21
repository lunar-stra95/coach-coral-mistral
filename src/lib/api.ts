/**
 * API client for AI Interview Coach frontend
 * Handles communication with the backend multi-agent system
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com' 
  : 'http://localhost:3001';

const WS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'wss://your-production-api.com'
  : 'ws://localhost:3001';

export interface SessionConfig {
  candidateProfile?: {
    name: string;
    role: string;
    experience: string;
    industry: string;
  };
  interviewType: 'general' | 'technical' | 'behavioral' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  duration?: number; // minutes
}

export interface InterviewSession {
  sessionId: string;
  status: 'initialized' | 'active' | 'completed' | 'error';
  startTime: Date;
  config: SessionConfig;
  participants: string[];
  messageHistory: any[];
}

export interface QuestionData {
  questionId: string;
  question: string;
  category: string;
  audioUrl?: string;
  context: string;
  timestamp: Date;
}

export interface FeedbackData {
  questionId: string;
  analysis: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    tips: string[];
    detailedFeedback: string;
    categoryScore: number;
    improvementAreas: string[];
  };
  sessionStats: {
    averageScore: number;
    totalQuestions: number;
    strongestArea: string;
    weakestArea: string;
    overallTrend: string;
  };
}

/**
 * API Client class for handling HTTP requests
 */
class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Start a new interview session
   */
  async startSession(config: SessionConfig): Promise<{ sessionId: string; websocketUrl: string }> {
    const response = await this.request<{
      success: boolean;
      sessionId: string;
      websocketUrl: string;
      message: string;
    }>('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify(config),
    });

    if (!response.success) {
      throw new Error('Failed to start interview session');
    }

    return {
      sessionId: response.sessionId,
      websocketUrl: `${WS_BASE_URL}${response.websocketUrl}`
    };
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<{
    session: InterviewSession;
    frontendState: any;
    messageHistory: any[];
  }> {
    return await this.request(`/api/sessions/${sessionId}`);
  }

  /**
   * Get system health
   */
  async getHealth(): Promise<{
    status: string;
    service: string;
    timestamp: Date;
    agents: Record<string, any>;
  }> {
    return await this.request('/api/health');
  }

  /**
   * Get agent health
   */
  async getAgentHealth(agentId: string): Promise<{
    agent: string;
    health: any;
  }> {
    return await this.request(`/api/agents/${agentId}/health`);
  }

  /**
   * Update ElevenLabs configuration
   */
  async updateElevenLabsConfig(config: any): Promise<void> {
    await this.request('/api/config/elevenlabs', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Update Mistral AI configuration
   */
  async updateMistralConfig(config: any): Promise<void> {
    await this.request('/api/config/mistral', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
}

/**
 * WebSocket Client for real-time communication
 */
export class InterviewWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Record<string, Function[]> = {};

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Connect to WebSocket server
   */
  connect(websocketUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(websocketUrl);

        this.ws.onopen = () => {
          console.log('🔌 Connected to AI Interview Coach WebSocket');
          this.reconnectAttempts = 0;
          this.emit('connected', { sessionId: this.sessionId });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket message:', message.type);
            this.emit(message.type, message.content);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('🚨 WebSocket error:', error);
          this.emit('error', error);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(websocketUrl);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(websocketUrl: string) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(() => {
      this.connect(websocketUrl).catch((error) => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Send message to server
   */
  send(type: string, content: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        content,
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(message));
      console.log('📤 Sent WebSocket message:', type);
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', type);
    }
  }

  /**
   * Start interview session
   */
  startInterview(config: SessionConfig) {
    this.send('start-interview', config);
  }

  /**
   * Submit answer
   */
  submitAnswer(questionId: string, answer: string) {
    this.send('submit-answer', { questionId, answer });
  }

  /**
   * Request audio for question
   */
  requestAudio(text: string) {
    this.send('request-audio', { text });
  }

  /**
   * End interview session
   */
  endInterview() {
    this.send('end-interview', {});
  }

  /**
   * Add event listener
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: Function) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton API client
export const apiClient = new APIClient();

// Export helper functions for common operations
export const interviewAPI = {
  /**
   * Start a new interview session and return WebSocket client
   */
  async startSession(config: SessionConfig): Promise<{
    sessionId: string;
    wsClient: InterviewWebSocketClient;
  }> {
    const { sessionId, websocketUrl } = await apiClient.startSession(config);
    const wsClient = new InterviewWebSocketClient(sessionId);
    
    await wsClient.connect(websocketUrl);
    
    return { sessionId, wsClient };
  },

  /**
   * Get session details
   */
  async getSessionDetails(sessionId: string) {
    return await apiClient.getSession(sessionId);
  },

  /**
   * Check system health
   */
  async checkHealth() {
    return await apiClient.getHealth();
  }
};