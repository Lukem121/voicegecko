# VoiceGecko Technical Specifications

## Audio Specifications

### Recording Format

- **Input Format**: PCM WAV
  - Sample Rate: 16kHz (speech optimized)
  - Bit Depth: 16-bit
  - Channels: Mono
  - Encoding: Linear PCM

### Storage Format

- **Output Format**: WebM with Opus codec
  - Bitrate: 32kbps (optimized for speech)
  - Application: VOIP mode
  - Compression: ~10:1 ratio from WAV
  - File naming: `{timestamp}-{cuid2}.webm`

### Audio Constraints

- **Maximum Duration**: 2 hours per recording
- **Maximum File Size**: 500MB (after compression)
- **Minimum Duration**: 1 second
- **Supported Languages**: 99+ (via Whisper)

## Transcription Models

### OpenAI Whisper API (Cloud)

- **Model**: whisper-1
- **Accuracy**: Highest
- **Speed**: ~1x real-time
- **Cost**: $0.006/minute
- **Max file size**: 25MB
- **Supported formats**: mp3, mp4, mpeg, mpga, m4a, wav, webm

### Local Whisper Models

| Model  | Size    | RAM Required | Relative Speed | English Accuracy |
| ------ | ------- | ------------ | -------------- | ---------------- |
| tiny   | 39 MB   | 1 GB         | ~10x           | ~87%             |
| base   | 74 MB   | 1.5 GB       | ~7x            | ~91%             |
| small  | 244 MB  | 3 GB         | ~4x            | ~94%             |
| medium | 769 MB  | 5 GB         | ~2x            | ~96%             |
| large  | 1550 MB | 10 GB        | ~1x            | ~98%             |

## API Specifications

### Rate Limits

- **Authentication**: 10 requests/minute
- **Transcription Creation**: 30 requests/minute
- **List Operations**: 60 requests/minute
- **File Upload**: 10 concurrent

### Response Times (P95)

- **List transcriptions**: < 200ms
- **Create transcription**: < 500ms
- **Update metadata**: < 100ms
- **Delete transcription**: < 300ms

### Pagination

- **Default page size**: 20 items
- **Maximum page size**: 100 items
- **Cursor-based**: For consistent results
- **Sort options**: Date, duration, title

## Database Specifications

### Tables and Indexes

#### transcriptions

```sql
CREATE INDEX idx_transcriptions_user_created
  ON transcriptions(user_id, created_at DESC);
CREATE INDEX idx_transcriptions_status
  ON transcriptions(status)
  WHERE status IN ('pending', 'processing');
CREATE INDEX idx_transcriptions_search
  ON transcriptions
  USING gin(to_tsvector('english', transcription_text));
```

#### usage_tracking

```sql
CREATE INDEX idx_usage_user_period
  ON usage_tracking(user_id, period_start, period_end);
CREATE INDEX idx_usage_active
  ON usage_tracking(user_id)
  WHERE period_end > now();
```

### Data Retention

- **Audio files**: 90 days (configurable)
- **Transcriptions**: Indefinite
- **Usage logs**: 1 year
- **Deleted items**: 30 days (soft delete)

## Storage Specifications

### File Organization

```
storage/
├── audio/
│   └── {user_id}/
│       └── {yyyy-mm-dd}/
│           ├── 1698765432-cuid2.webm
│           └── 1698765890-cuid2.webm
├── models/
│   ├── whisper-tiny.pt
│   ├── whisper-base.pt
│   └── config.json
└── temp/
    └── processing/
```

### Storage Quotas

- **Free tier**: 500MB/month
- **Pro tier**: 10GB/month
- **Enterprise**: Unlimited
- **Model cache**: 5GB maximum

## Security Specifications

### Authentication

- **Provider**: Discord OAuth 2.0
- **Session duration**: 30 days
- **Token rotation**: Every 24 hours
- **MFA support**: Via Discord

### Encryption

- **In transit**: TLS 1.3
- **At rest**: AES-256-GCM
- **Audio files**: Optional client-side encryption
- **Database**: Transparent data encryption

### Permissions

- **User isolation**: Complete via RLS
- **Admin access**: Separate permission system
- **API keys**: Scoped permissions (future)

## Performance Requirements

### Desktop Application

- **Startup time**: < 3 seconds
- **Memory usage**: < 200MB idle
- **CPU usage**: < 5% idle
- **Recording latency**: < 50ms

### Transcription Performance

- **Queue time**: < 5 seconds
- **Processing time**: 1-2x audio duration
- **Accuracy target**: > 95% (English)
- **Concurrent jobs**: 10 per user

### UI Responsiveness

- **First paint**: < 1 second
- **Time to interactive**: < 2 seconds
- **List rendering**: 60 FPS
- **Search latency**: < 300ms

## Hardware Requirements

### Minimum (Cloud-only)

- **RAM**: 4GB
- **Storage**: 1GB available
- **CPU**: Dual-core 2GHz
- **Network**: Broadband internet

### Recommended (Local + Cloud)

- **RAM**: 8GB
- **Storage**: 10GB available
- **CPU**: Quad-core 2.5GHz
- **GPU**: Not required

### Optimal (All models)

- **RAM**: 16GB+
- **Storage**: 20GB available
- **CPU**: 6+ cores 3GHz+
- **GPU**: NVIDIA with 4GB+ VRAM

## Integration Specifications

### Webhook Events (Future)

```json
{
  "event": "transcription.completed",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "transcription_id": "cuid2",
    "user_id": "user123",
    "duration": 120,
    "word_count": 250
  }
}
```

### Export Formats

- **Plain Text (.txt)**: Simple transcription
- **JSON (.json)**: Full metadata included
- **CSV (.csv)**: Tabular format
- **Markdown (.md)**: Formatted with metadata
- **SRT (.srt)**: Subtitle format (future)

### API Response Format

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

## Error Codes

| Code              | Description                | User Action      |
| ----------------- | -------------------------- | ---------------- |
| AUTH_REQUIRED     | Not authenticated          | Sign in          |
| QUOTA_EXCEEDED    | Usage limit reached        | Upgrade plan     |
| INVALID_AUDIO     | Audio format not supported | Check format     |
| MODEL_UNAVAILABLE | Model not downloaded       | Download model   |
| PROCESSING_FAILED | Transcription failed       | Retry            |
| RATE_LIMITED      | Too many requests          | Wait and retry   |
| STORAGE_FULL      | Storage quota exceeded     | Delete old files |

## Monitoring Metrics

### Application Metrics

- Active users (DAU/MAU)
- Recordings per user
- Average recording duration
- Transcription success rate
- Model usage distribution

### Performance Metrics

- API response times (P50, P95, P99)
- Transcription queue depth
- Processing time by model
- Error rates by type
- Storage usage trends

### Business Metrics

- Free to paid conversion
- Feature adoption rates
- User retention (D1, D7, D30)
- Usage patterns by tier

## Testing Requirements

### Unit Test Coverage

- API routes: > 80%
- Business logic: > 90%
- UI components: > 70%
- Utility functions: 100%

### Integration Tests

- Authentication flow
- Recording → Transcription pipeline
- Usage tracking accuracy
- Export functionality
- Error handling

### Performance Tests

- Load testing: 1000 concurrent users
- Stress testing: Queue overflow
- Endurance testing: 24-hour operation
- Spike testing: Sudden load increase
