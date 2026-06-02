import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Lock, MessageCircle } from "lucide-react"

export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <DashboardPageHeader
        title="Messages"
        subtitle="Send and receive messages from your leads"
      />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-green-500/10 border border-green-500/20">
              <MessageCircle className="h-12 w-12 text-green-500/50" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-md">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Coming Soon
            </span>
            <h2 className="text-xl font-semibold text-foreground mt-2">WhatsApp Messaging</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Two-way WhatsApp Business messaging is being set up. Once connected, you'll send and receive
              messages with your leads directly inside the CRM — in real time.
            </p>
          </div>

          <div className="w-full rounded-xl border border-border/50 bg-secondary/20 p-4 text-left space-y-2.5">
            <p className="text-xs font-semibold text-foreground">What's coming:</p>
            {[
              "Two-way WhatsApp conversations",
              "Automated message templates",
              "Lead-linked message history",
              "Real-time delivery receipts",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Connect your WhatsApp Business account in{" "}
            <span className="font-medium text-foreground">Settings → Connected Accounts</span> to be ready
            when it launches.
          </p>
        </div>
      </div>
    </div>
  )
}
