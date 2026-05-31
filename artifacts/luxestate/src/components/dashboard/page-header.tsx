import { motion } from "framer-motion"
import { ReactNode } from "react"

type DashboardPageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
  delay?: number
}

export function DashboardPageHeader({ title, description, actions, delay = 0 }: DashboardPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </motion.div>
  )
}
