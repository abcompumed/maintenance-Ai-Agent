import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// استيراد الصفحات بمسارات مباشرة لضمان عملها على Vercel
import Home from "./pages/Home";
import ChatInterface from "./pages/ChatInterface";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/AdminDashboard";
import ForumCredentials from "./pages/ForumCredentials";
import GitHubSettings from "./pages/GitHubSettings";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={ChatInterface} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/forum-credentials" component={ForumCredentials} />
      <Route path="/github-settings" component={GitHubSettings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
