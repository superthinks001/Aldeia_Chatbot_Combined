# ChromaDB API Access Guide

## Quick Browser Access

Open these URLs directly in your browser:

### 1. Health Check
```
http://localhost:8000/api/v2/heartbeat
```
Expected: `{"nanosecond heartbeat": <timestamp>}`

### 2. Root Endpoint
```
http://localhost:8000/api/v2/
```
Shows API version info

## Using API Testing Tools (Bruno/Insomnia/Postman)

ChromaDB v2 API requires specific tenant/database format for collection operations.

### Collection Format
Collections use the format: `tenant:database:collection_name`
- Default tenant: `default_tenant`
- Default database: `default_database`
- Your collection: `fire_recovery_chunks`

Full path: `default_tenant:default_database:fire_recovery_chunks`

## Recommended Approach: Use Node.js Client

Since the REST API v2 is complex, it's easier to interact with ChromaDB using the Node.js client:

### Quick Query Script

A ready-to-use query script is available at `apps/backend/src/scripts/query_chromadb.js`.

To create your own custom query script, create a file `query_chromadb.js`:

```javascript
const { ChromaClient } = require('chromadb');

async function query() {
  const client = new ChromaClient();
  const collection = await client.getCollection({ name: 'fire_recovery_chunks' });

  // Get collection info
  const count = await collection.count();
  console.log('Total documents:', count);

  // Query with text
  const results = await collection.query({
    queryTexts: ["How do I apply for debris removal?"],
    nResults: 3
  });

  console.log('\nTop 3 results:');
  results.documents[0].forEach((doc, i) => {
    console.log(`\n${i + 1}. ${doc.substring(0, 200)}...`);
    console.log(`   Source: ${results.metadatas[0][i].source}`);
    console.log(`   Distance: ${results.distances[0][i]}`);
  });

  // Get sample documents
  const peek = await collection.peek({ limit: 5 });
  console.log('\nFirst 5 documents:');
  peek.documents.forEach((doc, i) => {
    console.log(`\n${i + 1}. ${doc.substring(0, 150)}...`);
  });
}

query().catch(console.error);
```

Run with:
```bash
cd apps/backend
node --no-deprecation src/scripts/query_chromadb.js
```

### Common Operations

#### 1. Count Documents
```javascript
const collection = await client.getCollection({ name: 'fire_recovery_chunks' });
const count = await collection.count();
```

#### 2. Semantic Search
```javascript
const results = await collection.query({
  queryTexts: ["debris removal permit"],
  nResults: 5
});
```

#### 3. Get Documents by ID
```javascript
const docs = await collection.get({
  ids: ["1176746_RightofEntryFormFAQs.pdf_0"]
});
```

#### 4. Peek at Documents
```javascript
const sample = await collection.peek({ limit: 10 });
```

#### 5. Search with Filters
```javascript
const results = await collection.query({
  queryTexts: ["hazardous materials"],
  nResults: 5,
  where: { source: "1176747_Phase1HazardousDebrisRemovalbyUSEnvironmentalProtectionAgencyFAQs.pdf" }
});
```

## Alternative: Docker Exec

You can also use Docker to run Python commands inside the ChromaDB container:

```bash
docker exec -it aldeia-chromadb-dev python3 -c "
import chromadb
client = chromadb.Client()
collection = client.get_collection('fire_recovery_chunks')
print('Count:', collection.count())
"
```

## Web UI Option

ChromaDB doesn't have a built-in web UI, but you can:

1. Use **Chroma Studio** (if available for your version)
2. Install **chromadb-admin** (third-party tool)
3. Use the Node.js client scripts (recommended)

## Testing Your Setup

Create `test_chromadb.js`:

```javascript
const { ChromaClient } = require('chromadb');

async function test() {
  try {
    const client = new ChromaClient();
    console.log('✅ Connected to ChromaDB');

    const collection = await client.getCollection({ name: 'fire_recovery_chunks' });
    console.log('✅ Collection found:', collection.name);

    const count = await collection.count();
    console.log('✅ Total documents:', count);

    const sample = await collection.peek({ limit: 1 });
    console.log('✅ Sample document:', sample.documents[0].substring(0, 100));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
```

## ChromaDB Client Reference

The JavaScript client provides these main methods:

- `heartbeat()` - Check connection
- `listCollections()` - List all collections
- `getCollection({ name })` - Get a collection
- `getOrCreateCollection({ name })` - Get or create
- `deleteCollection({ name })` - Delete collection

Collection methods:
- `count()` - Get document count
- `query({ queryTexts, nResults })` - Semantic search
- `get({ ids })` - Get by IDs
- `peek({ limit })` - Get first N documents
- `add({ documents, embeddings, metadatas, ids })` - Add documents
- `delete({ ids })` - Delete documents

## Your Collection Details

- **Name**: `fire_recovery_chunks`
- **Documents**: 169 chunks
- **Sources**: 20 PDF files about LA/Pasadena County fire recovery
- **Metadata**: Each chunk has `source` (filename) and `chunk_index`
- **Embedding Model**: Xenova/all-MiniLM-L6-v2 (384 dimensions)

## Sample Query URLs

While the REST API is complex, here are the working endpoints:

```
GET  http://localhost:8000/api/v2/heartbeat
GET  http://localhost:8000/api/v2/
```

For collection operations, use the Node.js client instead of raw REST API calls.
