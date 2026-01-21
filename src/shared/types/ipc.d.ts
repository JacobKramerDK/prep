export interface ElectronAPI {
    getVersion: () => Promise<string>;
    isGoogleCalendarConnected: () => Promise<boolean>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=ipc.d.ts.map