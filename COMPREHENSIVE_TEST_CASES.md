# Comprehensive Test Cases for Aldeia Chatbot Application

**Generated**: January 26, 2026  
**Application Version**: 2.0.0-phase5  
**Test Coverage Areas**: Unit Tests, Performance Monitoring, ChromaDB Fact Initialization, Session Tracking, Demographic Data Collection

---

## Table of Contents

1. [Unit Tests](#1-unit-tests)
2. [Performance Monitoring](#2-performance-monitoring)
3. [ChromaDB Fact Initialization](#3-chromadb-fact-initialization)
4. [Session Tracking Integration](#4-session-tracking-integration)
5. [Demographic Data Collection](#5-demographic-data-collection)
6. [Integration Tests](#6-integration-tests)
7. [End-to-End Tests](#7-end-to-end-tests)

---

## 1. Unit Tests

### 1.1 Analytics Service Tests

#### Test Case: `analytics-service.test.ts`

**File**: `apps/backend/src/tests/analytics-service.test.ts`

```typescript
describe('AnalyticsService', () => {
  describe('logEvent', () => {
    it('should log a user message event successfully', async () => {
      // Test logging user message with metadata
    });
    
    it('should log a bot response event with confidence score', async () => {
      // Test logging bot response with confidence, bias, hallucination data
    });
    
    it('should handle logging errors gracefully', async () => {
      // Test error handling when database is unavailable
    });
  });
  
  describe('getUserAnalyticsSummary', () => {
    it('should return correct event counts for a user', async () => {
      // Test event aggregation by type
    });
    
    it('should return empty summary for user with no events', async () => {
      // Test edge case: new user
    });
  });
  
  describe('getOverallSummary', () => {
    it('should aggregate events across all users', async () => {
      // Test system-wide analytics
    });
    
    it('should count unique users correctly', async () => {
      // Test user deduplication
    });
  });
});
```

#### Test Case: `advanced-analytics-service.test.ts`

**File**: `apps/backend/src/tests/advanced-analytics-service.test.ts`

```typescript
describe('AdvancedAnalyticsService', () => {
  describe('getUserAnalytics', () => {
    it('should calculate total users correctly', async () => {
      // Test user count calculation
    });
    
    it('should calculate active users in date range', async () => {
      // Test active user filtering by date
    });
    
    it('should calculate new vs returning users', async () => {
      // Test user segmentation
    });
    
    it('should calculate average session duration from user_sessions table', async () => {
      // Test session duration aggregation
    });
    
    it('should calculate average messages per session', async () => {
      // Test message count per session
    });
    
    it('should calculate user retention rate', async () => {
      // Test retention calculation
    });
    
    it('should calculate user churn rate', async () => {
      // Test churn calculation
    });
    
    it('should break down users by demographics', async () => {
      // Test demographic segmentation (age, location, device, income)
    });
    
    it('should use fallback values when no session data exists', async () => {
      // Test fallback to default values (450s duration, 8.5 messages)
    });
  });
  
  describe('getConversationQualityMetrics', () => {
    it('should calculate total conversations in date range', async () => {
      // Test conversation count
    });
    
    it('should calculate average confidence from audit_trail', async () => {
      // Test confidence aggregation
    });
    
    it('should calculate average satisfaction from user_feedback', async () => {
      // Test satisfaction score calculation
    });
    
    it('should calculate completion rate from conversation status', async () => {
      // Test completion vs abandonment
    });
    
    it('should calculate average turns per conversation', async () => {
      // Test message count per conversation
    });
    
    it('should calculate quality score (weighted average)', async () => {
      // Test: confidence*0.3 + satisfaction*0.3 + completion*0.25 + (100-abandonment)*0.15
    });
    
    it('should break down metrics by intent', async () => {
      // Test intent-specific performance
    });
  });
  
  describe('getPerformanceMetrics', () => {
    it('should calculate response time percentiles (P50, P95, P99)', async () => {
      // Test percentile calculations from performance_logs
    });
    
    it('should calculate average response time', async () => {
      // Test mean calculation
    });
    
    it('should calculate error rate from performance_logs', async () => {
      // Test error rate: failed requests / total requests
    });
    
    it('should calculate cache hit rate', async () => {
      // Test cache performance
    });
    
    it('should calculate throughput (requests per minute)', async () => {
      // Test request rate calculation
    });
    
    it('should calculate peak load (max requests per minute)', async () => {
      // Test peak load detection using time buckets
    });
    
    it('should return system uptime', async () => {
      // Test uptime metric (currently default 99.7%)
    });
    
    it('should return resource utilization (CPU, memory, storage)', async () => {
      // Test: Currently uses fallback values (42%, 68%, 55%)
      // TODO: Integrate actual system metrics collection
    });
  });
  
  describe('getEthicalAIMetrics', () => {
    it('should calculate bias detection rate', async () => {
      // Test: bias detections / total responses
    });
    
    it('should calculate bias correction rate', async () => {
      // Test: corrected biases / detected biases
    });
    
    it('should break down bias by demographic', async () => {
      // Test demographic-specific bias analysis
    });
    
    it('should break down bias by type', async () => {
      // Test bias category analysis
    });
    
    it('should calculate hallucination incident rate', async () => {
      // Test hallucination detection rate
    });
    
    it('should calculate average hallucination risk score', async () => {
      // Test risk score aggregation
    });
    
    it('should calculate handoff rate', async () => {
      // Test handoff frequency
    });
    
    it('should break down handoffs by reason', async () => {
      // Test handoff reason analysis
    });
    
    it('should calculate fairness score (equity across demographics)', async () => {
      // Test: 100 - (bias variance * 2)
    });
  });
  
  describe('getPredictiveAnalytics', () => {
    it('should forecast user growth trend (7d, 30d, 90d)', async () => {
      // Test Holt's exponential smoothing forecast
    });
    
    it('should forecast bias incidents trend', async () => {
      // Test trend prediction
    });
    
    it('should forecast hallucination risk trend', async () => {
      // Test risk prediction
    });
    
    it('should detect anomalies using Z-score method', async () => {
      // Test anomaly detection (threshold: 2.5 std dev)
    });
    
    it('should detect response time anomalies using IQR', async () => {
      // Test IQR-based outlier detection
    });
    
    it('should assess overall risk level', async () => {
      // Test risk assessment (low/medium/high/critical)
    });
    
    it('should generate optimization recommendations', async () => {
      // Test recommendation generation based on trends
    });
  });
});
```

### 1.2 Performance Optimization Service Tests

#### Test Case: `performance-optimization-service.test.ts`

**File**: `apps/backend/src/tests/performance-optimization-service.test.ts`

```typescript
describe('PerformanceOptimizationService', () => {
  describe('LRU Cache', () => {
    it('should store and retrieve cached values', () => {
      // Test basic cache operations
    });
    
    it('should evict least recently used entries when max size reached', () => {
      // Test LRU eviction policy
    });
    
    it('should evict entries when max memory exceeded', () => {
      // Test memory-based eviction
    });
    
    it('should expire entries after TTL', () => {
      // Test TTL expiration
    });
    
    it('should track hit and miss rates', () => {
      // Test cache statistics
    });
    
    it('should invalidate entries by pattern', () => {
      // Test pattern-based invalidation
    });
    
    it('should organize entries by category', () => {
      // Test category-based organization
    });
  });
  
  describe('cachedOperation', () => {
    it('should return cached result if available', async () => {
      // Test cache hit scenario
    });
    
    it('should execute operation and cache result on miss', async () => {
      // Test cache miss scenario
    });
    
    it('should track operation duration', async () => {
      // Test performance tracking
    });
    
    it('should handle operation errors gracefully', async () => {
      // Test error handling
    });
  });
  
  describe('getSlowQueries', () => {
    it('should identify queries with avg duration > 1000ms', async () => {
      // Test slow query detection
    });
    
    it('should provide optimization suggestions', async () => {
      // Test suggestion generation
    });
    
    it('should calculate cache hit rate per query', async () => {
      // Test query-level cache stats
    });
  });
  
  describe('getOptimizationRecommendations', () => {
    it('should recommend cache improvements when hit rate < 60%', async () => {
      // Test cache recommendation
    });
    
    it('should recommend query optimization when P95 > 800ms', async () => {
      // Test query recommendation
    });
    
    it('should recommend scaling when throughput > 80 req/min', async () => {
      // Test resource recommendation
    });
  });
});
```

### 1.3 Fact-Checking Service Tests

#### Test Case: `fact-checking-chromadb.test.ts`

**File**: `apps/backend/src/tests/fact-checking-chromadb.test.ts`

```typescript
describe('FactCheckingChromaDB', () => {
  describe('initializeVerifiedFacts', () => {
    it('should initialize 5 default facts on first startup', async () => {
      // Test fact initialization
    });
    
    it('should skip initialization if facts already exist', async () => {
      // Test idempotency
    });
    
    it('should generate embeddings for each fact', async () => {
      // Test embedding generation
    });
    
    it('should store facts with metadata (sources, lastVerified)', async () => {
      // Test metadata storage
    });
  });
  
  describe('addVerifiedFact', () => {
    it('should add a new verified fact to ChromaDB', async () => {
      // Test fact addition
    });
    
    it('should generate unique ID if not provided', async () => {
      // Test ID generation
    });
    
    it('should store sources as JSON array', async () => {
      // Test source storage
    });
  });
  
  describe('searchSimilarFacts', () => {
    it('should find similar facts using embedding similarity', async () => {
      // Test similarity search
    });
    
    it('should filter results by similarity threshold', async () => {
      // Test threshold filtering (default 0.7)
    });
    
    it('should return top K results (default 5)', async () => {
      // Test result limiting
    });
    
    it('should convert distance to similarity score', async () => {
      // Test: similarity = 1 - distance
    });
  });
});
```

### 1.4 Session Tracking Tests

#### Test Case: `session-tracking.test.ts`

**File**: `apps/backend/src/tests/session-tracking.test.ts`

```typescript
describe('SessionTracking', () => {
  describe('startSession', () => {
    it('should create a new session record in user_sessions table', async () => {
      // Test session creation
    });
    
    it('should detect device type from user agent', async () => {
      // Test device detection (mobile/tablet/desktop)
    });
    
    it('should store IP address', async () => {
      // Test IP tracking
    });
    
    it('should link session to user_id if authenticated', async () => {
      // Test user association
    });
    
    it('should allow anonymous sessions', async () => {
      // Test unauthenticated sessions
    });
  });
  
  describe('endSession', () => {
    it('should update session with end time', async () => {
      // Test session closure
    });
    
    it('should calculate duration_seconds', async () => {
      // Test duration calculation
    });
    
    it('should update message_count', async () => {
      // Test message count tracking
    });
  });
  
  describe('detectDeviceType', () => {
    it('should detect mobile devices', () => {
      // Test: 'Mobile', 'Android', 'iPhone' in user agent
    });
    
    it('should detect tablet devices', () => {
      // Test: 'iPad', 'Tablet' in user agent
    });
    
    it('should default to desktop for other devices', () => {
      // Test default case
    });
  });
});
```

### 1.5 Demographic Data Collection Tests

#### Test Case: `demographic-collection.test.ts`

**File**: `apps/backend/src/tests/demographic-collection.test.ts`

```typescript
describe('DemographicCollection', () => {
  describe('user registration with demographics', () => {
    it('should accept optional age_group during registration', async () => {
      // Test: 18-24, 25-34, 35-44, 45-54, 55-64, 65+
    });
    
    it('should accept optional income_level during registration', async () => {
      // Test: low, medium, high
    });
    
    it('should accept optional insurance_status during registration', async () => {
      // Test: insured, uninsured, partial
    });
    
    it('should store demographics in user_demographics table', async () => {
      // Test database storage
    });
    
    it('should allow registration without demographics', async () => {
      // Test optional fields
    });
  });
  
  describe('demographic survey', () => {
    it('should allow users to complete optional demographic survey', async () => {
      // Test survey submission
    });
    
    it('should update existing demographic data', async () => {
      // Test data updates
    });
    
    it('should validate age_group values', async () => {
      // Test validation
    });
    
    it('should validate income_level values', async () => {
      // Test validation
    });
  });
});
```

---

## 2. Performance Monitoring

### 2.1 System Metrics Collection Tests

#### Test Case: `system-metrics-collection.test.ts`

**File**: `apps/backend/src/tests/system-metrics-collection.test.ts`

```typescript
describe('SystemMetricsCollection', () => {
  describe('CPU Usage Collection', () => {
    it('should collect CPU usage percentage', async () => {
      // Test: Use os.cpus() to calculate CPU usage
      // Expected: Returns percentage (0-100)
    });
    
    it('should calculate average CPU usage across all cores', async () => {
      // Test multi-core CPU calculation
    });
    
    it('should handle CPU collection errors gracefully', async () => {
      // Test error handling
    });
  });
  
  describe('Memory Usage Collection', () => {
    it('should collect total system memory', async () => {
      // Test: os.totalmem()
    });
    
    it('should collect free system memory', async () => {
      // Test: os.freemem()
    });
    
    it('should calculate memory usage percentage', async () => {
      // Test: ((total - free) / total) * 100
    });
    
    it('should collect process memory usage', async () => {
      // Test: process.memoryUsage()
    });
  });
  
  describe('Storage Usage Collection', () => {
    it('should collect disk space usage', async () => {
      // Test: Use 'df' command or diskusage library
      // Expected: Returns total, used, available, percentage
    });
    
    it('should handle storage collection errors gracefully', async () => {
      // Test error handling
    });
  });
  
  describe('Metrics Aggregation', () => {
    it('should aggregate metrics over time windows', async () => {
      // Test: 1min, 5min, 15min averages
    });
    
    it('should store metrics in performance_logs table', async () => {
      // Test database storage
    });
    
    it('should update resourceUtilization in PerformanceMetrics', async () => {
      // Test integration with advanced-analytics service
    });
  });
});
```

### 2.2 Performance Monitoring Integration Tests

#### Test Case: `performance-monitoring-integration.test.ts`

**File**: `apps/backend/src/tests/performance-monitoring-integration.test.ts`

```typescript
describe('PerformanceMonitoringIntegration', () => {
  it('should collect CPU/memory/storage metrics on startup', async () => {
    // Test: Metrics collection starts automatically
  });
  
  it('should update metrics every 60 seconds', async () => {
    // Test: Periodic collection
  });
  
  it('should expose metrics via /api/admin/metrics endpoint', async () => {
    // Test: Admin API endpoint
  });
  
  it('should include system metrics in advanced analytics dashboard', async () => {
    // Test: Dashboard integration
  });
  
  it('should alert when CPU usage > 80%', async () => {
    // Test: Alerting threshold
  });
  
  it('should alert when memory usage > 85%', async () => {
    // Test: Alerting threshold
  });
  
  it('should alert when storage usage > 90%', async () => {
    // Test: Alerting threshold
  });
});
```

---

## 3. ChromaDB Fact Initialization

### 3.1 Fact Initialization Tests

#### Test Case: `chromadb-fact-initialization.test.ts`

**File**: `apps/backend/src/tests/chromadb-fact-initialization.test.ts`

```typescript
describe('ChromaDB Fact Initialization', () => {
  describe('initializeVerifiedFacts on startup', () => {
    it('should run initializeVerifiedFacts() on first server startup', async () => {
      // Test: Called in index.ts startup sequence
    });
    
    it('should initialize 5 default facts', async () => {
      // Test: debris_removal_deadline_la, debris_removal_deadline_pasadena,
      //       insurance_claim_time, permit_required_rebuild, financial_assistance_available
    });
    
    it('should skip initialization if facts already exist', async () => {
      // Test: Check collection.count() > 0
    });
    
    it('should handle ChromaDB connection errors gracefully', async () => {
      // Test: Error handling when ChromaDB unavailable
    });
  });
  
  describe('Admin Endpoint for Fact Management', () => {
    it('should provide GET /api/admin/facts endpoint to list all facts', async () => {
      // Test: Admin-only endpoint
    });
    
    it('should provide POST /api/admin/facts endpoint to add new facts', async () => {
      // Test: Add fact with sources
    });
    
    it('should provide PUT /api/admin/facts/:id endpoint to update facts', async () => {
      // Test: Update fact content or sources
    });
    
    it('should provide DELETE /api/admin/facts/:id endpoint to remove facts', async () => {
      // Test: Fact deletion
    });
    
    it('should require ADMIN role for fact management', async () => {
      // Test: Authorization check
    });
    
    it('should validate fact data before adding', async () => {
      // Test: Required fields (fact, sources)
    });
  });
});
```

### 3.2 Fact Verification Tests

#### Test Case: `fact-verification.test.ts`

**File**: `apps/backend/src/tests/fact-verification.test.ts`

```typescript
describe('Fact Verification', () => {
  it('should verify facts against ChromaDB during fact-checking', async () => {
    // Test: Integration with fact-checking.service.ts
  });
  
  it('should return high reliability for verified facts', async () => {
    // Test: Reliability scoring
  });
  
  it('should return low reliability for unverified claims', async () => {
    // Test: Unverified claim handling
  });
  
  it('should update lastVerified timestamp periodically', async () => {
    // Test: Fact freshness tracking
  });
});
```

---

## 4. Session Tracking Integration

### 4.1 Chat Route Session Tracking Tests

#### Test Case: `chat-route-session-tracking.test.ts`

**File**: `apps/backend/src/tests/chat-route-session-tracking.test.ts`

```typescript
describe('Chat Route Session Tracking', () => {
  describe('Session Start Tracking', () => {
    it('should create session on first message (isFirstMessage=true)', async () => {
      // Test: POST /api/chat with isFirstMessage=true
    });
    
    it('should detect device type from req.headers["user-agent"]', async () => {
      // Test: Device type detection
    });
    
    it('should store IP address from req.ip', async () => {
      // Test: IP tracking
    });
    
    it('should link session to conversation_id', async () => {
      // Test: Conversation association
    });
    
    it('should handle anonymous sessions (no user_id)', async () => {
      // Test: Unauthenticated session tracking
    });
  });
  
  describe('Session End Tracking', () => {
    it('should update session on conversation end', async () => {
      // Test: Session closure
    });
    
    it('should calculate duration_seconds on session end', async () => {
      // Test: Duration = ended_at - started_at
    });
    
    it('should update message_count during session', async () => {
      // Test: Increment message count per message
    });
    
    it('should handle session timeout (30 minutes inactivity)', async () => {
      // Test: Automatic session closure
    });
  });
  
  describe('Device Type Detection', () => {
    it('should detect mobile from user agent', () => {
      // Test: 'Mobile', 'Android', 'iPhone' patterns
    });
    
    it('should detect tablet from user agent', () => {
      // Test: 'iPad', 'Tablet' patterns
    });
    
    it('should default to desktop for other user agents', () => {
      // Test: Default case
    });
    
    it('should handle missing user agent gracefully', () => {
      // Test: Error handling
    });
  });
});
```

### 4.2 Session Analytics Tests

#### Test Case: `session-analytics.test.ts`

**File**: `apps/backend/src/tests/session-analytics.test.ts`

```typescript
describe('Session Analytics', () => {
  it('should calculate average session duration from user_sessions', async () => {
    // Test: Integration with advanced-analytics service
  });
  
  it('should calculate average messages per session', async () => {
    // Test: Message count aggregation
  });
  
  it('should break down sessions by device type', async () => {
    // Test: Device type analytics
  });
  
  it('should track session abandonment rate', async () => {
    // Test: Sessions without end_time
  });
});
```

---

## 5. Demographic Data Collection

### 5.1 User Registration with Demographics Tests

#### Test Case: `user-registration-demographics.test.ts`

**File**: `apps/backend/src/tests/user-registration-demographics.test.ts`

```typescript
describe('User Registration with Demographics', () => {
  describe('Registration Form Fields', () => {
    it('should accept age_group during registration', async () => {
      // Test: POST /api/auth/register with age_group
      // Values: '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
    });
    
    it('should accept income_level during registration', async () => {
      // Test: Values: 'low', 'medium', 'high'
    });
    
    it('should accept insurance_status during registration', async () => {
      // Test: Values: 'insured', 'uninsured', 'partial'
    });
    
    it('should accept location during registration', async () => {
      // Test: County/city name
    });
    
    it('should make all demographic fields optional', async () => {
      // Test: Registration without demographics
    });
    
    it('should validate age_group enum values', async () => {
      // Test: Reject invalid values
    });
    
    it('should validate income_level enum values', async () => {
      // Test: Reject invalid values
    });
    
    it('should store demographics in user_demographics table', async () => {
      // Test: Database storage
    });
  });
  
  describe('Demographic Survey', () => {
    it('should provide POST /api/user/demographics endpoint', async () => {
      // Test: Survey submission endpoint
    });
    
    it('should allow users to complete survey after registration', async () => {
      // Test: Post-registration survey
    });
    
    it('should update existing demographic data', async () => {
      // Test: Data updates
    });
    
    it('should allow partial survey completion', async () => {
      // Test: Optional fields
    });
    
    it('should require authentication for survey submission', async () => {
      // Test: Authorization
    });
  });
});
```

### 5.2 Demographic Analytics Tests

#### Test Case: `demographic-analytics.test.ts`

**File**: `apps/backend/src/tests/demographic-analytics.test.ts`

```typescript
describe('Demographic Analytics', () => {
  it('should break down users by age_group', async () => {
    // Test: Age group distribution
  });
  
  it('should break down users by income_level', async () => {
    // Test: Income distribution
  });
  
  it('should break down users by insurance_status', async () => {
    // Test: Insurance status distribution
  });
  
  it('should break down users by location', async () => {
    // Test: Geographic distribution
  });
  
  it('should use demographic data in bias analysis', async () => {
    // Test: Integration with bias-detection service
  });
  
  it('should use demographic data in fairness score calculation', async () => {
    // Test: Integration with ethical AI metrics
  });
});
```

---

## 6. Integration Tests

### 6.1 End-to-End Chat Flow with Session Tracking

#### Test Case: `chat-flow-integration.test.ts`

**File**: `apps/backend/src/tests/integration/chat-flow-integration.test.ts`

```typescript
describe('Chat Flow Integration', () => {
  it('should create session on first message and track throughout conversation', async () => {
    // Test: Full conversation flow with session tracking
    // 1. Send first message (isFirstMessage=true)
    // 2. Verify session created in user_sessions
    // 3. Send subsequent messages
    // 4. Verify message_count increments
    // 5. End conversation
    // 6. Verify session closed with duration
  });
  
  it('should track device type throughout session', async () => {
    // Test: Device type persistence
  });
  
  it('should link session to conversation_id', async () => {
    // Test: Conversation association
  });
  
  it('should update analytics events with session_id', async () => {
    // Test: Analytics integration
  });
});
```

### 6.2 Fact-Checking Integration

#### Test Case: `fact-checking-integration.test.ts`

**File**: `apps/backend/src/tests/integration/fact-checking-integration.test.ts`

```typescript
describe('Fact-Checking Integration', () => {
  it('should initialize facts on server startup', async () => {
    // Test: Startup sequence
  });
  
  it('should use ChromaDB facts during chat fact-checking', async () => {
    // Test: Integration with chat.ts fact-checking
  });
  
  it('should return verified status for facts in ChromaDB', async () => {
    // Test: Verification workflow
  });
});
```

### 6.3 Analytics Integration

#### Test Case: `analytics-integration.test.ts`

**File**: `apps/backend/src/tests/integration/analytics-integration.test.ts`

```typescript
describe('Analytics Integration', () => {
  it('should collect system metrics and include in performance analytics', async () => {
    // Test: CPU/memory/storage metrics in advanced analytics
  });
  
  it('should use session data in user analytics', async () => {
    // Test: Session metrics in getUserAnalytics
  });
  
  it('should use demographic data in user analytics', async () => {
    // Test: Demographic breakdown in analytics
  });
});
```

---

## 7. End-to-End Tests

### 7.1 Complete User Journey Test

#### Test Case: `user-journey-e2e.test.ts`

**File**: `apps/backend/src/tests/e2e/user-journey-e2e.test.ts`

```typescript
describe('Complete User Journey E2E', () => {
  it('should complete full user journey with all features', async () => {
    // 1. User registration with demographics
    // 2. User login
    // 3. Start chat session (session tracking)
    // 4. Send messages (analytics tracking)
    // 5. Receive responses (fact-checking, bias detection)
    // 6. Complete demographic survey
    // 7. View analytics dashboard
    // 8. End session
    // 9. Verify all data collected correctly
  });
});
```

### 7.2 Admin Workflow Test

#### Test Case: `admin-workflow-e2e.test.ts`

**File**: `apps/backend/src/tests/e2e/admin-workflow-e2e.test.ts`

```typescript
describe('Admin Workflow E2E', () => {
  it('should allow admin to manage verified facts', async () => {
    // 1. Admin login
    // 2. View facts list
    // 3. Add new fact
    // 4. Update existing fact
    // 5. Delete fact
    // 6. Verify changes in fact-checking
  });
  
  it('should allow admin to view system metrics', async () => {
    // 1. Admin login
    // 2. Access /api/admin/metrics
    // 3. Verify CPU/memory/storage metrics
    // 4. View performance analytics
  });
});
```

---

## Test Implementation Checklist

### Phase 1: Unit Tests (Priority: HIGH)
- [ ] Create `analytics-service.test.ts` with all test cases
- [ ] Create `advanced-analytics-service.test.ts` with all test cases
- [ ] Create `performance-optimization-service.test.ts` with all test cases
- [ ] Create `fact-checking-chromadb.test.ts` with all test cases
- [ ] Create `session-tracking.test.ts` with all test cases
- [ ] Create `demographic-collection.test.ts` with all test cases

### Phase 2: Performance Monitoring (Priority: HIGH)
- [ ] Implement CPU usage collection using `os.cpus()`
- [ ] Implement memory usage collection using `os.totalmem()` and `os.freemem()`
- [ ] Implement storage usage collection (use `df` command or library)
- [ ] Create `system-metrics-collection.test.ts`
- [ ] Integrate metrics collection into `performance-optimization.service.ts`
- [ ] Update `getPerformanceMetrics()` to use real system metrics
- [ ] Create admin endpoint `/api/admin/metrics` for system metrics
- [ ] Add alerting thresholds (CPU > 80%, Memory > 85%, Storage > 90%)

### Phase 3: ChromaDB Fact Initialization (Priority: MEDIUM)
- [ ] Add `initializeVerifiedFacts()` call in `index.ts` startup sequence
- [ ] Create admin endpoints for fact management:
  - [ ] `GET /api/admin/facts` - List all facts
  - [ ] `POST /api/admin/facts` - Add new fact
  - [ ] `PUT /api/admin/facts/:id` - Update fact
  - [ ] `DELETE /api/admin/facts/:id` - Delete fact
- [ ] Add authorization checks (require ADMIN role)
- [ ] Create `chromadb-fact-initialization.test.ts`
- [ ] Create `fact-verification.test.ts`

### Phase 4: Session Tracking Integration (Priority: HIGH)
- [ ] Add session start tracking in `chat.ts` route (on `isFirstMessage=true`)
- [ ] Implement device type detection from `req.headers["user-agent"]`
- [ ] Add session end tracking (on conversation close or timeout)
- [ ] Update `message_count` incrementally during session
- [ ] Calculate `duration_seconds` on session end
- [ ] Link sessions to `conversation_id`
- [ ] Create `chat-route-session-tracking.test.ts`
- [ ] Create `session-analytics.test.ts`

### Phase 5: Demographic Data Collection (Priority: MEDIUM)
- [ ] Add optional demographic fields to registration endpoint:
  - [ ] `age_group` (enum: 18-24, 25-34, 35-44, 45-54, 55-64, 65+)
  - [ ] `income_level` (enum: low, medium, high)
  - [ ] `insurance_status` (enum: insured, uninsured, partial)
- [ ] Create `POST /api/user/demographics` endpoint for survey
- [ ] Add validation for enum values
- [ ] Update frontend registration form to include demographic fields
- [ ] Create optional demographic survey component
- [ ] Create `user-registration-demographics.test.ts`
- [ ] Create `demographic-analytics.test.ts`

### Phase 6: Integration Tests (Priority: MEDIUM)
- [ ] Create `chat-flow-integration.test.ts`
- [ ] Create `fact-checking-integration.test.ts`
- [ ] Create `analytics-integration.test.ts`

### Phase 7: End-to-End Tests (Priority: LOW)
- [ ] Create `user-journey-e2e.test.ts`
- [ ] Create `admin-workflow-e2e.test.ts`

---

## Test Execution Instructions

### Running Unit Tests
```bash
cd apps/backend
npm test -- src/tests/analytics-service.test.ts
npm test -- src/tests/advanced-analytics-service.test.ts
npm test -- src/tests/performance-optimization-service.test.ts
npm test -- src/tests/fact-checking-chromadb.test.ts
npm test -- src/tests/session-tracking.test.ts
npm test -- src/tests/demographic-collection.test.ts
```

### Running Integration Tests
```bash
npm test -- src/tests/integration/
```

### Running E2E Tests
```bash
npm test -- src/tests/e2e/
```

### Running All Tests
```bash
npm test
```

---

## Notes

1. **Test Infrastructure**: The codebase already has a test suite infrastructure (`hallucination-testing.suite.ts`), but needs additional test files for the new features.

2. **Mocking**: Use appropriate mocking libraries (e.g., `jest.mock()`, `sinon`) for:
   - Database operations (Supabase)
   - ChromaDB operations
   - System metrics collection
   - External API calls

3. **Test Data**: Create test fixtures for:
   - Sample user sessions
   - Sample demographic data
   - Sample verified facts
   - Sample performance logs

4. **CI/CD Integration**: Ensure all tests run in CI/CD pipeline before deployment.

5. **Coverage Target**: Aim for 80%+ code coverage for new features.

---

**Document Version**: 1.0  
**Last Updated**: January 26, 2026  
**Author**: AI Assistant  
**Review Status**: Pending
