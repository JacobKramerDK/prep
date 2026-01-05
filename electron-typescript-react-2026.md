# Electron + TypeScript + React Setup Guide 2026

## Modern Project Structure

```
my-electron-app/
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   └── preload.ts
│   ├── renderer/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html
│   └── shared/
│       └── types.ts
├── dist/
├── build/
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.renderer.json
└── electron-builder.yml
```

## Package.json Configuration

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "main": "dist/main/main.js",
  "homepage": "./",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json && electron dist/main/main.js",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "dist": "npm run build && electron-builder",
    "dist:dir": "npm run build && electron-builder --dir",
    "pack": "electron-builder --publish=never",
    "postinstall": "electron-builder install-app-deps"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "concurrently": "^8.0.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

## TypeScript Configurations

### Root tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "references": [
    { "path": "./tsconfig.main.json" },
    { "path": "./tsconfig.renderer.json" }
  ]
}
```

### tsconfig.main.json (Main Process)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "outDir": "dist/main",
    "noEmit": false,
    "types": ["node"]
  },
  "include": ["src/main/**/*", "src/shared/**/*"],
  "exclude": ["src/renderer/**/*"]
}
```

### tsconfig.renderer.json (Renderer Process)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"],
  "exclude": ["src/main/**/*"]
}
```

## Vite Configuration (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 3000
  },
  base: './'
})
```

## Main Process (src/main/main.ts)

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion())
```

## Preload Script (src/main/preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Add more IPC methods here
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
```

## Shared Types (src/shared/types.ts)

```typescript
export interface ElectronAPI {
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

## React App (src/renderer/App.tsx)

```typescript
import { useState, useEffect } from 'react'

function App() {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setVersion)
  }, [])

  return (
    <div>
      <h1>Electron + React + TypeScript</h1>
      <p>App Version: {version}</p>
    </div>
  )
}

export default App
```

## Renderer Entry (src/renderer/index.tsx)

```typescript
import { createRoot } from 'react-dom/client'
import App from './App'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(<App />)
```

## HTML Template (src/renderer/index.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Electron App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

## Electron Builder Configuration (electron-builder.yml)

```yaml
appId: com.example.myapp
productName: My Electron App
directories:
  output: release
files:
  - dist/**/*
  - node_modules/**/*
  - package.json
mac:
  category: public.app-category.productivity
win:
  target: nsis
linux:
  target: AppImage
```

## Modern IPC Patterns

### 1. Type-Safe IPC with Zod Validation

```typescript
// src/shared/ipc-schema.ts
import { z } from 'zod'

export const GetUserDataSchema = z.object({
  userId: z.string()
})

export const UserDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
})

export type GetUserData = z.infer<typeof GetUserDataSchema>
export type UserData = z.infer<typeof UserDataSchema>
```

### 2. IPC Service Pattern

```typescript
// src/main/services/user-service.ts
import { ipcMain } from 'electron'
import { GetUserDataSchema, UserData } from '../../shared/ipc-schema'

export class UserService {
  static register() {
    ipcMain.handle('user:get', async (_, data: unknown): Promise<UserData> => {
      const parsed = GetUserDataSchema.parse(data)
      // Fetch user data
      return { id: parsed.userId, name: 'John', email: 'john@example.com' }
    })
  }
}
```

### 3. React Hook for IPC

```typescript
// src/renderer/hooks/useElectronAPI.ts
import { useState, useEffect } from 'react'

export function useElectronAPI<T>(
  channel: string,
  data?: unknown
): [T | null, boolean, Error | null] {
  const [result, setResult] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    window.electronAPI.invoke(channel, data)
      .then(setResult)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [channel, data])

  return [result, loading, error]
}
```

## Best Practices 2026

1. **Security**: Always use `contextIsolation: true` and `nodeIntegration: false`
2. **Build Tool**: Use Vite for renderer process (faster than Webpack)
3. **TypeScript**: Use project references for better build performance
4. **IPC**: Implement type-safe IPC with schema validation
5. **Development**: Use concurrently to run main and renderer processes
6. **Testing**: Use Playwright for E2E testing of Electron apps
7. **Updates**: Implement electron-updater for auto-updates
8. **Performance**: Use React.memo and useMemo for heavy components

## Development Workflow

1. `npm run dev` - Start development with hot reload
2. `npm run build` - Build for production
3. `npm run dist` - Create distributable packages
4. `npm run pack` - Create package without publishing

This setup provides a modern, type-safe, and performant Electron application with React and TypeScript.