export type Logger = {
    (...args: unknown[]): void;
    enabled: boolean;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
};
export declare function createLogger(namespace: string): Logger;
