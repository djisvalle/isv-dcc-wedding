import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-wedding-cream">
          <p className="font-serif text-2xl text-wedding-dark">Something went wrong.</p>
          <p className="text-sm text-wedding-dark/60 max-w-sm">
            Please try reloading the page. If the problem continues, contact us directly.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 px-6 py-3 rounded-full bg-wedding-dark text-white text-sm font-sans tracking-wide"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
