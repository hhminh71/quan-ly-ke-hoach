import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    if (confirm('Khôi phục dữ liệu gốc để khắc phục lỗi xung đột dữ liệu?')) {
      localStorage.removeItem('app_transactions_v2');
      localStorage.removeItem('app_budgets_v2');
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-lg w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Đã xảy ra sự cố hiển thị giao diện
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {this.state.error ? this.state.error.message : 'Lỗi không xác định khi tải dữ liệu'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-left font-mono text-[11px] text-slate-600 max-h-36 overflow-y-auto border border-slate-200">
              {this.state.error?.stack || String(this.state.error)}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetStorage}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                <span>Khôi phục dữ liệu gốc</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
