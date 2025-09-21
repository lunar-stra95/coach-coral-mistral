import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  Bot, 
  User, 
  Brain,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { interviewService, type InterviewMessage, type AnalysisResult } from "@/lib/interviewService";

interface Message {
  id: string;
  type: 'question' | 'answer' | 'feedback';
  content: string;
  timestamp: Date;
  feedback?: AnalysisResult;
  category?: string;
  audioUrl?: string;
  context?: string;
}

interface InterviewInterfaceProps {
  onBack: () => void;
}

const InterviewInterface = ({ onBack }: InterviewInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = async () => {
    setSessionStarted(true);
    setIsProcessing(true);

    try {
      const sessionConfig = {
        interviewType: 'general' as const,
        difficulty: 'medium' as const,
        candidateProfile: {
          name: 'Candidate',
          role: 'Software Engineer',
          experience: 'Mid-level',
          industry: 'Technology'
        }
      };

      const sessionId = await interviewService.startSession(sessionConfig);
      
      // Set up event listeners
      interviewService.on('question-asked', (questionData: any) => {
        const question: Message = {
          id: questionData.id,
          type: 'question',
          content: questionData.content,
          timestamp: questionData.timestamp,
          category: questionData.category,
          context: questionData.context
        };
        
        setMessages(prev => [...prev, question]);
        setIsProcessing(false);
      });

      interviewService.on('feedback-received', (feedbackData: InterviewMessage) => {
        const feedbackMessage: Message = {
          id: feedbackData.id,
          type: 'feedback',
          content: feedbackData.content,
          timestamp: feedbackData.timestamp,
          feedback: feedbackData.feedback
        };
        
        setMessages(prev => [...prev, feedbackMessage]);
        setIsProcessing(false);
      });

      interviewService.on('analysis-started', () => {
        setIsProcessing(true);
      });

      interviewService.on('interview-completed', (summary: any) => {
        toast({
          title: "Interview Complete!",
          description: `Completed ${summary.totalQuestions} questions with an average score of ${summary.averageScore}/10`,
        });
        setIsProcessing(false);
      });

      toast({
        title: "Interview Started!",
        description: "AI Interviewer is ready to begin. Take your time to provide thoughtful answers.",
      });
      
    } catch (error) {
      console.error('Failed to start interview:', error);
      toast({
        title: "Error",
        description: "Failed to start interview session. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
      setSessionStarted(false);
    }
  };

  const playQuestionAudio = async (questionText: string) => {
    try {
      setIsProcessing(true);
      const audioUrl = await interviewService.playQuestionAudio(questionText);
      
      toast({
        title: "Audio Generated",
        description: "Question audio has been generated using ElevenLabs TTS simulation.",
      });
      
      // In a real implementation, you would play the audio here
      console.log('Audio URL:', audioUrl);
      
    } catch (error) {
      toast({
        title: "Audio Error",
        description: "Failed to generate audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    const currentQuestion = messages.filter(m => m.type === 'question').pop();
    if (!currentQuestion) return;

    const userAnswer: Message = {
      id: Date.now().toString(),
      type: 'answer',
      content: currentAnswer.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userAnswer]);
    setCurrentAnswer("");
    setIsProcessing(true);

    try {
      await interviewService.submitAnswer(currentQuestion.id, userAnswer.content);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast({
        title: "Voice Recording",
        description: "Voice input feature will be integrated with browser APIs and speech recognition.",
      });
    }
  };

  if (!sessionStarted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-interview p-6">
        <Card className="w-full max-w-lg bg-gradient-card border-border p-8 shadow-interview text-center">
          <div className="mb-6 inline-flex rounded-full bg-primary/10 p-4">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Ready to Begin?
          </h2>
          
          <p className="mb-6 text-muted-foreground">
            Your AI Interview Coach will ask you questions and provide detailed feedback to help you improve. This session will be powered by our multi-agent system using Coral Protocol.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onBack} variant="outline" className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <Button onClick={startInterview} className="flex-1 bg-primary hover:bg-primary/90">
              <Bot className="mr-2 h-4 w-4" />
              Start Interview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-interview">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 border-b border-border bg-interview-bg/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">AI Interview Coach</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-secondary animate-pulse"></div>
            Active Session
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 pt-20">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="animate-fade-in">
                  {message.type === 'question' && (
                    <Card className="bg-question-bg border-border p-6 shadow-card-custom">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium text-foreground">AI Interviewer</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playQuestionAudio(message.content)}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-foreground leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {message.type === 'answer' && (
                    <Card className="ml-12 bg-answer-bg border-border p-6 shadow-card-custom">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-secondary/10 p-2">
                          <User className="h-5 w-5 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-2">
                            <span className="font-medium text-foreground">Your Answer</span>
                          </div>
                          <p className="text-foreground leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {message.type === 'feedback' && message.feedback && (
                    <Card className="bg-interview-card border-border p-6 shadow-interview">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-feedback-positive/10 p-2">
                          <TrendingUp className="h-5 w-5 text-feedback-positive" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-4 flex items-center justify-between">
                            <span className="font-medium text-foreground">AI Analysis</span>
                            {message.feedback.score && (
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                Score: {message.feedback.score}/10
                              </span>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h4 className="mb-2 flex items-center gap-2 font-medium text-feedback-positive">
                                <TrendingUp className="h-4 w-4" />
                                Strengths
                              </h4>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                {message.feedback.strengths.map((strength, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-feedback-positive"></span>
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="mb-2 flex items-center gap-2 font-medium text-feedback-warning">
                                <AlertTriangle className="h-4 w-4" />
                                Areas for Improvement
                              </h4>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                {message.feedback.weaknesses.map((weakness, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-feedback-warning"></span>
                                    {weakness}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {message.feedback.tips.length > 0 && (
                            <div className="mt-4 rounded-lg bg-primary/5 p-4">
                              <h4 className="mb-2 font-medium text-primary">💡 Improvement Tips</h4>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                {message.feedback.tips.map((tip, index) => (
                                  <li key={index}>• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              ))}

              {isProcessing && (
                <Card className="bg-question-bg border-border p-6 shadow-card-custom animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Brain className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <span className="text-muted-foreground">AI is analyzing your response...</span>
                  </div>
                </Card>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-interview-bg/80 backdrop-blur-sm p-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here... Be specific and provide examples when possible."
                    className="min-h-[100px] resize-none border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-primary"
                    disabled={isProcessing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isProcessing) {
                        e.preventDefault();
                        submitAnswer();
                      }
                    }}
                  />
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Ctrl+Enter to submit</span>
                    <span>{currentAnswer.length} characters</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleRecording}
                    className={`${
                      isRecording ? 'bg-destructive text-destructive-foreground' : ''
                    }`}
                    disabled={isProcessing}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  <Button
                    onClick={submitAnswer}
                    disabled={!currentAnswer.trim() || isProcessing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewInterface;