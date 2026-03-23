/**
 * Fact-Checking Service - ChromaDB Integration
 * 
 * Manages verified facts in ChromaDB vector database for embedding-based similarity search
 */

import { ChromaClient } from 'chromadb';

let chromaClient: ChromaClient | null = null;
let factCollection: any = null;
let embedder: any = null;
let pipelineFn: any = null;

// Dynamically import @xenova/transformers (ESM module)
// Use Function constructor to prevent TypeScript from converting to require()
async function getTransformers() {
  if (!pipelineFn) {
    const transformers = await (new Function('return import("@xenova/transformers")'))();
    pipelineFn = transformers.pipeline;
  }
  return pipelineFn;
}

// Initialize ChromaDB client and collection
async function initializeChromaDB() {
  if (chromaClient && factCollection && embedder) {
    return { chromaClient, factCollection, embedder };
  }

  // Configure ChromaDB client with host and auth from environment
  const chromaHost = process.env.CHROMA_HOST || 'localhost';
  const chromaPort = process.env.CHROMA_PORT || '8000';
  const chromaAuthToken = process.env.CHROMA_AUTH_TOKEN;

  chromaClient = new ChromaClient({
    path: `http://${chromaHost}:${chromaPort}`,
    auth: chromaAuthToken ? {
      provider: 'token',
      credentials: chromaAuthToken
    } : undefined
  });

  // Initialize embedding model using dynamic import
  const pipeline = await getTransformers();
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Get or create collection for verified facts
  factCollection = await chromaClient.getOrCreateCollection({
    name: 'verified_facts',
    metadata: { description: 'Verified facts for fact-checking with embeddings' },
    embeddingFunction: {
      generate: async (_docs: string[]) => { throw new Error('embeddingFunction should not be called'); }
    }
  });

  return { chromaClient, factCollection, embedder };
}

/**
 * Initialize verified facts in ChromaDB
 * This should be called once to migrate existing facts
 */
export async function initializeVerifiedFacts(): Promise<void> {
  const { factCollection, embedder } = await initializeChromaDB();

  // Check if collection already has facts
  const existingCount = await factCollection.count();
  if (existingCount > 0) {
    console.log(`[FACT-CHECKING] ChromaDB already has ${existingCount} verified facts`);
    return;
  }

  // Initial verified facts to migrate
  const initialFacts = [
    {
      id: 'debris_removal_deadline_la',
      fact: 'LA County debris removal opt-out deadline is May 15, 2025',
      sources: ['LA County Fire Recovery'],
      lastVerified: '2025-01-01'
    },
    {
      id: 'debris_removal_deadline_pasadena',
      fact: 'Pasadena debris removal deadline is April 30, 2025',
      sources: ['Pasadena Fire Recovery'],
      lastVerified: '2025-01-01'
    },
    {
      id: 'insurance_claim_time',
      fact: 'Insurance claims should be filed as soon as possible, but most policies allow 1-2 years',
      sources: ['FEMA', 'Red Cross'],
      lastVerified: '2025-01-01'
    },
    {
      id: 'permit_required_rebuild',
      fact: 'Building permits are required for all reconstruction work',
      sources: ['LA County Fire Recovery', 'Pasadena Fire Recovery'],
      lastVerified: '2025-01-01'
    },
    {
      id: 'financial_assistance_available',
      fact: 'FEMA Individual Assistance and California Disaster Assistance programs are available',
      sources: ['FEMA', 'LA County Fire Recovery'],
      lastVerified: '2025-01-01'
    }
  ];

  console.log(`[FACT-CHECKING] Initializing ${initialFacts.length} verified facts in ChromaDB...`);

  for (const factData of initialFacts) {
    try {
      // Generate embedding for the fact
      const embeddingTensor = await embedder(factData.fact, { pooling: 'mean', normalize: true });
      const embedding = Array.from(embeddingTensor.data) as number[];

      // Store in ChromaDB
      await factCollection.add({
        ids: [factData.id],
        embeddings: [embedding],
        documents: [factData.fact],
        metadatas: [{
          sources: JSON.stringify(factData.sources),
          lastVerified: factData.lastVerified
        }]
      });
    } catch (error) {
      console.error(`[FACT-CHECKING] Error initializing fact ${factData.id}:`, error);
    }
  }

  console.log(`[FACT-CHECKING] Successfully initialized ${initialFacts.length} verified facts`);
}

/**
 * Add a new verified fact to ChromaDB
 */
export async function addVerifiedFact(fact: string, sources: string[], factId?: string): Promise<void> {
  const { factCollection, embedder } = await initializeChromaDB();

  const id = factId || `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate embedding
  const embeddingTensor = await embedder(fact, { pooling: 'mean', normalize: true });
  const embedding = Array.from(embeddingTensor.data) as number[];

  // Store in ChromaDB
  await factCollection.add({
    ids: [id],
    embeddings: [embedding],
    documents: [fact],
    metadatas: [{
      sources: JSON.stringify(sources),
      lastVerified: new Date().toISOString()
    }]
  });
}

/**
 * Search for similar facts in ChromaDB using embedding similarity
 */
export async function searchSimilarFacts(claim: string, topK: number = 5, threshold: number = 0.7): Promise<Array<{
  id: string;
  fact: string;
  sources: string[];
  similarity: number;
  lastVerified: string;
}>> {
  const { factCollection, embedder } = await initializeChromaDB();

  // Generate embedding for the claim
  const embeddingTensor = await embedder(claim, { pooling: 'mean', normalize: true });
  const embedding = Array.from(embeddingTensor.data) as number[];

  // Query ChromaDB for similar facts
  const results = await factCollection.query({
    queryEmbeddings: [embedding],
    nResults: topK
  });

  // Format results
  const similarFacts: Array<{
    id: string;
    fact: string;
    sources: string[];
    similarity: number;
    lastVerified: string;
  }> = [];

  if (results.ids && results.ids[0]) {
    for (let i = 0; i < results.ids[0].length; i++) {
      const id = results.ids[0][i];
      const fact = results.documents[0][i];
      const metadata = results.metadatas[0][i];
      const distance = results.distances?.[0]?.[i] || 0;
      
      // Convert distance to similarity (1 - distance, since ChromaDB uses cosine distance)
      const similarity = 1 - distance;

      if (similarity >= threshold) {
        similarFacts.push({
          id,
          fact,
          sources: JSON.parse(metadata.sources || '[]'),
          similarity,
          lastVerified: metadata.lastVerified || ''
        });
      }
    }
  }

  return similarFacts;
}
