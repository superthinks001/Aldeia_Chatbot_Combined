import { reindexAllDocuments } from '../document_ingest';

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
