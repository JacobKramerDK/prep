# Project Structure

## Directory Layout
```
prep/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Main entry point
│   │   ├── vault-manager.ts # Obsidian vault operations
│   │   ├── calendar-parser.ts # ICS file processing
│   │   ├── ai-service.ts    # OpenAI/Whisper integration
│   │   └── ipc-handlers.ts  # IPC communication handlers
│   ├── renderer/            # React frontend
│   │   ├── components/      # React components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Frontend utilities
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.tsx       # React entry point
│   └── shared/             # Shared types and utilities
│       ├── types/          # Common TypeScript interfaces
│       └── constants/      # Shared constants
├── tests/
│   ├── e2e-stable/        # Stable, isolated E2E tests (recommended)
│   ├── helpers/           # Test utilities and factories
│   ├── config/           # Test environment configuration
│   ├── unit/             # Legacy unit tests (flaky, avoid)
│   ├── integration/      # Legacy integration tests
│   └── e2e/             # Legacy E2E tests (flaky, avoid)
├── build/                 # Build configuration
├── dist/                  # Compiled output
├── assets/               # Static assets (icons, images)
├── docs/                 # Documentation
└── .kiro/               # Kiro CLI configuration
```

## File Naming Conventions
- **TypeScript files**: kebab-case (e.g., `vault-manager.ts`, `ai-service.ts`)
- **React components**: PascalCase files and exports (e.g., `MeetingBrief.tsx`)
- **Test files**: `*.test.ts` or `*.spec.ts` suffix
- **Type definitions**: `*.types.ts` suffix for shared types
- **Configuration files**: Standard names (e.g., `package.json`, `tsconfig.json`)

## Module Organization
- **Main Process**: Business logic, file system operations, API integrations
- **Renderer Process**: UI components, user interactions, state management
- **Shared**: Common types, utilities, and constants used by both processes
- **IPC Layer**: Secure communication bridge between main and renderer
- **Services**: Modular services for vault management, AI integration, calendar parsing

## Configuration Files
- **package.json**: Dependencies and build scripts
- **tsconfig.json**: TypeScript compiler configuration
- **electron-builder.json**: Packaging and distribution settings
- **.eslintrc.js**: Code linting rules
- **tailwind.config.js**: Tailwind CSS configuration
- **jest.config.js**: Testing framework configuration

## Documentation Structure
- **README.md**: Project overview and setup instructions
- **DEVLOG.md**: Development timeline and decisions (hackathon requirement)
- **docs/api.md**: API documentation for IPC communication
- **docs/architecture.md**: Detailed architecture documentation
- **docs/deployment.md**: Build and deployment instructions

## Asset Organization
- **assets/icons/**: Application icons for different platforms
- **assets/images/**: UI images and graphics
- **src/renderer/styles/**: Tailwind CSS and custom styles
- **build/**: Platform-specific build resources

## Build Artifacts
- **dist/**: Compiled TypeScript and bundled React code
- **out/**: Final packaged applications (.dmg, .exe)
- **coverage/**: Test coverage reports
- **.cache/**: Build system cache files

## Environment-Specific Files
- **.env.development**: Development environment variables
- **.env.production**: Production build configuration
- **src/shared/config.ts**: Environment-aware configuration
- **build/**: Platform-specific build configurations
