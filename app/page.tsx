import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { GlobalBanner } from "@/components/marketing/GlobalBanner";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Faq } from "@/components/marketing/Faq";
import { Cta } from "@/components/marketing/Cta";
import { About } from "@/components/marketing/About";

export default function HomePage() {
  return (
    <>
      <GlobalBanner />
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Faq />
        <Cta />
        <About />
      </main>
      <SiteFooter />
    </>
  );
}
