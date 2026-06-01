import { Switch, Route, Redirect, Router as WouterRouter } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"
import { Loader2 } from "lucide-react"
import NotFound from "@/pages/not-found"
import MarketingPage from "@/pages/marketing"
import SignInPage from "@/pages/auth/sign-in"
import SignUpPage from "@/pages/auth/sign-up"
import ForgotPasswordPage from "@/pages/auth/forgot-password"
import OnboardingPage from "@/pages/auth/onboarding"
import { DashboardLayout } from "@/pages/dashboard/layout"
import OverviewPage from "@/pages/dashboard/overview"
import LeadsPage from "@/pages/dashboard/leads"
import LeadProfilePage from "@/pages/dashboard/lead-profile"
import PropertiesPage from "@/pages/dashboard/properties"
import MessagesPage from "@/pages/dashboard/messages"
import AnalyticsPage from "@/pages/dashboard/analytics"
import AIIntelligencePage from "@/pages/dashboard/ai-intelligence"
import AutomationsPage from "@/pages/dashboard/automations"
import TeamPage from "@/pages/dashboard/team"
import DealsPage from "@/pages/dashboard/deals"
import DocumentsPage from "@/pages/dashboard/documents"
import CalendarPage from "@/pages/dashboard/calendar"
import SettingsPage from "@/pages/dashboard/settings"
import IntegrationsPage from "@/pages/dashboard/integrations"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "")

export const THEMES = [
  { id: "gold",     name: "Luxe Gold",         description: "Warm amber tones",      swatches: ["#C4943A", "#E8C88A", "#FDF6E8"] },
  { id: "midnight", name: "Midnight",           description: "Dark & sophisticated",  swatches: ["#C4943A", "#2D2B3D", "#141320"] },
  { id: "ocean",    name: "Ocean Blue",         description: "Deep nautical blue",    swatches: ["#1B5FD4", "#4A8FE8", "#EEF3FD"] },
  { id: "emerald",  name: "Emerald Prestige",   description: "Rich emerald green",    swatches: ["#1A8C5C", "#42B47E", "#EEF7F2"] },
  { id: "rose",     name: "Rose",               description: "Elegant rose tones",    swatches: ["#D42A5E", "#E8688E", "#FDF0F4"] },
  { id: "slate",    name: "Slate Pro",          description: "Cool professional gray",swatches: ["#3B5074", "#6B84A4", "#F0F2F6"] },
  { id: "violet",   name: "Violet Executive",   description: "Bold executive purple", swatches: ["#6D28D9", "#9F6FE8", "#F5F0FE"] },
]

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
          <span className="text-xl font-bold text-primary-foreground">L</span>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Redirect to="/sign-in" />
  return <>{children}</>
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useCurrentUser()
  if (isLoading) return <LoadingScreen />
  if (profile && !profile.onboarded) return <Redirect to="/onboarding" />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Redirect to="/dashboard" />
  return <>{children}</>
}

function HomeRedirect() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Redirect to="/dashboard" />
  return <MarketingPage />
}

function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <DashboardLayout>
          <Switch>
            <Route path="/dashboard" component={OverviewPage} />
            <Route path="/dashboard/leads" component={LeadsPage} />
            <Route path="/dashboard/properties" component={PropertiesPage} />
            <Route path="/dashboard/messages" component={MessagesPage} />
            <Route path="/dashboard/analytics" component={AnalyticsPage} />
            <Route path="/dashboard/ai-intelligence" component={AIIntelligencePage} />
            <Route path="/dashboard/automations" component={AutomationsPage} />
            <Route path="/dashboard/team" component={TeamPage} />
            <Route path="/dashboard/deals" component={DealsPage} />
            <Route path="/dashboard/documents" component={DocumentsPage} />
            <Route path="/dashboard/calendar" component={CalendarPage} />
            <Route path="/dashboard/settings" component={SettingsPage} />
            <Route path="/dashboard/integrations" component={IntegrationsPage} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

function LeadProfileRoute({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <DashboardLayout>
          <LeadProfilePage params={params} />
        </DashboardLayout>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in">
        <PublicOnlyRoute><SignInPage /></PublicOnlyRoute>
      </Route>
      <Route path="/sign-up">
        <PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>
      </Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/onboarding">
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/leads/:id" component={LeadProfileRoute} />
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route path="/dashboard/:rest*" component={DashboardRoutes} />
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="gold"
          enableSystem={false}
          themes={["gold", "midnight", "ocean", "emerald", "rose", "slate", "violet"]}
        >
          <TooltipProvider>
            <AuthProvider>
              <Router />
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WouterRouter>
  )
}

export default App
