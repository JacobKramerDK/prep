# Project Structure

## Directory Layout
```
prep/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Main entry point
│   │   ├── preload.ts       # Secure IPC preload script
│   │   └── services/        # 20 specialized services
│   │       ├── vault-manager.ts # Obsidian vault operations
│   │       ├── calendar-manager.ts # Calendar integration
│   │       ├── multi-account-google-manager.ts # Multi-account Google
│   │       ├── openai-service.ts # AI integration
│   │       ├── transcription-service.ts # Audio transcription
│   │       ├── swift-calendar-manager.ts # macOS native calendar
│   │       ├── notification-service.ts # Real-time notifications
│   │       ├── calendar-sync-scheduler.ts # Automated sync
│   │       └── ... # 12 additional services
│   ├── renderer/            # React frontend
│   │   ├── components/      # 26 React components
│   │   ├── hooks/          # 7 custom React hooks
│   │   ├── utils/          # Frontend utilities
│   │   └── index.tsx       # React entry point
│   └── shared/             # Shared types and utilities
│       ├── types/          # 24 TypeScript interfaces
│       └── utils/          # Shared utilities
├── native/                 # Swift calendar helper
│   ├── CalendarHelper.swift # macOS calendar integration
│   ├── build.sh           # Build script
│   └── precompiled/       # Pre-built binaries
├── tests/
│   ├── e2e-stable/        # Stable, isolated E2E tests (recommended)
│   ├── helpers/           # Test utilities and factories
│   └── config/           # Test environment configuration
├── resources/             # Native binaries and assets
├── build/                 # Build configuration
├── dist/                  # Compiled output
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
- **Native**: Swift calendar helper for macOS system integration

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

## Testing Infrastructure
- **Stable E2E Tests**: `tests/e2e-stable/` - Reliable, isolated tests using `npm run test:e2e:stable`
- **Helper Utilities**: `tests/helpers/` - Test utilities and factories using `npm run test:helpers`
- **Test Isolation**: Each test gets fresh Electron app instance to prevent state pollution
- **Mocked Dependencies**: External APIs (OpenAI, Calendar) are mocked to eliminate network dependencies
- **Data Test IDs**: UI components use `data-testid` attributes for reliable test selectors
