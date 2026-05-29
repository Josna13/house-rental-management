import React from 'react';

/**
 * Global Error Boundary — catches any uncaught render error in the subtree
 * and shows a friendly message instead of a blank white screen.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, errorMessage: error?.message || 'Unknown error' };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Uncaught error:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
        // Navigate back home
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10 max-w-md w-full">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-red-500 text-3xl">⚠</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            An unexpected error occurred. Your data is safe — please go back to the homepage.
                        </p>
                        {this.state.errorMessage && (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2 mb-6 font-mono break-all">
                                {this.state.errorMessage}
                            </p>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
                        >
                            Go Back Home
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
