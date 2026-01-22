# Technical Architecture

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS for styling
- **Backend**: Node.js with TypeScript for main process logic
- **Desktop Framework**: Electron for cross-platform desktop application
- **Data Storage**: electron-store for local settings and preferences persistence
- **Calendar Integration**: node-ical for parsing ICS calendar files
- **AI Services**: OpenAI API for meeting brief generation, Whisper API for audio transcription
- **Build System**: electron-builder for packaging and distribution
- **Development Tools**: TypeScript, ESLint, Prettier for code quality

## Architecture Overview
**Electron Multi-Process Architecture**:
- **Main Process**: Handles file system operations (Obsidian vault reading, calendar parsing), API calls to OpenAI/Whisper, and application lifecycle
- **Renderer Process**: React application providing the user interface with Tailwind CSS styling
- **IPC Communication**: Secure communication between main and renderer processes for data exchange

**Core Components**:
- **Vault Manager**: Indexes and searches Obsidian markdown files
- **Calendar Parser**: Processes ICS files to extract meeting information
- **Context Engine**: Matches meeting participants/topics with relevant vault content
- **AI Brief Generator**: Creates meeting preparation documents using OpenAI
- **Audio Processor**: Handles post-meeting transcription via Whisper API
- **Settings Manager**: Persists user preferences and vault/calendar configurations

## Development Environment
- **Node.js**: v18+ for modern JavaScript features and Electron compatibility
- **Package Manager**: npm or yarn for dependency management
- **TypeScript**: v5+ for type safety across main and renderer processes
- **Electron**: Latest stable version for desktop framework
- **React**: v18+ with hooks and modern patterns
- **Development Server**: Hot reload for renderer process, nodemon for main process
- **IDE Setup**: VS Code with TypeScript, React, and Electron extensions

## Code Standards
- **TypeScript**: Strict mode enabled, explicit return types for functions
- **React**: Functional components with hooks, proper prop typing
- **File Naming**: kebab-case for files, PascalCase for React components
- **Import Organization**: External libraries first, then internal modules
- **Error Handling**: Proper try-catch blocks, user-friendly error messages
- **Documentation**: JSDoc comments for complex functions and APIs

## Testing Strategy
- **Stable E2E Testing**: Playwright tests in `tests/e2e-stable/` with proper test isolation and mocked dependencies
- **Helper Utilities Testing**: Jest tests for test utilities and factories in `tests/helpers/`
- **Test Isolation**: Each test gets fresh Electron app instance to prevent state pollution
- **Mocked Dependencies**: External APIs (OpenAI, Calendar) mocked to eliminate network dependencies
- **Reliable Selectors**: UI components use `data-testid` attributes for stable test selection
- **Legacy Tests**: Older tests in `tests/unit/` and `tests/e2e/` have known flaky behavior and should be avoided

## Deployment Process
- **Build Pipeline**: TypeScript compilation, React bundling, Electron packaging
- **Cross-Platform Builds**: electron-builder for macOS (.dmg) and Windows (.exe) installers
- **Code Signing**: Platform-specific signing for security and distribution
- **Auto-Updates**: electron-updater for seamless application updates
- **Release Management**: GitHub releases with automated build artifacts
- **Distribution**: Direct download and potential Mac App Store/Microsoft Store

## Performance Requirements
- **Vault Indexing**: Handle 1000+ markdown files with initial indexing under 10 seconds
- **Search Performance**: Sub-3-second context retrieval from large vaults
- **Memory Usage**: Efficient file caching, avoid loading entire vault into memory
- **Startup Time**: Application launch under 5 seconds on modern hardware
- **Offline Performance**: Full vault browsing and calendar viewing without internet
- **Cross-Platform**: Consistent performance on macOS and Windows systems

## Security Considerations
- **API Key Management**: Secure storage of OpenAI API keys using electron-store encryption
- **File System Access**: Sandboxed access to user-selected Obsidian vaults only
- **Network Security**: HTTPS-only API communications, certificate validation
- **Data Privacy**: No user data sent to external services except OpenAI for processing
- **Local Storage**: Encrypted storage of sensitive settings and preferences
- **Update Security**: Signed updates and secure update channels
