# Technical Architecture

## Technology Stack
- **Frontend**: React 19 with TypeScript, Tailwind CSS v4 for styling
- **Backend**: Node.js with TypeScript for main process logic
- **Desktop Framework**: Electron v35.7.5 for cross-platform desktop application
- **Data Storage**: electron-store for local settings and preferences persistence
- **Calendar Integration**: googleapis for Google Calendar, ical.js for parsing, applescript for macOS
- **AI Services**: OpenAI API v6.16.0 for meeting brief generation, Whisper API for audio transcription
- **Audio Processing**: fluent-ffmpeg, ffmpeg-static, node-record-lpcm16 for recording and chunking
- **Search & Indexing**: flexsearch for vault content indexing and retrieval
- **File Processing**: gray-matter for markdown frontmatter, react-markdown for rendering
- **Scheduling**: node-schedule for calendar sync automation, chokidar for file watching
- **Native Integration**: Swift calendar helper for macOS system calendar access
- **Build System**: electron-builder for packaging and distribution, Vite for renderer bundling
- **Development Tools**: TypeScript v5.6.0, Playwright for E2E testing, Jest for unit tests

## Architecture Overview
**Electron Multi-Process Architecture**:
- **Main Process**: Handles file system operations (Obsidian vault reading, calendar parsing), API calls to OpenAI/Whisper, and application lifecycle
- **Renderer Process**: React application providing the user interface with Tailwind CSS styling
- **IPC Communication**: Secure communication between main and renderer processes for data exchange

**Core Components**:
- **Vault Manager**: Indexes and searches Obsidian markdown files
- **Calendar Manager**: Processes Google Calendar and Apple Calendar integration
- **Multi-Account Google Manager**: Handles multiple Google accounts with real-time notifications
- **Context Engine**: Matches meeting participants/topics with relevant vault content
- **AI Brief Generator**: Creates meeting preparation documents using OpenAI
- **Audio Processor**: Handles post-meeting transcription via Whisper API with chunking support
- **Swift Calendar Manager**: Native macOS calendar access via compiled Swift helper
- **Notification Service**: Real-time calendar event notifications
- **Calendar Sync Scheduler**: Automated daily calendar synchronization
- **Settings Manager**: Persists user preferences and vault/calendar configurations

## Development Environment
- **Node.js**: v18+ for modern JavaScript features and Electron compatibility
- **Package Manager**: npm or yarn for dependency management
- **TypeScript**: v5+ for type safety across main and renderer processes
- **Electron**: Latest stable version for desktop framework
- **React**: v18+ with hooks and modern patterns using Tailwind v4 for styling
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
- **Stable E2E Testing**: Playwright tests in `tests/e2e-stable/` with proper test isolation and mocked dependencies (49 tests, 100% pass rate)
- **Helper Utilities Testing**: Jest tests for test utilities and factories in `tests/helpers/` (18 tests)
- **Test Isolation**: Each test gets fresh Electron app instance to prevent state pollution
- **Mocked Dependencies**: External APIs (OpenAI, Calendar) mocked to eliminate network dependencies
- **Reliable Selectors**: UI components use `data-testid` attributes for stable test selection

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
