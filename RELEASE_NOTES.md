# Prep v0.2.0 - Enhanced Summarization & Performance 🚀

**Desktop meeting preparation assistant with enhanced AI summarization and improved performance**

## 🎯 What's New in v0.2.0

### Enhanced AI Summarization
- **Configurable Summary Models**: Choose different AI models for summarization vs transcription
- **Separate Summary Storage**: Configure dedicated folders for meeting summaries, separate from transcripts  
- **Automatic Summary Generation**: Summaries are automatically created and saved after transcription
- **Markdown Formatting**: Summaries saved with proper frontmatter metadata for Obsidian integration

### Improved User Experience
- **Better Recording Access**: MeetingTranscription component moved above meetings for easier discovery
- **Performance Boost**: Fixed calendar sync issue that caused 40+ second startup delays
- **Enhanced Settings**: New AI Configuration options for summary model and folder selection

### Technical Improvements
- **Calendar Sync Optimization**: Non-blocking calendar operations for faster app startup
- **Comprehensive Test Coverage**: Added regression tests for new features
- **Better Error Handling**: Improved error messages and graceful fallbacks

## 📦 Downloads

### macOS
- **Universal Binary (Intel + Apple Silicon)**: `Prep-0.2.0-arm64.dmg` (139 MB)
- **Zip Archive**: `Prep-0.2.0-arm64-mac.zip` (134 MB)

### Windows
- **Installer**: `Prep Setup 0.2.0.exe` (219 MB)

---

# Prep v0.1.0 - First Release 🚀

**Desktop meeting preparation assistant that connects to Obsidian vaults and calendars**

## 🎯 What's New

### Core Features
- **Obsidian Vault Integration**: Connect to your existing markdown notes with full-text search
- **Calendar Integration**: Support for Google Calendar (multi-account) and Apple Calendar (macOS)
- **AI Meeting Briefs**: Generate context-aware meeting preparation using OpenAI
- **Audio Transcription**: Record and transcribe meetings using Whisper API
- **Voice Dictation**: Real-time voice input for meeting brief generation

### Platform Support
- **macOS**: Native calendar integration with Swift helper
- **Windows**: Full functionality with NSIS installer
- **Cross-Platform**: Consistent experience across operating systems

### Advanced Features
- Multi-account Google Calendar support with real-time notifications
- Intelligent context retrieval from vault content
- Customizable meeting brief templates
- Audio chunking for long recordings (with FFmpeg)
- Secure OAuth credential management

## 📦 Downloads

### macOS
- **Universal Binary (Intel + Apple Silicon)**: `Prep-0.1.0-arm64.dmg` (139 MB)
- **Zip Archive**: `Prep-0.1.0-arm64-mac.zip` (134 MB)

### Windows
- **Installer**: `Prep Setup 0.1.0.exe` (219 MB)

## 🔧 System Requirements

### macOS
- macOS 10.12+ (Sierra or later)
- Xcode Command Line Tools (for calendar integration)

### Windows
- Windows 10 or later
- x64 or ARM64 architecture

### Optional Dependencies
- **FFmpeg**: For enhanced audio processing of long recordings
- **OpenAI API Key**: Required for AI meeting briefs and transcription
- **Google OAuth Credentials**: Optional custom credentials (built-in provided)

## 🚀 Quick Start

1. Download the appropriate installer for your platform
2. Install and launch Prep
3. Connect your Obsidian vault in Settings
4. Set up calendar integration (Google/Apple)
5. Add your OpenAI API key for AI features
6. Start preparing for meetings!

## 🧪 Testing

This release includes comprehensive testing:
- **49 stable E2E tests** with 100% pass rate
- **18 helper utility tests** for infrastructure validation
- Isolated test environments with mocked dependencies
- Cross-platform compatibility validation

## 🔒 Security

- Context isolation enabled for all renderer processes
- Secure IPC communication between processes
- No hardcoded API credentials (user-provided)
- Optional custom Google OAuth credentials via .env file

## 📝 Known Limitations

- Audio transcription limited to 25MB files (OpenAI constraint)
- Requires internet connection for AI features
- Calendar sync may take a few seconds on first launch

## 🐛 Bug Reports

Found an issue? Please report it on [GitHub Issues](https://github.com/JacobKramerDK/prep/issues)

## 🙏 Acknowledgments

Built for the **Dynamous Kiro Hackathon** (January 5-23, 2026) using Kiro CLI for AI-assisted development.

---

**Ready to transform your meeting preparation workflow?** 🎯
