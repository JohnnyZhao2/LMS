import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[200px] bg-red-50 border-red-100">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                        Something went wrong
                    </h3>
                    <p className="text-sm text-red-600 mb-6 max-w-[250px]">
                        {this.state.error?.message || "An unexpected error occurred while rendering this component."}
                    </p>
                    <Button
                        onClick={this.handleReset}
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-900"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </Card>
            );
        }

        return this.props.children;
    }
}
