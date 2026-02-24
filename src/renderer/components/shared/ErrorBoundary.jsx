import { Component } from 'preact';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#121212',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            gap: '16px',
            padding: '32px',
            textAlign: 'center'
          }}
        >
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#b3b3b3', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              background: '#1db954',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
