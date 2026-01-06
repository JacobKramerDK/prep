# Syntax Highlighting Showcase

This file demonstrates various programming languages and their syntax highlighting capabilities.

## TypeScript/JavaScript

```typescript
interface User {
  id: number
  name: string
  email: string
  isActive: boolean
}

class UserService {
  private users: User[] = []

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      id: Date.now(),
      ...userData
    }
    
    this.users.push(newUser)
    return newUser
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find(user => user.email === email)
  }
}

// Usage example
const userService = new UserService()
const user = await userService.createUser({
  name: "John Doe",
  email: "john@example.com",
  isActive: true
})
```

## Python

```python
from typing import List, Optional, Dict
import asyncio
import json

class DataProcessor:
    def __init__(self, config: Dict[str, any]):
        self.config = config
        self.processed_items = []
    
    async def process_batch(self, items: List[Dict]) -> List[Dict]:
        """Process a batch of items asynchronously"""
        tasks = [self._process_item(item) for item in items]
        results = await asyncio.gather(*tasks)
        
        # Filter out None results
        valid_results = [r for r in results if r is not None]
        self.processed_items.extend(valid_results)
        
        return valid_results
    
    async def _process_item(self, item: Dict) -> Optional[Dict]:
        try:
            # Simulate processing time
            await asyncio.sleep(0.1)
            
            if item.get('status') == 'active':
                return {
                    'id': item['id'],
                    'processed_at': time.time(),
                    'result': item['data'].upper()
                }
        except Exception as e:
            print(f"Error processing item {item.get('id')}: {e}")
            return None

# Usage
processor = DataProcessor({'batch_size': 10})
results = await processor.process_batch(data_items)
```

## SQL

```sql
-- Complex query with CTEs and window functions
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', order_date) as month,
        customer_id,
        SUM(total_amount) as monthly_total,
        COUNT(*) as order_count
    FROM orders 
    WHERE order_date >= '2024-01-01'
    GROUP BY DATE_TRUNC('month', order_date), customer_id
),
customer_metrics AS (
    SELECT 
        customer_id,
        AVG(monthly_total) as avg_monthly_spend,
        SUM(monthly_total) as total_spend,
        SUM(order_count) as total_orders,
        ROW_NUMBER() OVER (ORDER BY SUM(monthly_total) DESC) as spend_rank
    FROM monthly_sales
    GROUP BY customer_id
)
SELECT 
    c.customer_name,
    cm.avg_monthly_spend,
    cm.total_spend,
    cm.total_orders,
    cm.spend_rank,
    CASE 
        WHEN cm.spend_rank <= 10 THEN 'VIP'
        WHEN cm.spend_rank <= 50 THEN 'Premium'
        ELSE 'Standard'
    END as customer_tier
FROM customer_metrics cm
JOIN customers c ON cm.customer_id = c.id
WHERE cm.total_spend > 1000
ORDER BY cm.spend_rank;
```

## Rust

```rust
use std::collections::HashMap;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry<T> {
    value: T,
    expires_at: u64,
}

pub struct AsyncCache<T> {
    store: RwLock<HashMap<String, CacheEntry<T>>>,
    default_ttl: u64,
}

impl<T> AsyncCache<T> 
where 
    T: Clone + Send + Sync + 'static,
{
    pub fn new(default_ttl: u64) -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
            default_ttl,
        }
    }

    pub async fn get(&self, key: &str) -> Option<T> {
        let store = self.store.read().await;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if let Some(entry) = store.get(key) {
            if entry.expires_at > now {
                return Some(entry.value.clone());
            }
        }
        None
    }

    pub async fn set(&self, key: String, value: T, ttl: Option<u64>) {
        let mut store = self.store.write().await;
        let expires_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() + ttl.unwrap_or(self.default_ttl);

        store.insert(key, CacheEntry { value, expires_at });
    }
}
```

## Go

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sync"
    "time"
)

type APIResponse struct {
    Data    interface{} `json:"data"`
    Status  string      `json:"status"`
    Message string      `json:"message,omitempty"`
}

type Server struct {
    mu       sync.RWMutex
    handlers map[string]http.HandlerFunc
    cache    map[string]CacheEntry
}

type CacheEntry struct {
    Value     interface{}
    ExpiresAt time.Time
}

func NewServer() *Server {
    return &Server{
        handlers: make(map[string]http.HandlerFunc),
        cache:    make(map[string]CacheEntry),
    }
}

func (s *Server) RegisterHandler(path string, handler http.HandlerFunc) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.handlers[path] = handler
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    s.mu.RLock()
    handler, exists := s.handlers[r.URL.Path]
    s.mu.RUnlock()

    if !exists {
        s.writeError(w, "Not Found", http.StatusNotFound)
        return
    }

    handler(w, r)
}

func (s *Server) writeJSON(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    response := APIResponse{
        Data:   data,
        Status: "success",
    }
    json.NewEncoder(w).Encode(response)
}

func (s *Server) writeError(w http.ResponseWriter, message string, code int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(code)
    response := APIResponse{
        Status:  "error",
        Message: message,
    }
    json.NewEncoder(w).Encode(response)
}

func main() {
    server := NewServer()
    
    server.RegisterHandler("/health", func(w http.ResponseWriter, r *http.Request) {
        server.writeJSON(w, map[string]string{"status": "healthy"})
    })

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", server))
}
```

## JSON

```json
{
  "name": "prep-meeting-assistant",
  "version": "1.0.0",
  "description": "Desktop meeting preparation assistant",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "build": "npm run build:renderer && npm run build:main",
    "test": "jest --coverage"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "electron": "^35.7.5",
    "react-markdown": "^9.0.0",
    "remark-wiki-link": "^1.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  },
  "build": {
    "appId": "com.prep.meeting-assistant",
    "productName": "Prep",
    "directories": {
      "output": "out"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ]
  }
}
```

## YAML

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          npm run build

      - name: Run tests
        run: |
          npm test -- --coverage
          npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        run: echo "Deploying to production..."
```

This file showcases syntax highlighting across multiple programming languages commonly used in development projects. Each code block should render with appropriate syntax highlighting when viewed through the markdown renderer.

#syntax-highlighting #code-examples #testing
