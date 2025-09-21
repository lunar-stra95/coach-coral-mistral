import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, MessageSquare, TrendingUp, Mic, Star, CheckCircle } from "lucide-react";

interface LandingPageProps {
  onStartInterview: () => void;
}

const LandingPage = ({ onStartInterview }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-interview">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <Brain className="h-4 w-4" />
            AI-Powered Interview Coaching
          </div>
          
          <h1 className="mb-6 bg-gradient-hero bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
            Master Your Next
            <br />
            <span className="text-primary">Interview</span>
          </h1>
          
          <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
            Practice with our AI Interview Coach. Get real-time feedback,
            <br />
            improve your answers, and land your dream job with confidence.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={onStartInterview}
              className="bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-glow"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Start Mock Interview
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              <Mic className="mr-2 h-5 w-5" />
              Try Voice Mode
            </Button>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute left-10 top-20 animate-fade-in">
          <div className="rounded-full bg-primary/20 p-3">
            <Brain className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        <div className="absolute right-10 top-32 animate-fade-in delay-300">
          <div className="rounded-full bg-secondary/20 p-3">
            <TrendingUp className="h-6 w-6 text-secondary" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Why Choose AI Interview Coach?
            </h2>
            <p className="text-lg text-muted-foreground">
              Advanced AI technology meets personalized coaching
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-gradient-card border-border p-6 shadow-card-custom">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                Smart AI Analysis
              </h3>
              <p className="text-muted-foreground">
                Powered by Mistral AI to analyze your responses and provide detailed feedback on content, structure, and delivery.
              </p>
            </Card>

            <Card className="bg-gradient-card border-border p-6 shadow-card-custom">
              <div className="mb-4 inline-flex rounded-full bg-secondary/10 p-3">
                <Mic className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                Voice-Enabled Practice
              </h3>
              <p className="text-muted-foreground">
                Practice with realistic voice questions using ElevenLabs TTS technology for an immersive interview experience.
              </p>
            </Card>

            <Card className="bg-gradient-card border-border p-6 shadow-card-custom">
              <div className="mb-4 inline-flex rounded-full bg-feedback-positive/10 p-3">
                <TrendingUp className="h-6 w-6 text-feedback-positive" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                Real-time Feedback
              </h3>
              <p className="text-muted-foreground">
                Get instant strengths and improvement areas after each answer to accelerate your interview skills.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-6 text-2xl font-bold text-foreground">
                What You'll Get
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-1 h-5 w-5 text-feedback-positive" />
                  <div>
                    <p className="font-medium text-foreground">Personalized Question Sets</p>
                    <p className="text-sm text-muted-foreground">
                      Tailored questions based on your role and industry
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-1 h-5 w-5 text-feedback-positive" />
                  <div>
                    <p className="font-medium text-foreground">Detailed Performance Analytics</p>
                    <p className="text-sm text-muted-foreground">
                      Track your progress with scoring and improvement metrics
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-1 h-5 w-5 text-feedback-positive" />
                  <div>
                    <p className="font-medium text-foreground">Multi-Agent AI System</p>
                    <p className="text-sm text-muted-foreground">
                      Coral Protocol orchestrates specialized AI agents for comprehensive coaching
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gradient-card border border-border p-6 shadow-interview">
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-feedback-warning" />
                <Star className="h-5 w-5 text-feedback-warning" />
                <Star className="h-5 w-5 text-feedback-warning" />
                <Star className="h-5 w-5 text-feedback-warning" />
                <Star className="h-5 w-5 text-feedback-warning" />
              </div>
              
              <blockquote className="mb-4 text-foreground">
                "The AI Interview Coach helped me identify my weak points and practice until I felt confident. I landed my dream job after just 2 weeks of practice!"
              </blockquote>
              
              <cite className="text-sm text-muted-foreground">
                — Sarah Chen, Software Engineer
              </cite>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to Ace Your Interview?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join thousands of successful candidates who improved their interview skills with AI coaching.
          </p>
          
          <Button
            size="lg"
            onClick={onStartInterview}
            className="bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-glow"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Begin Your Practice Session
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;