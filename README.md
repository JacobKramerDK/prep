# Prep - Meeting Assistant

🚀 **Desktop meeting preparation assistant that connects to Obsidian vaults and calendars** - Built with Electron, React 19, and TypeScript for the Dynamous Kiro Hackathon.

## About This Project

**Prep** transforms how knowledge workers approach meetings by automatically surfacing relevant context from Obsidian vaults and generating AI-powered meeting briefs. No more scrambling before meetings - walk in prepared with full context.

### Key Features
- **Obsidian Vault Integration**: Direct connection to existing markdown note systems
- **Calendar Parsing**: Automatic meeting detection and context association  
- **AI-Powered Meeting Briefs**: Comprehensive preparation summaries using OpenAI
- **Audio Transcription**: Post-meeting summary generation using Whisper
- **Cross-Platform**: Native desktop experience on macOS and Windows

## Prerequisites

- **Node.js**: v18+ (for Electron compatibility)
- **npm**: Latest version
- **Operating System**: macOS or Windows

## Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd prep
npm install
```

### 2. Development Mode
```bash
# Start both renderer and main processes
npm run dev

# Or start individually:
npm run dev:renderer  # Vite dev server on http://localhost:5173
npm run dev:main      # Electron main process
```

### 3. Build for Production
```bash
# Build all processes
npm run build

# Package for distribution
npm run package
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 19 with TypeScript
- **Backend**: Node.js with TypeScript (Electron main process)
- **Desktop Framework**: Electron with security best practices
- **Build System**: Vite for renderer, TypeScript compiler for main process
- **Testing**: Playwright for e2e testing

### Project Structure
```
prep/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Main entry point
│   │   └── preload.ts       # Secure IPC preload script
│   ├── renderer/            # React frontend
│   │   ├── index.tsx        # React entry point
│   │   ├── App.tsx          # Main React component
│   │   └── index.html       # HTML template
│   └── shared/              # Shared types and utilities
│       └── types/           # TypeScript type definitions
├── dist/                    # Compiled output
├── out/                     # Packaged applications
└── e2e-tests/              # End-to-end tests
```

### Security Features
- **Context Isolation**: Enabled for all renderer processes
- **No Node Integration**: Renderer processes cannot access Node.js APIs directly
- **Secure IPC**: All communication through validated preload scripts
- **CSP Headers**: Content Security Policy for additional protection

## Development Workflow

### Available Scripts
```bash
npm run dev              # Start development mode (both processes)
npm run dev:renderer     # Start Vite dev server only
npm run dev:main         # Build and run main process only
npm run build            # Build both processes for production
npm run build:renderer   # Build renderer process only
npm run build:main       # Build main process only
npm run package          # Package application for distribution
npm run test:e2e         # Run Playwright e2e tests
```

### TypeScript Configuration
The project uses TypeScript project references for optimal build performance:
- **Root config**: Coordinates main and renderer builds
- **Main process**: CommonJS modules for Node.js compatibility
- **Renderer process**: ESNext modules for modern browser features

### Hot Reload
- **Renderer**: Automatic hot reload via Vite
- **Main process**: Manual restart required after changes

## Testing

### End-to-End Testing
```bash
# Run all e2e tests
npm run test:e2e

# Install Playwright browsers (first time only)
npx playwright install
```

The test suite validates:
- Application startup and window creation
- Basic IPC communication
- Build output structure
- Package configuration

## Building and Distribution

### Development Build
```bash
npm run build
```

### Package for Distribution
```bash
npm run package
```

Creates platform-specific installers in the `out/` directory:
- **macOS**: `.dmg` installer (supports both Intel and Apple Silicon)
- **Windows**: `.exe` NSIS installer
- **Linux**: `.AppImage` portable application

### Cross-Platform Builds
The electron-builder configuration supports:
- **macOS**: Universal binaries (x64 + arm64)
- **Windows**: x64 architecture
- **Linux**: x64 AppImage format

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear build cache and reinstall
rm -rf node_modules dist out
npm install
npm run build
```

**Electron Won't Start**
```bash
# Ensure main process is built
npm run build:main
# Check for TypeScript errors
npx tsc -p tsconfig.main.json --noEmit
```

**Vite Dev Server Issues**
```bash
# Restart Vite dev server
npm run dev:renderer
# Check port 5173 is available
```

**IPC Communication Errors**
- Verify preload script is loaded correctly
- Check contextBridge API exposure
- Ensure main process IPC handlers are registered

### Performance Optimization
- Use `npm run build` for production builds (includes optimizations)
- Enable source maps for debugging: already configured
- Monitor memory usage in development tools

## Contributing

### Code Standards
- **TypeScript**: Strict mode enabled, explicit return types
- **React**: Functional components with hooks, proper prop typing
- **File Naming**: kebab-case for files, PascalCase for React components
- **Security**: Follow Electron security best practices

### Development Setup
1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start development mode: `npm run dev`
4. Make changes and test thoroughly
5. Run e2e tests: `npm run test:e2e`
6. Submit pull request with clear description

## License

MIT License - see LICENSE file for details.

---

## Hackathon Context

This project was built for the **Dynamous Kiro Hackathon** (January 5-23, 2026) using Kiro CLI for AI-assisted development. The scaffolding demonstrates modern Electron application architecture with security best practices, TypeScript project references, and comprehensive testing infrastructure.

### Development Timeline
- **Phase 1**: Electron application scaffolding ✅
- **Phase 2**: Obsidian vault integration (planned)
- **Phase 3**: Calendar parsing functionality (planned)  
- **Phase 4**: AI meeting brief generation (planned)
- **Phase 5**: Audio transcription features (planned)

**Ready to build something amazing?** The foundation is set - time to implement the core meeting preparation features! 🚀
