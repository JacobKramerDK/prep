# Wikilink Edge Cases Test

## Basic Wikilinks
- Simple: [[Page Name]]
- With alias: [[Real Page Name|Display Name]]
- Single word: [[Homepage]]

## Special Characters
- With spaces: [[Page With Many Spaces]]
- With symbols: [[Page & Symbols (2024)]]
- With numbers: [[Meeting 2024-01-06]]
- With underscores: [[file_name_example]]
- With dashes: [[project-alpha-beta]]

## Nested Paths
- Folder structure: [[Folder/Subfolder/Page]]
- Deep nesting: [[Projects/2024/Q1/Meeting Notes]]
- With extensions: [[Documents/report.pdf]]

## Complex Cases
- Multiple in sentence: [[John Doe]] met with [[Jane Smith]] about [[Project Alpha]]
- In lists:
  - [[Task 1]]
  - [[Task 2]]
  - [[Task 3]]
- In tables: 

| Name | Link |
|------|------|
| Person | [[John Doe]] |
| Project | [[Alpha Project]] |

## Edge Cases That Might Break
- Empty: [[]]
- Just spaces: [[   ]]
- Special chars: [[Page@#$%^&*()]]
- Unicode: [[Café & Résumé]]
- Very long: [[This Is A Very Long Page Name That Might Cause Issues With Rendering Or Processing]]

## Mixed with Other Markdown
**Bold [[Page Name]] text** and *italic [[Another Page]] text*.

> Blockquote with [[Quoted Page]] reference.

```javascript
// Code block with [[Page Name]] (should not be processed)
const link = "[[Not A Link]]"
```

Inline `code with [[Page Name]]` (should not be processed).

## Real-world Examples
Meeting with [[Sarah Johnson]] about the [[Q4 Budget Planning]] session. Need to review [[Financial Projections 2024]] and coordinate with [[Marketing Team]].

Action items:
1. Update [[Project Roadmap]]
2. Schedule [[Team Standup]]
3. Review [[Code Review Guidelines]]

#wikilinks #testing #obsidian
