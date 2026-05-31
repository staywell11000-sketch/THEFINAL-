import { MarketingHeader } from "@/components/marketing/marketing-header"
import { Hero } from "@/components/marketing/hero"
import { Features } from "@/components/marketing/features"
import { DashboardPreview } from "@/components/marketing/dashboard-preview"
import { Testimonials } from "@/components/marketing/testimonials"
import { Pricing } from "@/components/marketing/pricing"
import { Footer } from "@/components/marketing/footer"

export default function MarketingPage() {
  return (
    <div className="min-h-screen animated-gradient">
      <MarketingHeader />
      <main>
        <Hero />
        <Features />
        <DashboardPreview />
        <Testimonials />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
