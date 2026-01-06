# Complex Obsidian Markdown Test

## Meeting Notes - Project Alpha
**Date:** 2024-01-06  
**Attendees:** [[John Doe]], [[Jane Smith]], [[Bob Wilson]]

### Action Items
- [ ] Review [[Technical Specification]] document
- [x] Update [[Project Timeline]] 
- [ ] Schedule follow-up with [[Client Name]]

### Discussion Points

#### Technical Architecture
We discussed the implementation of the new [[API Gateway]] which will handle:

```typescript
interface APIResponse {
  data: any
  status: 'success' | 'error'
  message?: string
}

const handleRequest = async (req: Request): Promise<APIResponse> => {
  try {
    const result = await processRequest(req)
    return { data: result, status: 'success' }
  } catch (error) {
    return { data: null, status: 'error', message: error.message }
  }
}
```

#### Links and References
- Main project: [[Projects/Alpha/Overview]]
- Related: [[Projects/Beta/Integration Points]]
- Documentation: [[Docs/API Reference]]
- External link: [GitHub Repository](https://github.com/example/repo)

### Tags and Categories
#meeting #project-alpha #technical-review #q1-2024

### Code Examples

**Python snippet:**
```python
def calculate_metrics(data):
    """Calculate performance metrics"""
    total = sum(data)
    average = total / len(data) if data else 0
    return {
        'total': total,
        'average': average,
        'count': len(data)
    }
```

**SQL query:**
```sql
SELECT 
    u.name,
    COUNT(p.id) as project_count,
    AVG(p.completion_rate) as avg_completion
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
WHERE u.active = true
GROUP BY u.id, u.name
ORDER BY avg_completion DESC;
```

### Complex Wikilinks
- Simple: [[Page Name]]
- With alias: [[Real Page Name|Display Name]]
- With spaces: [[Page With Many Spaces]]
- With symbols: [[Page & Symbols (2024)]]
- Nested: [[Folder/Subfolder/Page]]

### Lists and Formatting

#### Nested Lists
1. First level item
   - Second level bullet
   - Another second level
     - Third level item
     - Another third level
2. Back to first level
   1. Numbered sub-item
   2. Another numbered sub-item

#### Text Formatting
- **Bold text** and *italic text*
- ***Bold and italic combined***
- `inline code` snippets
- ~~Strikethrough text~~
- ==Highlighted text== (Obsidian specific)

### Tables
| Feature | Status | Priority | Assignee |
|---------|--------|----------|----------|
| [[User Authentication]] | In Progress | High | [[John Doe]] |
| [[Data Migration]] | Completed | Medium | [[Jane Smith]] |
| [[API Documentation]] | Pending | Low | [[Bob Wilson]] |

### Blockquotes
> This is a blockquote with some important information
> that spans multiple lines and contains [[wikilinks]]
> and **formatting**.

### Mathematical Expressions (if supported)
The formula is: $E = mc^2$

Block math:
$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \ldots + x_n
$$

---

**Footer Notes:**
- Created: [[2024-01-06]]
- Last modified: [[2024-01-06]]
- Related meetings: [[Meeting 2024-01-05]], [[Meeting 2024-01-07]]
