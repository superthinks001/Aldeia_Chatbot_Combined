const { ChromaClient } = require('chromadb');

async function query() {
  try {
    const client = new ChromaClient();
    console.log('✅ Connected to ChromaDB\n');

    // Load the same embedding model used during ingestion
    console.log('Loading embedding model...');
    const { pipeline } = await import('@xenova/transformers');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Model loaded\n');

    const collection = await client.getCollection({ name: 'fire_recovery_chunks' });

    // Get collection info
    const count = await collection.count();
    console.log('📊 Collection Info:');
    console.log(`   Name: ${collection.name}`);
    console.log(`   Total documents: ${count}\n`);

    // Query with text - generate embedding first
    const queryText = "How do I apply for debris removal?";
    console.log(`🔍 Searching for: "${queryText}"\n`);

    const embeddingTensor = await embedder(queryText, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(embeddingTensor.data);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 3
    });

    console.log('Top 3 results:');
    results.documents[0].forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.substring(0, 200)}...`);
      console.log(`   Source: ${results.metadatas[0][i].source}`);
      console.log(`   Chunk: ${results.metadatas[0][i].chunk_index}`);
      console.log(`   Similarity: ${(1 - results.distances[0][i]).toFixed(4)}`);
    });

    // Get sample documents
    console.log('\n\n📄 Sample documents from collection:');
    const peek = await collection.peek({ limit: 3 });
    peek.documents.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.substring(0, 150)}...`);
      console.log(`   Source: ${peek.metadatas[i].source}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

query();
