# Google Calendar Integration Research for Electron Apps

## 1. OAuth 2.0 PKCE Patterns for Electron Apps

### Core PKCE Implementation
```typescript
import crypto from 'crypto';
import { shell } from 'electron';

class PKCEAuth {
  private codeVerifier: string;
  private codeChallenge: string;

  constructor() {
    this.codeVerifier = this.generateCodeVerifier();
    this.codeChallenge = this.generateCodeChallenge(this.codeVerifier);
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: 'http://localhost:8080/callback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
}
```

### Security Considerations
- Always use `code_challenge_method: 'S256'`
- Generate code_verifier with crypto.randomBytes(32)
- Never store code_verifier in renderer process
- Use localhost redirect with random port for security

## 2. googleapis Library Best Practices

### Minimal Setup Pattern
```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

class CalendarClient {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:8080/callback'
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  async getEvents(timeMin: string, timeMax: string) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });
      return response.data.items;
    } catch (error) {
      throw new Error(`Calendar API error: ${error.message}`);
    }
  }
}
```

### Common Gotchas
- Always set `singleEvents: true` for recurring events
- Use ISO 8601 format for timeMin/timeMax
- Handle `invalid_grant` errors by re-authenticating
- Check token expiry before API calls

## 3. Google Calendar API Rate Limiting

### Rate Limits (as of 2024)
- **Queries per day**: 1,000,000
- **Queries per 100 seconds per user**: 1,000
- **Queries per 100 seconds**: 10,000

### Retry Strategy Implementation
```typescript
class RateLimitHandler {
  private maxRetries = 3;
  private baseDelay = 1000;

  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (error.code === 429 && attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt, error.headers?.['retry-after']);
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private calculateDelay(attempt: number, retryAfter?: string): number {
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    return this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Optimization Patterns
- Batch requests when possible using `calendar.events.list` with date ranges
- Cache responses for 5-15 minutes depending on use case
- Use `fields` parameter to limit response size
- Implement request deduplication

## 4. Token Storage with electron-store

### Secure Storage Pattern
```typescript
import Store from 'electron-store';
import { safeStorage } from 'electron';

class TokenStore {
  private store: Store;

  constructor() {
    this.store = new Store({
      name: 'auth-tokens',
      encryptionKey: 'your-app-specific-key',
      fileExtension: 'dat'
    });
  }

  async storeTokens(tokens: any): Promise<void> {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
      this.store.set('google_tokens', encrypted.toString('base64'));
    } else {
      // Fallback for development
      this.store.set('google_tokens', tokens);
    }
  }

  async getTokens(): Promise<any> {
    const stored = this.store.get('google_tokens');
    if (!stored) return null;

    if (safeStorage.isEncryptionAvailable() && typeof stored === 'string') {
      try {
        const buffer = Buffer.from(stored, 'base64');
        const decrypted = safeStorage.decryptString(buffer);
        return JSON.parse(decrypted);
      } catch (error) {
        console.error('Token decryption failed:', error);
        return null;
      }
    }
    
    return stored;
  }

  clearTokens(): void {
    this.store.delete('google_tokens');
  }
}
```

### Security Best Practices
- Use `safeStorage` API for token encryption
- Store tokens in main process only
- Clear tokens on app uninstall
- Validate token structure before storage

## 5. Desktop OAuth Redirect Handling

### Local Server Pattern
```typescript
import express from 'express';
import { BrowserWindow } from 'electron';

class OAuthHandler {
  private server: any;
  private authWindow: BrowserWindow | null = null;

  async startAuthFlow(): Promise<string> {
    return new Promise((resolve, reject) => {
      const app = express();
      
      app.get('/callback', (req, res) => {
        const { code, error } = req.query;
        
        if (error) {
          res.send('<h1>Authentication failed</h1>');
          reject(new Error(error as string));
          return;
        }

        res.send('<h1>Authentication successful! You can close this window.</h1>');
        resolve(code as string);
        
        // Cleanup
        this.server?.close();
        this.authWindow?.close();
      });

      this.server = app.listen(8080, () => {
        this.openAuthWindow('http://localhost:8080/auth');
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        this.server?.close();
        this.authWindow?.close();
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
  }

  private openAuthWindow(authUrl: string): void {
    this.authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    this.authWindow.loadURL(authUrl);
    
    this.authWindow.on('closed', () => {
      this.authWindow = null;
    });
  }
}
```

### Alternative: Custom Protocol Handler
```typescript
// In main process
import { app, protocol } from 'electron';

app.setAsDefaultProtocolClient('prep-auth');

protocol.registerHttpProtocol('prep-auth', (request, callback) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (code) {
    // Handle auth code
    this.handleAuthCode(code);
  }
  
  callback({ statusCode: 200 });
});
```

### Redirect URI Patterns
- **Development**: `http://localhost:8080/callback`
- **Production**: Custom protocol `prep-auth://callback`
- **Fallback**: `urn:ietf:wg:oauth:2.0:oob` for manual code entry

## Implementation Checklist

### Security
- [ ] PKCE implementation with S256
- [ ] Token encryption with safeStorage
- [ ] No tokens in renderer process
- [ ] Secure redirect handling

### Error Handling
- [ ] Rate limit retry logic
- [ ] Token refresh automation
- [ ] Network error recovery
- [ ] User-friendly error messages

### Performance
- [ ] Response caching
- [ ] Request batching
- [ ] Minimal API calls
- [ ] Background token refresh

### User Experience
- [ ] Auth window management
- [ ] Progress indicators
- [ ] Offline mode handling
- [ ] Clear error states