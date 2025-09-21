/**
 * Frontend Agent - Handles communication between frontend and backend agents
 * 
 * Responsibilities:
 * - Receive input from frontend interface
 * - Format and send messages to appropriate agents via Coral Protocol
 * - Receive feedback and format for frontend display
 * - Manage real-time communication with frontend (WebSocket/SSE)
 */

import { EventEmitter } from 'events';

interface FrontendMessage {
  type: 'start-interview' | 'submit-answer' | 'request-audio' | 'end-interview';
  sessionId: string;
  content: any;
  timestamp: Date;
}

interface BackendMessage {
  id: string;
  from: string;
  type: 'question' | 'feedback' | 'command' | 'error' | 'buffered';
  content: any;
  sessionId: string;
  timestamp: Date;
}

class FrontendAgent extends EventEmitter {
  private activeConnections: Map<string, any> = new Map();
  private sessionStates: Map<string, any> = new Map();
  private messageBuffer: Map<string, BackendMessage[]> = new Map();

  constructor() {
    super();
    this.setupMessageHandlers();
    this.setupWebSocketServer();
  }

  /**
   * Set up message handlers for various frontend interactions
   */
  private setupMessageHandlers() {
    this.on('frontend-message', this.handleFrontendMessage.bind(this));
    this.on('backend-message', this.handleBackendMessage.bind(this));
    this.on('session-update', this.handleSessionUpdate.bind(this));
    this.on('connection-established', this.handleConnectionEstablished.bind(this));
  }

  /**
   * Set up WebSocket server for real-time communication
   */
  private setupWebSocketServer() {
    // In a real implementation, this would set up a WebSocket server
    // For now, we'll simulate the connection handling
    console.log('🌐 Frontend Agent WebSocket server initialized');
  }

  /**
   * Handle incoming messages from frontend
   */
  async handleFrontendMessage(messageData: FrontendMessage) {
    try {
      const { type, sessionId, content } = messageData;
      
      console.log(`📱 Frontend message received: ${type} for session ${sessionId}`);

      switch (type) {
        case 'start-interview':
          await this.handleStartInterview(sessionId, content);
          break;
        
        case 'submit-answer':
          await this.handleSubmitAnswer(sessionId, content);
          break;
        
        case 'request-audio':
          await this.handleRequestAudio(sessionId, content);
          break;
        
        case 'end-interview':
          await this.handleEndInterview(sessionId);
          break;
        
        default:
          console.warn(`⚠️ Unknown frontend message type: ${type}`);
      }

    } catch (error) {
      console.error('❌ Failed to handle frontend message:', error);
      this.sendErrorToFrontend(messageData.sessionId, error);
    }
  }

  /**
   * Handle start interview request
   */
  private async handleStartInterview(sessionId: string, content: any) {
    // Initialize session state
    this.sessionStates.set(sessionId, {
      status: 'active',
      startTime: new Date(),
      currentQuestion: null,
      answerCount: 0
    });

    // Create message buffer for this session
    this.messageBuffer.set(sessionId, []);

    // Send session start message to Master Agent
    const message = {
      id: `start-${Date.now()}`,
      from: 'frontend-agent',
      to: 'master-agent',
      type: 'command',
      content: {
        command: 'create-session',
        sessionConfig: content
      },
      sessionId,
      timestamp: new Date()
    };

    this.emit('send-message', message);

    // Send acknowledgment to frontend
    this.sendToFrontend(sessionId, {
      type: 'session-started',
      content: {
        sessionId,
        status: 'Initializing AI Interview Coach...',
        message: 'Your interview session is being prepared by our multi-agent system.'
      }
    });

    console.log(`🎯 Started interview session: ${sessionId}`);
  }

