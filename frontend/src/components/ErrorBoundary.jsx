import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-sand px-6 py-10 text-ink">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-ink/10 bg-white/95 p-6 shadow-glow">
          <p className="text-xs uppercase tracking-[0.25em] text-ink/50">Something went wrong</p>
          <h1 className="mt-3 font-display text-3xl">We hit an unexpected error.</h1>
          <p className="mt-3 text-sm text-ink/60">
            Try reloading the page. If the problem continues, check the console logs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              type="button"
              className="rounded-xl border border-ink/20 px-4 py-2 text-sm"
              onClick={this.handleReset}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
