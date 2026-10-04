import { Component, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button, Icon } from '@/components/ui';

/** Last line of defence: an unexpected render error shows a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // Deliberately no logging of component trees or data: they can contain tenant details.
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg px-8 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft"><Icon icon={TriangleAlert} size={32} tone="danger" /></div>
        <h1 className="text-heading">Something went wrong</h1>
        <p className="mb-6 mt-1.5 text-ink-soft">Please try again. Your data is safe.</p>
        <Button full={false} className="px-8" onClick={() => this.setState({ failed: false })}>Try again</Button>
      </div>
    );
  }
}
