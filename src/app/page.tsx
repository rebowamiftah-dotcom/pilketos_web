import React from 'react';
import StudentNavbar from '@/components/StudentNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import LandingFooter from './components/LandingFooter';


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <LandingFooter />
    </div>
  );
}