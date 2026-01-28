# Prep - Meeting Assistant

🚀 **Desktop meeting preparation assistant that connects to Obsidian vaults and calendars** - Built with Electron, React 19, and TypeScript for the Dynamous Kiro Hackathon.

## About This Project

**Prep** transforms how knowledge workers approach meetings by automatically surfacing relevant context from Obsidian vaults and generating AI-powered meeting briefs. No more scrambling before meetings - walk in prepared with full context.

### Key Features
- **Obsidian Vault Integration**: Direct connection to existing markdown note systems
- **Calendar Integration**: Google Calendar (multi-account) and Apple Calendar support
- **AI-Powered Meeting Briefs**: Comprehensive preparation summaries using OpenAI
- **Meeting Transcription**: Real-time audio recording and AI-powered transcription using Whisper
- **Voice Dictation**: Real-time voice input for meeting brief generation
- **Cross-Platform**: Native desktop experience on macOS and Windows

## 📦 Installation

### Download Latest Release

**Current Version: v0.1.0**

#### macOS
- **Universal Binary**: [Prep-0.1.0-arm64.dmg](https://github.com/JacobKramerDK/prep/releases/latest) (139 MB)
- **Requirements**: macOS 10.12+ (Sierra or later)

#### Windows
- **Installer**: [Prep Setup 0.1.0.exe](https://github.com/JacobKramerDK/prep/releases/latest) (219 MB)
- **Requirements**: Windows 10 or later (x64)

### Installation Steps

1. **Download** the appropriate installer for your platform
2. **Install** by running the downloaded file
3. **Launch** Prep from Applications (macOS) or Start Menu (Windows)

## 🚀 Getting Started

### First-Time Setup

#### 1. Connect Your Obsidian Vault
1. Open Prep and go to **Settings**
2. Click **"Select Vault Folder"**
3. Choose your Obsidian vault directory
4. Wait for indexing to complete (shows progress)

#### 2. Set Up Calendar Integration

**Google Calendar:**
1. **Get Google OAuth Credentials** (Required):
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials (Desktop application)
   - Add `http://localhost:8080/oauth/callback` as redirect URI
2. Go to **Settings > Calendar** in Prep
3. Add your **Client ID** and **Client Secret**
4. Click **"Connect Google Calendar"**
5. Sign in and grant permissions
6. Select which calendars to sync

**Apple Calendar (macOS only):**
1. Go to **Settings > Calendar**
2. Click **"Connect Apple Calendar"**
3. Grant calendar access when prompted
4. Select calendars to include

#### 3. Configure AI Features
1. Go to **Settings > AI Integration**
2. Add your **OpenAI API Key**
3. Choose transcription model (whisper-1 recommended)
4. Set transcript save location (ideally in your vault)

### Basic Usage

#### Generate Meeting Briefs
1. Go to **Home** tab
2. Select an upcoming meeting
3. Click **"Generate Brief"**
4. Review AI-generated context and talking points
5. Save to your vault or copy to clipboard

#### Record and Transcribe Meetings
1. Go to **Transcription** tab
2. Choose recording type:
   - **Microphone Only**: Your voice only
   - **Full Meeting**: Capture all audio (requires permissions)
3. Click **"Start Recording"**
4. Click **"Stop Recording"** when done
5. Wait for AI transcription
6. Save transcript to your vault

#### Voice Dictation
1. In any text field, click the **microphone icon**
2. Speak your input
3. Click **stop** when finished
4. Review and edit the transcribed text

## ⚙️ Configuration

### System Requirements

**macOS:**
- macOS 10.12+ (Sierra or later)
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space

**Windows:**
- Windows 10 or later
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space

### Required API Keys

**OpenAI API Key** (Required for AI features):
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create new secret key
3. Add to Prep Settings > AI Integration
4. Estimated cost: $0.10-$1.00 per hour of transcription

**Google OAuth Credentials** (Required for Google Calendar):
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project and enable Google Calendar API
3. Create OAuth 2.0 credentials (Desktop application)
4. Add `http://localhost:8080/oauth/callback` as redirect URI
5. Add Client ID and Secret to Prep Settings > Calendar

### Optional Enhancements

**FFmpeg** (For long audio recordings):
```bash
# macOS
brew install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg
```

**Custom Google OAuth** (Alternative credentials):
1. Create `.env` file next to Prep executable
2. Add your credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

## 🔧 Troubleshooting

### Common Issues

**Calendar Not Syncing:**
- Check internet connection
- Re-authenticate in Settings > Calendar
- Ensure calendar permissions are granted

**Transcription Fails:**
- Verify OpenAI API key is valid
- Check audio file size (<25MB limit)
- Ensure microphone permissions granted

**Vault Not Loading:**
- Verify folder contains .md files
- Check folder permissions
- Try re-selecting vault folder

**App Won't Start:**
- Restart your computer
- Check antivirus isn't blocking the app
- Run as administrator (Windows)

### Getting Help

- **Bug Reports**: [GitHub Issues](https://github.com/JacobKramerDK/prep/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/JacobKramerDK/prep/discussions)

## 🔒 Privacy & Security

- **Local Processing**: Vault indexing happens locally
- **API Calls**: Only OpenAI for transcription/briefs
- **No Data Collection**: No analytics or tracking
- **Secure Storage**: API keys encrypted locally

---

## 👨‍💻 Development

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

## Meeting Transcription

**Prep** includes real-time meeting transcription capabilities powered by OpenAI's Whisper API.

### How It Works

1. **Audio Capture**: Records meeting audio through your microphone or system audio (full meeting capture)
2. **Real-time Processing**: Captures audio in WebM format for optimal Whisper compatibility
3. **AI Transcription**: Uses OpenAI Whisper models to convert speech to text
4. **Obsidian Integration**: Saves transcripts as markdown files with frontmatter metadata

### Setup Requirements

- **OpenAI API Key**: Required for Whisper transcription service
- **Transcript Folder**: Configure where transcripts are saved (ideally within your Obsidian vault)
- **Browser Permissions**: Microphone access for audio recording

### Optional: Enhanced Audio Processing

For optimal transcription of long recordings (>10 minutes), install FFmpeg:

```bash
# macOS (recommended)
brew install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg
```

**Benefits of FFmpeg installation:**
- **Unlimited Recording Time**: Process recordings of any length
- **Better Audio Quality**: Time-based segmentation preserves audio integrity
- **Format Conversion**: Automatic MP3 conversion for smaller file sizes
- **Faster Processing**: Optimized audio handling for large files

**Without FFmpeg**: The app works perfectly for most recordings using fallback processing, but very long recordings (>30 minutes) may take longer to process.

### Current Limitations

- **Audio Quality**: Transcription accuracy depends on audio clarity and speaker proximity
- **File Size**: Maximum 25MB audio file limit (OpenAI Whisper constraint)
- **Language Support**: Primarily optimized for English, though Whisper supports multiple languages
- **Real-time Processing**: Transcription occurs after recording stops, not during the meeting
- **System Audio**: Full meeting capture requires browser display media permissions (may not work in all environments)
- **Network Dependency**: Requires internet connection for OpenAI API calls

### Usage

1. Navigate to the transcription section on the home page
2. Choose recording type: microphone only or full meeting audio
3. Click "Start Recording" to begin capture
4. Click "Stop Recording" to end and automatically transcribe
5. Review and save transcript to your configured Obsidian folder

The transcription feature integrates seamlessly with your existing note-taking workflow, creating searchable meeting records alongside your preparation briefs.

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
npm run test:e2e:stable  # Run stable E2E tests (recommended)
npm run test:helpers     # Run helper utility tests
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

### Testing

#### Stable E2E Testing
```bash
# Run all stable e2e tests (49 tests, 100% pass rate)
npm run test:e2e:stable

# Install Playwright browsers (first time only)
npx playwright install
```

The stable test suite validates:
- Application startup and window creation
- Basic IPC communication  
- Settings management without data persistence
- UI component rendering and interaction
- MCP integration functionality
- Brief generation form handling

#### Helper Utilities Testing
```bash
# Run helper utility tests (18 tests)
npm run test:helpers
```

Tests the test infrastructure itself:
- Test data factories
- Mock managers
- Security validation helpers

**Note:** All legacy and flaky tests have been removed. The project now maintains a clean, reliable test suite with 100% pass rate.

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
- **Phase 2**: Obsidian vault integration ✅
- **Phase 3**: Calendar integration functionality ✅  
- **Phase 4**: AI meeting brief generation ✅
- **Phase 5**: Audio transcription features ✅

**Ready to build something amazing?** The foundation is set and core features are implemented! 🚀
