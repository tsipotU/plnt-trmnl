/** @legacy Pre-catalog scaffolding; new components should compose catalog primitives. */
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => window.location.reload();

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪴</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            The app hit an unexpected error. Reloading often helps.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              padding: '12px 24px', borderRadius: 12, fontSize: 16, fontWeight: 600,
            }}
          >
            Reload
          </button>
          {this.state.error && (
            <details style={{ marginTop: 24, fontSize: 12, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
                Technical details
              </summary>
              <pre style={{ overflow: 'auto', padding: 8 }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
