import { motion } from "framer-motion"
import {
  Users,
  MessageCircle,
  BarChart3,
  Building2,
  Shield,
  Zap,
  Bell,
  Globe,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Smart Lead Tracking",
    description:
      "AI-powered lead scoring and automated pipeline management to prioritize your hottest prospects.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Integration",
    description:
      "Connect directly with clients via WhatsApp. Send updates, schedule viewings, and close deals faster.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Beautiful dashboards with real-time insights into your sales performance and market trends.",
    gradient: "from-primary to-amber-500",
  },
  {
    icon: Building2,
    title: "Property Management",
    description:
      "Showcase properties with stunning galleries, virtual tours, and detailed specifications.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-level encryption and compliance with GDPR, SOC 2, and other security standards.",
    gradient: "from-red-500 to-orange-500",
  },
  {
    icon: Zap,
    title: "Workflow Automation",
    description:
      "Automate repetitive tasks, follow-ups, and reminders to focus on what matters most.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Never miss an opportunity with intelligent alerts for lead activities and market changes.",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "Serve international clients with support for 40+ languages and automatic translations.",
    gradient: "from-indigo-500 to-blue-500",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function Features() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Everything You Need to
            <span className="text-primary"> Dominate </span>
            Real Estate
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Powerful tools designed specifically for high-end real estate professionals who demand
            excellence in every aspect of their business.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative h-full p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
