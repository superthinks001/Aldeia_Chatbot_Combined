"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllPDFs = findAllPDFs;
exports.extractTextFromPDF = extractTextFromPDF;
exports.reindexAllDocuments = reindexAllDocuments;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const chromadb_1 = require("chromadb");
// Use the workspace root (two levels up from backend/src)
const workspaceRoot = path_1.default.resolve(__dirname, '../../../');
const laCountyDir = path_1.default.join(workspaceRoot, "apps/chatbot-frontend/public/LA County");
const pasadenaCountyDir = path_1.default.join(workspaceRoot, "apps/chatbot-frontend/public/Pasadena County");
function findAllPDFs(dir) {
    let results = [];
    const list = fs_1.default.readdirSync(dir);
    for (const file of list) {
        const filePath = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findAllPDFs(filePath));
        }
        else if (file.toLowerCase().endsWith('.pdf')) {
            results.push(filePath);
        }
    }
    return results;
}
async function extractTextFromPDF(pdfPath) {
    const dataBuffer = fs_1.default.readFileSync(pdfPath);
    const data = await (0, pdf_parse_1.default)(dataBuffer);
    return data.text;
}
function chunkByParagraph(text) {
    // Split on two or more newlines, trim, and filter out empty chunks
    return text.split(/\n{2,}/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
}
async function reindexAllDocuments() {
    // Dynamically import @xenova/transformers to handle ES module
    const { pipeline } = await Promise.resolve().then(() => __importStar(require('@xenova/transformers')));
    // Initialize MiniLM embedding pipeline
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    // Initialize ChromaDB client and collection
    const chromaClient = new chromadb_1.ChromaClient();
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
                    ids: [`${path_1.default.basename(file)}_${i}`],
                    embeddings: [embedding],
                    documents: [chunk],
                    metadatas: [{ source: path_1.default.basename(file), chunk_index: i }]
                });
                // Save a sample for review
                if (sampleData.length < 5) {
                    sampleData.push({
                        source: path_1.default.basename(file),
                        chunk_index: i,
                        text: chunk.slice(0, 300),
                        embedding: embedding.slice(0, 5) // Only show first 5 dims for brevity
                    });
                }
            }
        }
        catch (err) {
            errors.push({ file, error: err instanceof Error ? err.message : String(err) });
        }
    }
    // Save sample data to disk
    fs_1.default.writeFileSync(path_1.default.join(__dirname, '../embedding_sample.json'), JSON.stringify(sampleData, null, 2));
    return {
        numFiles: allPDFs.length,
        totalChunks,
        errors
    };
}
