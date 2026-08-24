/** Signal Atelier: application routing preserves the single AI hub as a precise, dark editorial instrument. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ApiKeyProvider } from "./contexts/ApiKeyContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import InfoPage from "./pages/InfoPage";
import ToolDetail from "./pages/ToolDetail";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/tools/:slug" component={ToolDetail} />
    <Route path="/privacy">{() => <InfoPage kind="privacy" />}</Route>
    <Route path="/terms">{() => <InfoPage kind="terms" />}</Route>
    <Route path="/about">{() => <InfoPage kind="about" />}</Route>
    <Route path="/contact">{() => <InfoPage kind="contact" />}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><ApiKeyProvider><TooltipProvider><Toaster /><Router /></TooltipProvider></ApiKeyProvider></ThemeProvider></ErrorBoundary>; }
export default App;
