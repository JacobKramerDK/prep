# Prep - Meeting Assistant

🚀 **Desktop meeting preparation assistant that connects to Obsidian vaults and calendars** - Built with Electron, React 19, and TypeScript.

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

**Current Version: v0.2.0**

#### macOS
- **Universal Binary**: [Prep-0.2.0-arm64.dmg](https://github.com/JacobKramerDK/prep/releases/latest) (139 MB)
- **Requirements**: macOS 10.12+ (Sierra or later)
- **Installation**: Download the .dmg file, open it, and drag Prep to your Applications folder

#### Windows
- **Installer**: [Prep Setup 0.2.0.exe](https://github.com/JacobKramerDK/prep/releases/latest) (219 MB)
- **Requirements**: Windows 10 or later (x64)
- **Installation**: Download and run the .exe installer, follow the setup wizard

### System Requirements
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free disk space
- **Network**: Internet connection required for AI features and calendar sync

## 🚀 Getting Started

### First-Time Setup

#### 1. Connect Your Obsidian Vault
1. Open Prep and go to **Settings**
2. Click **"Select Vault Folder"**
3. Choose your Obsidian vault directory
4. Wait for indexing to complete

#### 2. Set Up Calendar Integration

**Google Calendar:**
1. Get Google OAuth Credentials:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project and enable Google Calendar API
   - Create OAuth 2.0 credentials (Desktop application)
   - Add `http://localhost:8080/oauth/callback` as redirect URI
2. Go to **Settings > Calendar** in Prep
3. Add your **Client ID** and **Client Secret**
4. Click **"Connect Google Calendar"**

**Apple Calendar (macOS only):**
1. Go to **Settings > Calendar**
2. Click **"Connect Apple Calendar"**
3. Grant calendar access when prompted

#### 3. Configure AI Features
1. Go to **Settings > AI Integration**
2. Add your **OpenAI API Key**
3. Choose models and save locations

### Basic Usage

#### Generate Meeting Briefs
1. Go to **Home** tab
2. Select an upcoming meeting
3. Click **"Generate Brief"**
4. Review AI-generated context and talking points

#### Record and Transcribe Meetings
1. Go to **Transcription** tab
2. Choose recording type (microphone only or full meeting)
3. Click **"Start Recording"** → **"Stop Recording"**
4. Wait for AI transcription and automatic summary

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

### Configuration Options

**AI Model Selection:**
- **Transcription Models**: whisper-1 (recommended), whisper-1-large
- **Summary Models**: gpt-4o-mini (cost-effective), gpt-4o (higher quality)
- **Brief Generation**: gpt-4o (recommended for best context understanding)

**Storage Configuration:**
- **Vault Location**: Choose your Obsidian vault directory for indexing
- **Transcript Folder**: Configure where meeting transcripts are saved
- **Summary Folder**: Set separate location for AI-generated summaries
- **Brief Storage**: Save meeting briefs to vault or separate folder

**Context Retrieval Settings:**
- **Relevance Weights**: Customize how context is scored and ranked
- **Search Depth**: Configure how many vault files to search
- **Context Limits**: Set maximum context length for AI processing

**Calendar Sync Options:**
- **Sync Frequency**: Configure how often calendars are refreshed
- **Calendar Selection**: Choose which calendars to include
- **Event Filtering**: Set time ranges and event types to sync

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
- Check internet connection and re-authenticate in Settings

**Transcription Fails:**
- Verify OpenAI API key is valid
- Check audio file size (<25MB limit)

**Vault Not Loading:**
- Verify folder contains .md files
- Try re-selecting vault folder

### Getting Help

- **Bug Reports**: [GitHub Issues](https://github.com/JacobKramerDK/prep/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/JacobKramerDK/prep/discussions)

## 🔒 Privacy & Security

- **Local Processing**: Vault indexing happens locally
- **API Calls**: Only OpenAI for transcription/briefs
- **No Data Collection**: No analytics or tracking
- **Secure Storage**: API keys encrypted locally

---

## 🎯 Meeting Transcription

**Prep** includes real-time meeting transcription capabilities powered by OpenAI's Whisper API.

### How It Works

1. **Audio Capture**: Records meeting audio through your microphone or system audio (full meeting capture)
2. **Real-time Processing**: Captures audio in WebM format for optimal Whisper compatibility
3. **AI Transcription**: Uses OpenAI Whisper models to convert speech to text
4. **Automatic Summaries**: Generates AI-powered meeting summaries with configurable models
5. **Obsidian Integration**: Saves transcripts and summaries as markdown files with frontmatter metadata

### Setup Requirements

- **OpenAI API Key**: Required for Whisper transcription service
- **Transcript Folder**: Configure where transcripts are saved (ideally within your Obsidian vault)
- **Summary Folder**: Set separate location for AI-generated summaries (optional)
- **Browser Permissions**: Microphone access for audio recording

### Optional: Enhanced Audio Processing

For optimal transcription of long recordings (>10 minutes), install FFmpeg:

```bash
# macOS (recommended)
brew install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg
```

**Benefits of FFmpeg installation:**
- **Unlimited Recording Time**: Process recordings of any length
- **Better Audio Quality**: Time-based segmentation preserves audio integrity
- **Format Conversion**: Automatic MP3 conversion for smaller file sizes
- **Faster Processing**: Optimized audio handling for large files

**Without FFmpeg**: The app works perfectly for most recordings using fallback processing, but very long recordings (>30 minutes) may take longer to process.

### Usage

1. Navigate to the transcription section on the home page
2. Choose recording type: microphone only or full meeting audio
3. Click "Start Recording" to begin capture
4. Click "Stop Recording" to end and automatically transcribe
5. Review and save transcript and summary to your configured vault folders

---

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: React 19 with TypeScript, Tailwind CSS v4 for styling
- **Backend**: Node.js with TypeScript for main process logic
- **Desktop Framework**: Electron v35.7.5 for cross-platform desktop application
- **Data Storage**: electron-store for local settings and preferences persistence
- **Calendar Integration**: googleapis for Google Calendar, ical.js for parsing, applescript for macOS
- **AI Services**: OpenAI API v6.16.0 for meeting brief generation, Whisper API for audio transcription
- **Audio Processing**: fluent-ffmpeg, ffmpeg-static, node-record-lpcm16 for recording and chunking
- **Search & Indexing**: flexsearch for vault content indexing and retrieval
- **File Processing**: gray-matter for markdown frontmatter, react-markdown for rendering
- **Build System**: electron-builder for packaging and distribution, Vite for renderer bundling

### Core Components
- **Vault Manager**: Indexes and searches Obsidian markdown files
- **Calendar Manager**: Processes Google Calendar and Apple Calendar integration
- **Multi-Account Google Manager**: Handles multiple Google accounts with real-time notifications
- **Context Engine**: Matches meeting participants/topics with relevant vault content
- **AI Brief Generator**: Creates meeting preparation documents using OpenAI
- **Audio Processor**: Handles post-meeting transcription via Whisper API with chunking support
- **Swift Calendar Manager**: Native macOS calendar access via compiled Swift helper
- **Notification Service**: Real-time calendar event notifications
- **Settings Manager**: Persists user preferences and vault/calendar configurations

### Security Features
- **Context Isolation**: Enabled for all renderer processes
- **No Node Integration**: Renderer processes cannot access Node.js APIs directly
- **Secure IPC**: All communication through validated preload scripts
- **Encrypted Storage**: API keys and sensitive data encrypted using electron-store
- **CSP Headers**: Content Security Policy for additional protection

### Project Structure
```
prep/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Main entry point
│   │   ├── preload.ts       # Secure IPC preload script
│   │   └── services/        # 20 specialized services
│   ├── renderer/            # React frontend
│   │   ├── components/      # 26 React components
│   │   ├── hooks/          # 7 custom React hooks
│   │   └── index.tsx       # React entry point
│   └── shared/             # Shared types and utilities
│       ├── types/          # 24 TypeScript interfaces
│       └── utils/          # Shared utilities
├── native/                 # Swift calendar helper
├── tests/                  # E2E and helper tests
├── dist/                   # Compiled output
└── out/                    # Packaged applications
```

---

## 👨💻 Development

### Prerequisites

- **Node.js**: v18+
- **npm**: Latest version

### Quick Start

```bash
git clone https://github.com/JacobKramerDK/prep.git
cd prep
npm install
npm run dev
```

### Available Scripts

```bash
npm run dev              # Start development mode
npm run build            # Build for production
npm run package          # Package for distribution
npm run test:e2e:stable  # Run E2E tests
```

### Technology Stack
- **Frontend**: React 19 with TypeScript
- **Backend**: Node.js with TypeScript (Electron main process)
- **Desktop Framework**: Electron with security best practices
- **Build System**: Vite for renderer, TypeScript compiler for main process

## License

MIT License - see LICENSE file for details.

---

## Hackathon Context

This project was built for the **Dynamous Kiro Hackathon** (January 5-30, 2026) using Kiro CLI for AI-assisted development.

### Development Timeline
- **Phase 1**: Electron application scaffolding ✅
- **Phase 2**: Obsidian vault integration ✅
- **Phase 3**: Calendar integration functionality ✅  
- **Phase 4**: AI meeting brief generation ✅
- **Phase 5**: Audio transcription features ✅

**Ready to build something amazing?** The foundation is set and core features are implemented! 🚀
