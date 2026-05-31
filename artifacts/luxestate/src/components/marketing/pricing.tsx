import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Sparkles } from "lucide-react"
import { Link } from "wouter"

const plans = [
  {
    name: "Starter",
    description: "Perfect for individual agents getting started",
    price: { monthly: 49, annual: 39 },
    features: [
      "Up to 500 leads",
      "Basic analytics",
      "WhatsApp integration",
      "Email support",
      "Property listings (25)",
      "Mobile app access",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing agents who need more power",
    price: { monthly: 99, annual: 79 },
    features: [
      "Up to 5,000 leads",
      "Advanced analytics",
      "WhatsApp + SMS integration",
      "Priority support",
      "Unlimited property listings",
      "Team collaboration (3 users)",
      "Custom branding",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For teams and brokerages at scale",
    price: { monthly: 299, annual: 249 },
    features: [
      "Unlimited leads",
      "AI-powered insights",
      "All integrations",
      "Dedicated account manager",
      "Unlimited everything",
      "Unlimited team members",
      "White-label solution",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true)

  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Invest in Your
            <span className="text-primary"> Success </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span
            className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isAnnual ? "bg-primary" : "bg-muted"}`}
          >
            <motion.div
              animate={{ x: isAnnual ? 28 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm"
            />
          </button>
          <span
            className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Annual
            <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
              Save 20%
            </span>
          </span>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-[-16px]" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg shadow-primary/25">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}
              <div
                className={`relative h-full p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
                  plan.popular
                    ? "bg-card/80 border-primary/50 shadow-xl shadow-primary/10"
                    : "bg-card/50 border-border/50 hover:border-primary/30"
                }`}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed annually (${plan.price.annual * 12}/year)
                    </p>
                  )}
                </div>
                <Link href="/dashboard" className="block mb-6">
                  <Button
                    className={`w-full font-semibold ${
                      plan.popular ? "shadow-lg shadow-primary/25 hover:shadow-primary/40" : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border/50">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">30-Day Money Back Guarantee</div>
              <div className="text-xs text-muted-foreground">
                No questions asked, full refund within 30 days
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