  /**
   * Handle submit answer request
   */
  private async handleSubmitAnswer(sessionId: string, content: any) {
    const sessionState = this.sessionStates.get(sessionId);
    if (!sessionState) {
      throw new Error(`No active session found: ${sessionId}`);
    }

    // Update session state
    sessionState.answerCount++;
    sessionState.lastAnswer = content.answer;

    // Forward answer to Interviewer Agent via Master Agent
    const message = {
      id: `answer-${Date.now()}`,
      from: 'frontend-agent',
      to: 'interviewer-agent',
      type: 'answer',
      content: {
        questionId: content.questionId,
        answer: content.answer,
        metadata: {
          answerLength: content.answer.length,
          submissionTime: new Date(),
          answerIndex: sessionState.answerCount
        }
      },
      sessionId,
      timestamp: new Date()
    };

    this.emit('send-message', message);

    // Send processing acknowledgment to frontend
    this.sendToFrontend(sessionId, {
      type: 'answer-received',
      content: {
        message: 'Answer received. AI is analyzing your response...',
        status: 'processing'
      }
    });

    console.log(`📤 Submitted answer for analysis: ${sessionId}`);
  }

  /**
   * Handle audio request
   */
  private async handleRequestAudio(sessionId: string, content: any) {
    // Forward audio request to Interviewer Agent
    const message = {
      id: `audio-req-${Date.now()}`,
      from: 'frontend-agent',
      to: 'interviewer-agent',
      type: 'command',
      content: {
        command: 'generate-audio',
        text: content.text
      },
      sessionId,
      timestamp: new Date()
    };

    this.emit('send-message', message);
    console.log(`🔊 Requested audio generation: ${sessionId}`);
  }

  /**
   * Handle end interview request
   */
  private async handleEndInterview(sessionId: string) {
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.status = 'completed';
      sessionState.endTime = new Date();
    }

    // Request session summary from Analyzer Agent
    const message = {
      id: `end-${Date.now()}`,
      from: 'frontend-agent',
      to: 'analyzer-agent',
      type: 'command',
      content: {
        command: 'generate-session-summary'
      },
      sessionId,
      timestamp: new Date()
    };

    this.emit('send-message', message);

    // Send completion message to frontend
    this.sendToFrontend(sessionId, {
      type: 'interview-ended',
      content: {
        message: 'Interview session completed. Generating final report...',
        sessionSummary: sessionState
      }
    });

