import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowToUseSection } from '@/components/landing/HowToUseSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowToUseSection />
      <UseCasesSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
