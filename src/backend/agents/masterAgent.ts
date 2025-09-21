/**
 * Master Agent - Orchestrates all agents using Coral Protocol
 * 
 * Responsibilities:
 * - Register all agents with Coral Protocol
 * - Route messages between agents securely
 * - Manage session state and coordination
 * - Handle error recovery and monitoring
 */

import { EventEmitter } from 'events';

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'question' | 'answer' | 'feedback' | 'command';
  content: any;
  sessionId: string;
  timestamp: Date;
}

interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  endpoints: string[];
}

class MasterAgent extends EventEmitter {
  private agents: Map<string, AgentDescriptor> = new Map();
  private sessions: Map<string, any> = new Map();
  private messageQueue: AgentMessage[] = [];

  constructor() {
    super();
    this.initializeCoralProtocol();
  }

  /**
   * Initialize Coral Protocol connection and event handlers
   */
  private async initializeCoralProtocol() {
    try {
      // Coral Protocol initialization
      console.log('🌊 Initializing Coral Protocol for AI Interview Coach...');
      
      // Register this master agent
      await this.registerWithCoral({
        id: 'master-agent',
        name: 'AI Interview Coach Master Agent',
        description: 'Orchestrates interview coaching session with specialized AI agents',
        capabilities: ['orchestration', 'routing', 'session-management'],
        endpoints: ['/api/master/route', '/api/master/session']
      });

      // Set up message routing
      this.setupMessageRouting();
      
      console.log('✅ Master Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Coral Protocol:', error);
      throw error;
    }
  }

  /**
   * Register an agent with Coral Protocol
   */
  async registerAgent(descriptor: AgentDescriptor): Promise<void> {
    try {
      await this.registerWithCoral(descriptor);
      this.agents.set(descriptor.id, descriptor);
      
      console.log(`✅ Registered agent: ${descriptor.name} (${descriptor.id})`);
      
      // Emit registration event for other agents to discover
      this.emit('agent-registered', descriptor);
    } catch (error) {
      console.error(`❌ Failed to register agent ${descriptor.id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new interview session
   */
  async createSession(sessionConfig: any): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      status: 'initialized',
      startTime: new Date(),
      config: sessionConfig,
      participants: ['interviewer-agent', 'analyzer-agent', 'frontend-agent'],
      messageHistory: []
    };

    this.sessions.set(sessionId, session);
    
    // Notify all agents about new session
    await this.broadcastMessage({
      id: `msg-${Date.now()}`,
      from: 'master-agent',
      to: 'all',
      type: 'command',
      content: { command: 'session-created', sessionId, config: sessionConfig },
      sessionId,
      timestamp: new Date()
    });

    console.log(`🎯 Created interview session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Route message between agents
   */
  async routeMessage(message: AgentMessage): Promise<void> {
    try {
      // Log message for debugging
      console.log(`📨 Routing message: ${message.from} → ${message.to} (${message.type})`);
      
      // Validate session
      if (!this.sessions.has(message.sessionId)) {
        throw new Error(`Invalid session ID: ${message.sessionId}`);
      }

      // Store message in session history
      const session = this.sessions.get(message.sessionId);
      session.messageHistory.push(message);

      // Route based on message type and recipient
      switch (message.to) {
        case 'interviewer-agent':
          await this.forwardToInterviewerAgent(message);
          break;
        case 'analyzer-agent':
          await this.forwardToAnalyzerAgent(message);
          break;
        case 'frontend-agent':
          await this.forwardToFrontendAgent(message);
          break;
        case 'all':
          await this.broadcastMessage(message);
          break;
        default:
          console.warn(`⚠️ Unknown recipient: ${message.to}`);
      }

      // Emit routing event for monitoring
      this.emit('message-routed', message);
    } catch (error) {
      console.error('❌ Failed to route message:', error);
      this.emit('routing-error', { message, error });
    }
  }

  /**
   * Set up message routing handlers
   */
  private setupMessageRouting() {
    // Handle incoming messages from agents
    this.on('agent-message', this.routeMessage.bind(this));
    
    // Handle session state changes
    this.on('session-update', (sessionId: string, update: any) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        Object.assign(session, update);
        console.log(`📊 Session updated: ${sessionId}`, update);
      }
    });

    // Handle errors and recovery
    this.on('routing-error', this.handleRoutingError.bind(this));
  }

  /**
   * Forward message to Interviewer Agent
   */
  private async forwardToInterviewerAgent(message: AgentMessage) {
    // In a real implementation, this would use Coral Protocol's secure messaging
    // For now, we'll use HTTP API calls or WebSocket connections
    
    try {
      const response = await fetch('/api/agents/interviewer/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`Interviewer agent error: ${response.statusText}`);
      }
      
      console.log('✅ Message forwarded to Interviewer Agent');
    } catch (error) {
      console.error('❌ Failed to forward to Interviewer Agent:', error);
      throw error;
    }
  }

  /**
   * Forward message to Analyzer Agent
   */
  private async forwardToAnalyzerAgent(message: AgentMessage) {
    try {
      const response = await fetch('/api/agents/analyzer/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`Analyzer agent error: ${response.statusText}`);
      }
      
      console.log('✅ Message forwarded to Analyzer Agent');
    } catch (error) {
      console.error('❌ Failed to forward to Analyzer Agent:', error);
      throw error;
    }
  }

  /**
   * Forward message to Frontend Agent
   */
  private async forwardToFrontendAgent(message: AgentMessage) {
    try {
      // For frontend agent, we typically use WebSocket connections
      // or Server-Sent Events for real-time updates
      
      console.log('✅ Message forwarded to Frontend Agent');
      this.emit('frontend-message', message);
    } catch (error) {
      console.error('❌ Failed to forward to Frontend Agent:', error);
      throw error;
    }
  }

  /**
   * Broadcast message to all agents
   */
  private async broadcastMessage(message: AgentMessage) {
    const agents = ['interviewer-agent', 'analyzer-agent', 'frontend-agent'];
    
    const promises = agents.map(agentId => {
      const agentMessage = { ...message, to: agentId };
      return this.routeMessage(agentMessage).catch(error => {
        console.error(`Failed to broadcast to ${agentId}:`, error);
      });
    });

    await Promise.allSettled(promises);
    console.log('📢 Broadcast completed');
  }

  /**
   * Handle routing errors with recovery strategies
   */
  private handleRoutingError({ message, error }: { message: AgentMessage; error: any }) {
    console.error(`🚨 Routing error for message ${message.id}:`, error);
    
    // Implement retry logic
    this.messageQueue.push(message);
    
    // Schedule retry
    setTimeout(() => {
      if (this.messageQueue.length > 0) {
        const retryMessage = this.messageQueue.shift();
        if (retryMessage) {
          console.log(`🔄 Retrying message: ${retryMessage.id}`);
          this.routeMessage(retryMessage);
        }
      }
    }, 5000);
  }

  /**
   * Mock Coral Protocol registration
   * In real implementation, this would use actual Coral Protocol SDK
   */
  private async registerWithCoral(descriptor: AgentDescriptor): Promise<void> {
    // Mock registration - replace with actual Coral Protocol calls
    console.log(`🌊 Registering with Coral Protocol:`, descriptor);
    
    // Simulate async registration
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  /**
   * Get session information
   */
  getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all registered agents
   */
  getAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Health check for monitoring
   */
  healthCheck() {
    return {
      status: 'healthy',
      agentsCount: this.agents.size,
      activeSessions: this.sessions.size,
      queueLength: this.messageQueue.length,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export const masterAgent = new MasterAgent();
export default MasterAgent;