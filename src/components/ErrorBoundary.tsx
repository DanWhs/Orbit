import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getCachedDictionary, getInitialLocaleOption } from '../i18n/translations';
import { ErrorScreen } from './ErrorScreen';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Render-time failures switch cleanly to the Orbit ErrorScreen
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', '/');
      } catch {
        // Ignore history restrictions
      }
      window.location.assign('/');
    }
  };

  render() {
    if (this.state.hasError) {
      const locale = getInitialLocaleOption();
      const dict = getCachedDictionary(locale.lang, locale.jurisdiction);
      return <ErrorScreen variant="runtime" dict={dict} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
