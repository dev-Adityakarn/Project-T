import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export class AdminErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep technical detail in the console, never in the UI.
    console.error("Admin console crashed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle size={22} />
          </span>
          <h1 className="mt-4 text-xl font-bold">The admin console hit an unexpected error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your session is still secure. Reload the page to continue; if the problem
            persists, check the browser console and server logs.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            <RotateCcw size={15} /> Reload console
          </Button>
        </div>
      </div>
    );
  }
}
