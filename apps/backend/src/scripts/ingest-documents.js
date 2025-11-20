const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { ChromaClient } = require('chromadb');

// Use the workspace root (three levels up from backend/src/scripts)
const workspaceRoot = path.resolve(__dirname, '../../../..');
const laCountyDir = path.join(workspaceRoot, "apps/chatbot-frontend/public/LA County");
const pasadenaCountyDir = path.join(workspaceRoot, "apps/chatbot-frontend/public/Pasadena County");

function findAllPDFs(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findAllPDFs(filePath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(filePath);
    }
  }
  return results;
}

async function extractTextFromPDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

function chunkByParagraph(text) {
  // Split on two or more newlines, trim, and filter out empty chunks
  return text.split(/\n{2,}/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
}

async function reindexAllDocuments() {
  // Dynamically import @xenova/transformers to handle ES module
  const { pipeline } = await import('@xenova/transformers');

  // Initialize MiniLM embedding pipeline
  console.log('Loading embedding model...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ Model loaded\n');

  // Initialize ChromaDB client and collection
  const chromaClient = new ChromaClient();
  const collection = await chromaClient.getOrCreateCollection({
    name: 'fire_recovery_chunks',
    metadata: { description: 'Paragraph chunks from LA/Pasadena County fire recovery PDFs' },
    embeddingFunction: {
      generate: async (_docs) => { throw new Error('embeddingFunction should not be called'); }
    }
  });

  const allPDFs = [
    ...findAllPDFs(laCountyDir),
    ...findAllPDFs(pasadenaCountyDir)
  ];

  let sampleData = [];
  let totalChunks = 0;
  let errors = [];

  for (const file of allPDFs) {
    try {
      console.log(`Processing: ${path.basename(file)}`);
      const text = await extractTextFromPDF(file);
      const chunks = chunkByParagraph(text);
      totalChunks += chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        // Generate embedding
        const embeddingTensor = await embedder(chunk, { pooling: 'mean', normalize: true });
        const embedding = Array.from(embeddingTensor.data); // Convert Float32Array to number[]

        // Store in ChromaDB
        await collection.add({
          ids: [`${path.basename(file)}_${i}`],
          embeddings: [embedding],
          documents: [chunk],
          metadatas: [{ source: path.basename(file), chunk_index: i }]
        });

        // Save a sample for review
        if (sampleData.length < 5) {
          sampleData.push({
            source: path.basename(file),
            chunk_index: i,
            text: chunk.slice(0, 300),
            embedding: embedding.slice(0, 5) // Only show first 5 dims for brevity
          });
        }
      }
      console.log(`  ✓ ${chunks.length} chunks processed`);
    } catch (err) {
      errors.push({ file, error: err.message });
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  // Save sample data to disk
  fs.writeFileSync(
    path.join(__dirname, '../../embedding_sample.json'),
    JSON.stringify(sampleData, null, 2)
  );

  return {
    numFiles: allPDFs.length,
    totalChunks,
    errors
  };
}

async function main() {
  console.log('🚀 Starting document ingestion...');
  console.log('This will process 20 PDFs and may take several minutes...\n');

  try {
    const result = await reindexAllDocuments();
    console.log('\n✅ Document ingestion completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Files processed: ${result.numFiles}`);
    console.log(`   - Total chunks: ${result.totalChunks}`);
    console.log(`   - Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach(err => console.log(`   - ${err.file}: ${err.error}`));
    }
  } catch (error) {
    console.error('\n❌ Document ingestion failed:', error);
    process.exit(1);
  }
}

main();
