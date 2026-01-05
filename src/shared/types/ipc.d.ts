export interface ElectronAPI {
    getVersion: () => Promise<string>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=ipc.d.ts.map