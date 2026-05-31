import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Victoria Sterling",
    role: "Luxury Real Estate Broker",
    location: "Beverly Hills, CA",
    content:
      "LuxeState transformed how I manage my high-net-worth clients. The WhatsApp integration alone has increased my response rate by 300%. My clients appreciate the premium experience.",
    rating: 5,
  },
  {
    name: "James Thornton III",
    role: "Managing Director",
    location: "Manhattan, NY",
    content:
      "Finally, a CRM that matches the caliber of properties we sell. The analytics are invaluable for understanding market trends, and the interface is simply beautiful.",
    rating: 5,
  },
  {
    name: "Isabelle Moreau",
    role: "Senior Property Consultant",
    location: "Monte Carlo, Monaco",
    content:
      "The multi-language support has been game-changing for our international clientele. We've closed 40% more deals since switching to LuxeState.",
    rating: 5,
  },
  {
    name: "Alexander Chen",
    role: "Founder & CEO",
    location: "Singapore",
    content:
      "The automation features save me hours every week. The lead scoring is incredibly accurate — it knows which prospects are ready to buy before they do.",
    rating: 5,
  },
  {
    name: "Sophia Blackwell",
    role: "Principal Agent",
    location: "London, UK",
    content:
      "My team's productivity has doubled. The property showcase feature helps us present listings in a way that matches the luxury experience our clients expect.",
    rating: 5,
  },
  {
    name: "Marcus Reynolds",
    role: "Director of Sales",
    location: "Nice, France",
    content:
      "We've tried every CRM on the market. LuxeState is the only one built specifically for luxury real estate. The difference in quality is immediately apparent.",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Trusted by the World's
            <span className="text-primary"> Elite </span>
            Real Estate Professionals
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Join thousands of luxury real estate professionals who have transformed their business
            with LuxeState.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative h-full p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300">
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-muted-foreground leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-primary fill-current" />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.location}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">
            Trusted by leading brokerages worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
            {[
              "Sotheby's",
              "Christie's",
              "Engel & Völkers",
              "Knight Frank",
              "Savills",
              "Douglas Elliman",
            ].map((brand) => (
              <div key={brand} className="text-lg font-semibold text-muted-foreground">
                {brand}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
