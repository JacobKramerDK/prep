# Meeting Transcription & Summarization Reference Guide
## Best Practices for OpenAI Models

> **Purpose**: This document serves as a technical reference for AI coding assistants building meeting transcription and summarization systems using OpenAI's APIs.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Transcription Layer](#transcription-layer)
3. [Summarization Pipeline](#summarization-pipeline)
4. [Prompt Templates](#prompt-templates)
5. [Structured Output Schemas](#structured-output-schemas)
6. [Long Document Handling](#long-document-handling)
7. [Best Practices & Patterns](#best-practices--patterns)
8. [Code Examples](#code-examples)

---

## Architecture Overview

### Recommended Two-Stage Pipeline

The industry-standard approach (used by Granola AI and similar tools) employs a **two-stage architecture**:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Audio Input   │────▶│  Transcription   │────▶│  Summarization  │
│   (Meeting)     │     │  (Whisper/GPT-4o)│     │  (GPT-4/Claude) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Structured JSON │
                                                 │    Output       │
                                                 └─────────────────┘
```

**Stage 1 (Context Extraction)**: Use a cheaper, faster model (GPT-4o-mini, GPT-3.5-turbo) to:
- Identify main topics and themes
- Extract speaker information
- Determine meeting type
- Flag potential action items

**Stage 2 (Quality Output)**: Use a more capable model (GPT-4, GPT-4o, Claude 3.5 Sonnet) to:
- Generate polished, structured summaries
- Extract detailed action items with owners
- Create context-aware formatting

**Benefits**: 60-80% cost reduction while maintaining output quality.

---

## Transcription Layer

### Available OpenAI Models

| Model | Use Case | Features | Limitations |
|-------|----------|----------|-------------|
| `whisper-1` | General transcription | Multiple output formats (json, text, srt, vtt), timestamps | No streaming, 224-token prompt limit |
| `gpt-4o-transcribe` | High-quality transcription | Streaming support, better accuracy, full prompting | json/text output only |
| `gpt-4o-mini-transcribe` | Cost-effective transcription | Streaming, faster processing | Slightly lower accuracy |
| `gpt-4o-transcribe-diarize` | Speaker identification | Speaker labels, diarized_json format | No prompts, requires chunking_strategy for >30s audio |

### Basic Transcription Implementation

```python
from openai import OpenAI

client = OpenAI()

def transcribe_audio(audio_file_path: str, model: str = "gpt-4o-transcribe") -> str:
    """
    Transcribe audio file using OpenAI's transcription API.
    
    Args:
        audio_file_path: Path to audio file (mp3, mp4, mpeg, mpga, m4a, wav, webm)
        model: Transcription model to use
    
    Returns:
        Transcribed text
    """
    with open(audio_file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            response_format="text"
        )
    return transcription
```

### Speaker Diarization Implementation

```python
import base64
from openai import OpenAI

client = OpenAI()

def transcribe_with_speakers(
    audio_file_path: str,
    known_speakers: dict[str, str] = None  # {"name": "reference_audio_path"}
) -> dict:
    """
    Transcribe audio with speaker identification.
    
    Args:
        audio_file_path: Path to meeting audio
        known_speakers: Optional dict mapping speaker names to reference audio paths
    
    Returns:
        Dict with segments containing speaker, text, start, end
    """
    extra_body = {}
    
    if known_speakers:
        names = list(known_speakers.keys())
        references = []
        for path in known_speakers.values():
            with open(path, "rb") as f:
                data = base64.b64encode(f.read()).decode("utf-8")
                references.append(f"data:audio/wav;base64,{data}")
        
        extra_body = {
            "known_speaker_names": names,
            "known_speaker_references": references
        }
    
    with open(audio_file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-transcribe-diarize",
            file=audio_file,
            response_format="diarized_json",
            chunking_strategy="auto",
            extra_body=extra_body if extra_body else None
        )
    
    return transcript
```

### Transcription Prompting Best Practices

Use prompts to improve transcription quality:

```python
# Correct domain-specific terminology
prompt = """
The following conversation is a technical meeting about our product.
Key terms: API, SDK, OAuth2, JWT, microservices, Kubernetes, Docker.
Product names: Acme Analytics, DataFlow Pro, CloudSync.
"""

# Preserve filler words (if needed)
prompt = "Umm, let me think like, hmm... Okay, here's what I'm, like, thinking."

# Ensure punctuation
prompt = "Hello, welcome to our weekly standup meeting. Let's begin."

# Specify writing style (for multilingual)
prompt = "使用简体中文转录。"  # Use simplified Chinese
```

---

## Summarization Pipeline

### Theme-Based Decomposition Strategy

For high-fidelity summaries, decompose the summarization into multiple prompts. This overcomes output token limits and produces richer detail.

**Step 1: Theme Identification**
```
You are an AI assistant analyzing a meeting transcript.

First, identify all major themes or topics discussed in this meeting.
Return a numbered list of themes (typically 3-8 themes).

TRANSCRIPT:
{transcript}
```

**Step 2: Theme Expansion** (repeat for each theme)
```
For Theme {N}: "{theme_name}"

Provide detailed notes from the transcript about this theme. Include:
- Direct quotes from participants
- Specific details, numbers, dates mentioned
- Context and background discussed
- Any decisions or conclusions related to this theme

Format with bullet points and clear hierarchies.
Avoid truncation - capture ALL relevant details.

TRANSCRIPT:
{transcript}
```

**Step 3: Action Item Extraction**
```
Extract all action items, decisions, and commitments from this transcript.

For each item, provide:
- Task description
- Owner/assignee (infer if not explicitly stated)
- Deadline (if mentioned)
- Dependencies (if any)
- Priority level (Critical/High/Medium/Low)

TRANSCRIPT:
{transcript}
```

### Single-Pass Summary Prompt

For faster processing when detail can be sacrificed:

```
You are an expert meeting summarizer. Analyze this transcript and produce a structured summary.

MEETING CONTEXT:
- Title: {meeting_title}
- Date: {date}
- Attendees: {attendees}
- Type: {meeting_type}  # e.g., standup, planning, sales call, 1:1

TRANSCRIPT:
{transcript}

OUTPUT FORMAT:

## Executive Summary
[2-3 sentences capturing the essence of the meeting]

## Key Decisions
| Decision | Rationale | Owner | Date |
|----------|-----------|-------|------|

## Action Items
| Task | Owner | Due Date | Priority |
|------|-------|----------|----------|

## Discussion Points
[Main topics with key quotes]

## Next Steps
[Follow-up items and scheduled meetings]
```

---

## Prompt Templates

### Meeting Type-Specific Templates

#### Sales Call Template
```
SALES CALL ANALYSIS

Analyze this sales call transcript and extract:

1. PROSPECT INFORMATION
   - Company name
   - Decision maker present (Yes/No)
   - Budget authority identified (Yes/No)

2. PAIN POINTS IDENTIFIED
   For each pain point:
   - Description
   - Severity (High/Medium/Low)
   - Quote from prospect

3. SOLUTIONS DISCUSSED
   - Products/features mentioned
   - Prospect reactions

4. OBJECTIONS RAISED
   | Objection | Our Response | Resolved? |
   |-----------|--------------|-----------|

5. BUYING SIGNALS
   [Positive indicators]

6. RED FLAGS
   [Concerns or blockers]

7. NEXT STEPS
   - Agreed actions
   - Follow-up date
   - Owner

TRANSCRIPT:
{transcript}
```

#### Engineering Standup Template
```
ENGINEERING STANDUP SUMMARY

Extract the following from each participant:

## {Speaker Name}

**Yesterday:**
- [Completed items]

**Today:**
- [Planned items]

**Blockers:**
- [Any blockers mentioned]

---

## TEAM BLOCKERS SUMMARY
[Consolidated list of blockers requiring attention]

## CROSS-TEAM DEPENDENCIES
[Items requiring coordination]

## DECISIONS MADE
[Any technical decisions from discussion]

TRANSCRIPT:
{transcript}
```

#### 1:1 Meeting Template
```
1:1 MEETING NOTES

## Context
- Manager: {manager_name}
- Report: {report_name}
- Date: {date}

## Topics Discussed
[List main topics with brief summaries]

## Feedback Given
- Positive: [Recognition/praise]
- Constructive: [Areas for improvement]

## Career Development
[Any discussion of growth, promotions, learning]

## Personal/Wellbeing
[Work-life balance, concerns raised]

## Action Items
| Item | Owner | Due |
|------|-------|-----|

## Follow-up Topics
[Items to revisit next meeting]

TRANSCRIPT:
{transcript}
```

### Chain of Density Prompt

For information-dense summaries (research-backed technique):

```
You will generate increasingly dense summaries of a meeting transcript.

Process:
1. Generate an initial summary (2-3 sentences) covering only the most essential points
2. Add 1-3 important entities/details to the summary without increasing length
3. Repeat step 2 for {N} iterations, rewriting to incorporate new details while maintaining the same word count

Rules:
- Each summary must be self-contained and understandable independently
- Increase information density through abstraction and fusion
- Maintain approximately the same length across iterations
- Focus on salient, meeting-specific details

TRANSCRIPT:
{transcript}

Generate {N} summaries of increasing density, each approximately {word_count} words.
```

---

## Structured Output Schemas

### Using OpenAI Structured Outputs

OpenAI's Structured Outputs ensure responses exactly match your JSON schema:

```python
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

client = OpenAI()

class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ActionItem(BaseModel):
    """A single action item extracted from the meeting."""
    id: int
    description: str
    owner: str
    due_date: Optional[str]
    priority: Priority
    dependencies: Optional[List[int]]

class Decision(BaseModel):
    """A decision made during the meeting."""
    description: str
    rationale: str
    decision_maker: str
    affected_parties: List[str]

class MeetingSummary(BaseModel):
    """Complete structured summary of a meeting."""
    executive_summary: str
    key_topics: List[str]
    decisions: List[Decision]
    action_items: List[ActionItem]
    next_meeting_date: Optional[str]
    follow_up_required: bool

def extract_meeting_summary(transcript: str) -> MeetingSummary:
    """Extract structured meeting summary using OpenAI."""
    
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": """You are an expert meeting analyst. 
                Extract structured information from meeting transcripts.
                Be precise with action item ownership and deadlines.
                Infer priority based on urgency language used."""
            },
            {
                "role": "user",
                "content": f"Extract a structured summary from this transcript:\n\n{transcript}"
            }
        ],
        response_format=MeetingSummary
    )
    
    return completion.choices[0].message.parsed
```

### JSON Schema Definition (for API calls)

```json
{
  "type": "object",
  "properties": {
    "executive_summary": {
      "type": "string",
      "description": "2-3 sentence overview of the meeting"
    },
    "key_topics": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Main topics discussed"
    },
    "decisions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": {"type": "string"},
          "rationale": {"type": "string"},
          "decision_maker": {"type": "string"},
          "affected_parties": {
            "type": "array",
            "items": {"type": "string"}
          }
        },
        "required": ["description", "decision_maker"],
        "additionalProperties": false
      }
    },
    "action_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "integer"},
          "description": {"type": "string"},
          "owner": {"type": "string"},
          "due_date": {"type": "string"},
          "priority": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
          },
          "dependencies": {
            "type": "array",
            "items": {"type": "integer"}
          }
        },
        "required": ["id", "description", "owner", "priority"],
        "additionalProperties": false
      }
    },
    "next_meeting_date": {"type": "string"},
    "follow_up_required": {"type": "boolean"}
  },
  "required": ["executive_summary", "key_topics", "decisions", "action_items", "follow_up_required"],
  "additionalProperties": false
}
```

---

## Long Document Handling

### Chunking Strategies

Meeting transcripts often exceed context windows. Use these strategies:

#### 1. Map-Reduce Approach
```python
def map_reduce_summarize(transcript: str, chunk_size: int = 3000) -> str:
    """
    Summarize long transcripts using map-reduce pattern.
    
    Phase 1 (Map): Summarize each chunk independently
    Phase 2 (Reduce): Combine chunk summaries into final summary
    """
    # Split into chunks with overlap
    chunks = split_with_overlap(transcript, chunk_size, overlap=300)
    
    # Phase 1: Map - summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        summary = client.chat.completions.create(
            model="gpt-4o-mini",  # Cheaper model for chunk summaries
            messages=[
                {"role": "system", "content": "Summarize this meeting segment. Preserve all key details, decisions, and action items."},
                {"role": "user", "content": chunk}
            ]
        )
        chunk_summaries.append(summary.choices[0].message.content)
    
    # Phase 2: Reduce - combine summaries
    combined = "\n\n---\n\n".join(chunk_summaries)
    
    final_summary = client.chat.completions.create(
        model="gpt-4o",  # Better model for final synthesis
        messages=[
            {"role": "system", "content": """Synthesize these meeting segment summaries into a coherent final summary.
            Deduplicate information, resolve any conflicts, and organize thematically.
            Preserve ALL action items and decisions."""},
            {"role": "user", "content": combined}
        ]
    )
    
    return final_summary.choices[0].message.content


def split_with_overlap(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    start = 0
    
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start = end - overlap
    
    return chunks
```

#### 2. Hierarchical Summarization
```python
def hierarchical_summarize(transcript: str) -> dict:
    """
    Three-level hierarchical summarization:
    1. Segment summaries
    2. Section summaries  
    3. Executive summary
    """
    # Level 1: Split by speaker turns or time segments
    segments = split_by_speaker_turns(transcript)
    segment_summaries = [summarize_segment(s) for s in segments]
    
    # Level 2: Group related segments, summarize sections
    sections = cluster_by_topic(segment_summaries)  # Use embeddings
    section_summaries = [summarize_section(s) for s in sections]
    
    # Level 3: Final executive summary
    executive_summary = synthesize_final(section_summaries)
    
    return {
        "executive_summary": executive_summary,
        "sections": section_summaries,
        "segments": segment_summaries
    }
```

#### 3. Recursive Chunking (LangChain pattern)
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],  # Try paragraph, sentence, word
    length_function=len
)

chunks = splitter.split_text(transcript)
```

### Context Window Management

```python
SUMMARY_TRIGGER = 20000  # tokens
KEEP_LAST_TURNS = 2

def manage_context(conversation_history: list, current_tokens: int) -> list:
    """
    Compress conversation history when approaching token limits.
    Pattern used by OpenAI's Realtime API context summarization.
    """
    if current_tokens < SUMMARY_TRIGGER:
        return conversation_history
    
    # Keep last N turns verbatim
    recent = conversation_history[-KEEP_LAST_TURNS:]
    older = conversation_history[:-KEEP_LAST_TURNS]
    
    # Summarize older content
    summary = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Compress this conversation history into a concise summary, preserving key decisions and context."},
            {"role": "user", "content": format_history(older)}
        ]
    )
    
    # Return compressed history + recent turns
    return [
        {"role": "assistant", "content": f"[Previous discussion summary: {summary.choices[0].message.content}]"},
        *recent
    ]
```

---

## Best Practices & Patterns

### 1. Behavioral vs. Psychological Insights

**Key principle from Granola AI**: Stick to observable behavior, not psychological interpretation.

✅ **Behavioral (Observable)**: "You say 'does that make sense?' frequently in meetings"
❌ **Psychological (Speculative)**: "You seek validation because you're insecure"

**Prompt guidance**:
```
Focus ONLY on observable behaviors from the transcript:
- Phrases or words used repeatedly
- Communication patterns (interruptions, questions, etc.)
- Topics the person frequently returns to

Do NOT infer:
- Emotional states
- Motivations or intentions
- Personality traits
```

### 2. Specificity Over Generality

Generic summaries lack credibility. Specific details earn trust.

❌ **Generic**: "The team discussed the project timeline"
✅ **Specific**: "Sarah proposed moving the launch from March 15 to April 1 due to QA backlog; team agreed pending stakeholder approval"

**Prompt guidance**:
```
Include specific details for every point:
- Names of people who spoke
- Exact dates, numbers, or metrics mentioned
- Direct quotes for important statements
- Specific outcomes or decisions

Avoid vague summaries that could apply to any meeting.
```

### 3. Meeting Type Detection

Automatically detect meeting type to apply appropriate templates:

```python
def detect_meeting_type(transcript: str, calendar_title: str = None) -> str:
    """Detect meeting type for appropriate summarization template."""
    
    prompt = f"""Classify this meeting into ONE of these types:
    - standup: Daily sync, status updates
    - planning: Sprint/project planning
    - sales_call: Customer/prospect conversation
    - one_on_one: Manager-report 1:1
    - interview: Job interview
    - brainstorm: Ideation session
    - review: Code review, design review, retrospective
    - all_hands: Company/team-wide meeting
    - external: Client/vendor meeting
    - other: Doesn't fit above categories
    
    Calendar title (if available): {calendar_title or 'N/A'}
    
    Transcript excerpt:
    {transcript[:2000]}
    
    Return ONLY the meeting type (single word)."""
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=20
    )
    
    return response.choices[0].message.content.strip().lower()
```

### 4. Error Handling & Validation

```python
def validate_summary(summary: MeetingSummary, transcript: str) -> List[str]:
    """Validate extracted summary against source transcript."""
    
    issues = []
    
    # Check action items have owners
    for item in summary.action_items:
        if not item.owner or item.owner.lower() in ["unknown", "tbd", "n/a"]:
            issues.append(f"Action item '{item.description[:50]}...' missing owner")
    
    # Verify names mentioned exist in transcript
    mentioned_names = extract_names(summary)
    transcript_lower = transcript.lower()
    for name in mentioned_names:
        if name.lower() not in transcript_lower:
            issues.append(f"Name '{name}' in summary not found in transcript")
    
    # Check for hallucinated dates
    summary_dates = extract_dates(str(summary))
    transcript_dates = extract_dates(transcript)
    for date in summary_dates:
        if date not in transcript_dates:
            issues.append(f"Date '{date}' in summary not found in transcript")
    
    return issues
```

### 5. Post-Processing with GPT-4

Improve Whisper transcription quality with a post-processing step:

```python
def post_process_transcript(
    raw_transcript: str,
    domain_terms: List[str] = None,
    speaker_corrections: dict = None
) -> str:
    """
    Post-process transcription to fix common errors.
    
    Args:
        raw_transcript: Output from Whisper
        domain_terms: List of domain-specific terms to spell correctly
        speaker_corrections: Dict mapping wrong names to correct names
    """
    
    system_prompt = f"""You are a transcript editor. Fix the following issues:
    
1. Correct spellings of these domain terms: {', '.join(domain_terms or [])}
2. Fix speaker name spellings: {speaker_corrections or 'N/A'}
3. Add appropriate punctuation and capitalization
4. Fix obvious transcription errors based on context
5. Do NOT change the meaning or add information

Output the corrected transcript only."""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_transcript}
        ]
    )
    
    return response.choices[0].message.content
```

---

## Code Examples

### Complete Pipeline Example

```python
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
import json

client = OpenAI()

# ============ SCHEMAS ============

class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ActionItem(BaseModel):
    description: str
    owner: str
    due_date: Optional[str] = None
    priority: Priority

class MeetingSummary(BaseModel):
    executive_summary: str
    key_topics: List[str]
    action_items: List[ActionItem]
    decisions: List[str]
    follow_ups: List[str]

# ============ TRANSCRIPTION ============

def transcribe_meeting(audio_path: str) -> str:
    """Transcribe meeting audio with speaker diarization."""
    with open(audio_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model="gpt-4o-transcribe-diarize",
            file=f,
            response_format="diarized_json",
            chunking_strategy="auto"
        )
    
    # Format as readable transcript
    lines = []
    for segment in result.segments:
        lines.append(f"[{segment.speaker}]: {segment.text}")
    
    return "\n".join(lines)

# ============ SUMMARIZATION ============

def summarize_meeting(
    transcript: str,
    meeting_type: str = "general",
    attendees: List[str] = None
) -> MeetingSummary:
    """Generate structured meeting summary."""
    
    system_prompt = f"""You are an expert meeting summarizer.
    
Meeting Type: {meeting_type}
Attendees: {', '.join(attendees) if attendees else 'Not specified'}

Extract a comprehensive summary following the exact schema provided.
- Be specific with action items (include exact tasks, not vague descriptions)
- Assign owners to ALL action items (infer from context if not explicit)
- Include actual decisions made, not just topics discussed
- Note any follow-up meetings or deadlines mentioned"""

    response = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Summarize this meeting transcript:\n\n{transcript}"}
        ],
        response_format=MeetingSummary
    )
    
    return response.choices[0].message.parsed

# ============ FULL PIPELINE ============

def process_meeting(
    audio_path: str,
    meeting_title: str = None,
    attendees: List[str] = None
) -> dict:
    """
    Complete meeting processing pipeline.
    
    Returns dict with:
    - transcript: Full diarized transcript
    - summary: Structured MeetingSummary
    - meeting_type: Detected meeting type
    """
    
    # Step 1: Transcribe
    print("Transcribing audio...")
    transcript = transcribe_meeting(audio_path)
    
    # Step 2: Detect meeting type
    print("Detecting meeting type...")
    meeting_type = detect_meeting_type(transcript, meeting_title)
    
    # Step 3: Summarize
    print(f"Generating summary for {meeting_type} meeting...")
    summary = summarize_meeting(transcript, meeting_type, attendees)
    
    return {
        "transcript": transcript,
        "summary": summary,
        "meeting_type": meeting_type
    }

# ============ USAGE ============

if __name__ == "__main__":
    result = process_meeting(
        audio_path="meeting.mp3",
        meeting_title="Weekly Engineering Standup",
        attendees=["Alice", "Bob", "Carol"]
    )
    
    print("\n=== EXECUTIVE SUMMARY ===")
    print(result["summary"].executive_summary)
    
    print("\n=== ACTION ITEMS ===")
    for item in result["summary"].action_items:
        print(f"- [{item.priority.value.upper()}] {item.description}")
        print(f"  Owner: {item.owner} | Due: {item.due_date or 'TBD'}")
```

### Streaming Transcription Example

```python
async def stream_transcription(audio_path: str):
    """Stream transcription results as they're generated."""
    
    with open(audio_path, "rb") as f:
        stream = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=f,
            response_format="text",
            stream=True
        )
    
    full_text = ""
    for event in stream:
        if hasattr(event, 'text'):
            print(event.text, end="", flush=True)
            full_text += event.text
    
    return full_text
```

### Batch Processing for Cost Optimization

```python
import json

def create_batch_file(transcripts: List[dict]) -> str:
    """Create JSONL batch file for multiple transcripts."""
    
    lines = []
    for i, item in enumerate(transcripts):
        request = {
            "custom_id": f"meeting-{i}",
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "Summarize this meeting transcript..."},
                    {"role": "user", "content": item["transcript"]}
                ],
                "max_tokens": 2000
            }
        }
        lines.append(json.dumps(request))
    
    batch_file = "\n".join(lines)
    
    # Upload and create batch
    file = client.files.create(
        file=batch_file.encode(),
        purpose="batch"
    )
    
    batch = client.batches.create(
        input_file_id=file.id,
        endpoint="/v1/chat/completions",
        completion_window="24h"
    )
    
    return batch.id
```

---

## Quick Reference

### Model Selection Guide

| Scenario | Transcription Model | Summarization Model |
|----------|---------------------|---------------------|
| Real-time streaming | `gpt-4o-mini-transcribe` | `gpt-4o-mini` |
| High accuracy needed | `gpt-4o-transcribe` | `gpt-4o` |
| Speaker identification | `gpt-4o-transcribe-diarize` | `gpt-4o` |
| Cost optimization | `whisper-1` | `gpt-4o-mini` |
| Batch processing | `whisper-1` | `gpt-4o` (batch API) |

### Token Limits & Pricing Reference

| Model | Context Window | Input $/1M | Output $/1M |
|-------|---------------|------------|-------------|
| gpt-4o | 128K | $2.50 | $10.00 |
| gpt-4o-mini | 128K | $0.15 | $0.60 |
| whisper-1 | N/A | $0.006/min | N/A |
| gpt-4o-transcribe | N/A | ~$0.01/min | N/A |

### Prompt Engineering Checklist

- [ ] Include meeting context (type, attendees, date)
- [ ] Specify exact output format (JSON schema or markdown)
- [ ] Request specific details, not generic summaries
- [ ] Include domain-specific terminology to recognize
- [ ] Set constraints (word limits, number of items)
- [ ] Use positive framing ("include X" vs "don't exclude X")
- [ ] For long transcripts, use multi-stage decomposition
- [ ] Validate output against source transcript

---

## References

- [OpenAI Speech-to-Text Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/json-mode)
- [Granola AI Prompt Engineering Blog](https://granola.ai/blog/how-we-wrote-the-prompts-behind-granolas-crunched-2025)
- [Chain of Density Prompting Research](https://arxiv.org/abs/2309.04269)
- [OpenAI Context Summarization Cookbook](https://cookbook.openai.com/examples/context_summarization_with_realtime_api)

---

*Last Updated: January 2026*
