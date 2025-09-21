import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import InterviewInterface from "@/components/InterviewInterface";

const Index = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'interview'>('landing');

  const handleStartInterview = () => {
    setCurrentView('interview');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage onStartInterview={handleStartInterview} />
      )}
      {currentView === 'interview' && (
        <InterviewInterface onBack={handleBackToLanding} />
      )}
    </>
  );
};

export default Index;