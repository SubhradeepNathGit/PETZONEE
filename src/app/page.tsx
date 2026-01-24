'use client';

import Banner from "./homeComponents/banner";
import AboutPage from "./homeComponents/about";
import PetServices from "./homeComponents/services";
import MarqueeOffers from "./homeComponents/marquee";
import ProductSection from "./homeComponents/products";
import OfferBanner from "./homeComponents/offer";
import PricingSection from "./homeComponents/pricing";
import TestimonialSection from "./homeComponents/testimonials";
import Team from "./homeComponents/team";
import FAQSection from "./homeComponents/faq";
import StatsSection from "./homeComponents/stats";
import ServicesMarquee from "./homeComponents/mark";


export default function Home() {
  return (
    <>
      <Banner />
      <AboutPage />
      <PetServices />
      <ServicesMarquee/>
      <StatsSection />
      <MarqueeOffers />
     
      
      <ProductSection />
      <OfferBanner />
      <PricingSection />
      
      <Team />
      <FAQSection />
      <TestimonialSection />
    </>
  );
}