    console.log(`🏁 Ended interview session: ${sessionId}`);
  }

  /**
   * Handle incoming messages from backend agents
   */
  async handleBackendMessage(message: BackendMessage) {
    try {
      const { sessionId, type, content, from } = message;
      
      console.log(`📨 Backend message: ${from} → Frontend (${type})`);

      // Buffer the message
      if (!this.messageBuffer.has(sessionId)) {
        this.messageBuffer.set(sessionId, []);
      }
      this.messageBuffer.get(sessionId)!.push(message);

      // Process based on message type
      switch (type) {
        case 'question':
          await this.handleIncomingQuestion(sessionId, content);
          break;
        
        case 'feedback':
          await this.handleIncomingFeedback(sessionId, content);
          break;
        
        case 'command':
          await this.handleIncomingCommand(sessionId, content);
          break;
        
        case 'error':
          await this.handleIncomingError(sessionId, content);
          break;
        
        default:
          console.warn(`⚠️ Unknown backend message type: ${type}`);
      }

    } catch (error) {
      console.error('❌ Failed to handle backend message:', error);
      this.sendErrorToFrontend(message.sessionId, error);
    }
  }

  /**
   * Handle incoming question from Interviewer Agent
   */
  private async handleIncomingQuestion(sessionId: string, content: any) {
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.currentQuestion = content;
    }

    // Format question for frontend
    const frontendMessage = {
      type: 'new-question',
      content: {
        questionId: content.questionId,
        question: content.question,
        category: content.category,
        audioUrl: content.audioUrl,
        context: content.context,
        timestamp: new Date()
      }
    };

    this.sendToFrontend(sessionId, frontendMessage);
    console.log(`❓ Sent question to frontend: ${sessionId}`);
  }

  /**
   * Handle incoming feedback from Analyzer Agent
   */
  private async handleIncomingFeedback(sessionId: string, content: any) {
    // Format feedback for frontend display
    const frontendMessage = {
      type: 'feedback-received',
      content: {
        questionId: content.questionId,
        analysis: content.analysis,
        sessionStats: content.sessionStats,
        timestamp: new Date()
      }
    };

    this.sendToFrontend(sessionId, frontendMessage);
    
    // After sending feedback, request next question
    setTimeout(() => {
      const nextQuestionRequest = {
        id: `next-q-${Date.now()}`,
        from: 'frontend-agent',
        to: 'interviewer-agent',
        type: 'command',
        content: {
          command: 'next-question',
          previousFeedback: content.analysis
        },
        sessionId,
        timestamp: new Date()
      };

      this.emit('send-message', nextQuestionRequest);
    }, 1000);

    console.log(`💬 Sent feedback to frontend: ${sessionId}`);
  }

  /**
   * Handle incoming commands
   */
  private async handleIncomingCommand(sessionId: string, content: any) {
    switch (content.command) {
      case 'audio-generated':
        this.sendToFrontend(sessionId, {
          type: 'audio-ready',
          content: {
            audioUrl: content.audioUrl,
            originalText: content.originalText
          }
        });
        break;
      
      case 'interview-complete':
        this.sendToFrontend(sessionId, {
          type: 'interview-complete',
          content: content.summary
        });
        break;
      
      case 'session-summary':
        this.sendToFrontend(sessionId, {
          type: 'session-summary',
          content: {
            stats: content.stats,
            analyses: content.analyses
          }
        });
        break;
      
      default:
        console.warn(`⚠️ Unknown command: ${content.command}`);
    }
  }

  /**
   * Handle incoming errors
   */
  private async handleIncomingError(sessionId: string, content: any) {
    console.error(`🚨 Backend error for session ${sessionId}:`, content);
    
    this.sendToFrontend(sessionId, {
      type: 'error',
      content: {
        message: 'An error occurred during the interview session.',
        error: content.error,
        recoverable: content.recoverable || false
      }
    });
  }

  /**
   * Send message to frontend via WebSocket
   */
  private sendToFrontend(sessionId: string, message: any) {
    const connection = this.activeConnections.get(sessionId);
    
    if (connection) {
      // In a real implementation, this would send via WebSocket
      console.log(`📱 → Frontend (${sessionId}):`, message.type);
      
      // Simulate WebSocket send
      connection.send?.(JSON.stringify(message));
    } else {
      console.warn(`⚠️ No active connection for session: ${sessionId}`);
      
      // Buffer the message for when connection is established
      if (!this.messageBuffer.has(sessionId)) {
        this.messageBuffer.set(sessionId, []);
      }
      this.messageBuffer.get(sessionId)!.push({
        id: `buffered-${Date.now()}`,
        from: 'frontend-agent',
        type: 'buffered',
        content: message,
        sessionId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send error message to frontend
   */
  private sendErrorToFrontend(sessionId: string, error: any) {
    this.sendToFrontend(sessionId, {
      type: 'error',
      content: {
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date()
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnectionEstablished(connectionData: any) {
    const { sessionId, connection } = connectionData;
    
    this.activeConnections.set(sessionId, connection);
    console.log(`🔌 Connection established for session: ${sessionId}`);

    // Send any buffered messages
    const bufferedMessages = this.messageBuffer.get(sessionId) || [];
    bufferedMessages.forEach(message => {
      if (message.type === 'buffered') {
        this.sendToFrontend(sessionId, message.content);
      }
    });

    // Clear buffer
    this.messageBuffer.set(sessionId, []);
  }

  /**
   * Handle session updates
   */
  handleSessionUpdate(updateData: any) {
    const { sessionId, update } = updateData;
    const sessionState = this.sessionStates.get(sessionId);
    
    if (sessionState) {
      Object.assign(sessionState, update);
      console.log(`📊 Session updated: ${sessionId}`);
    }
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string) {
    return this.sessionStates.get(sessionId);
  }

  /**
   * Get message history for session
   */
  getMessageHistory(sessionId: string) {
    return this.messageBuffer.get(sessionId) || [];
  }

  /**
   * Clean up completed sessions
   */
  cleanupSession(sessionId: string) {
    this.sessionStates.delete(sessionId);
    this.messageBuffer.delete(sessionId);
    this.activeConnections.delete(sessionId);
    console.log(`🧹 Cleaned up session: ${sessionId}`);
  }

  /**
   * Get agent health status
   */
  healthCheck() {
    return {
      status: 'healthy',
      activeConnections: this.activeConnections.size,
      activeSessions: this.sessionStates.size,
      bufferedMessages: Array.from(this.messageBuffer.values()).flat().length,
      timestamp: new Date()
    };
  }
}

export default FrontendAgent;