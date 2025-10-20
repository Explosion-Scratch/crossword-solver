#!/usr/bin/env node

/**
 * Download script for CrosswordQA datasets from Hugging Face
 * 
 * This script downloads either train.csv or valid.csv from the CrosswordQA dataset.
 * Usage: node download-dataset.js [train.csv|valid.csv]
 */

import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dataset URLs
const DATASET_URLS = {
  'train.csv': 'https://huggingface.co/datasets/albertxu/CrosswordQA/resolve/main/train.csv?download=true',
  'valid.csv': 'https://huggingface.co/datasets/albertxu/CrosswordQA/resolve/main/valid.csv?download=true'
};

// Parse command line arguments
const args = process.argv.slice(2);
const requestedFile = args[0];

if (args.includes('--help') || args.includes('-h') || !requestedFile) {
  console.log(`
Usage: node download-dataset.js [train.csv|valid.csv]

Downloads CrosswordQA dataset files from Hugging Face.

Arguments:
  train.csv    Download the training dataset
  valid.csv    Download the validation dataset

Examples:
  node download-dataset.js train.csv
  node download-dataset.js valid.csv
  node download-dataset.js train.csv --output my-train.csv
`);
  process.exit(0);
}

// Validate the requested file
if (!DATASET_URLS[requestedFile]) {
  console.error(`❌ Invalid file: ${requestedFile}`);
  console.error('Valid options are: train.csv, valid.csv');
  process.exit(1);
}

// Parse optional output argument
let outputFile = requestedFile;
const outputIndex = args.indexOf('--output');
if (outputIndex !== -1 && args[outputIndex + 1]) {
  outputFile = args[outputIndex + 1];
}

/**
 * Download file from URL
 */
async function downloadFile(url, outputPath) {
  console.log(`📥 Downloading ${requestedFile}...`);
  console.log(`URL: ${url}`);
  console.log(`Output: ${outputPath}`);

  return new Promise((resolve, reject) => {
    const fileStream = createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          if (redirectResponse.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${redirectResponse.statusCode}`));
            return;
          }
          
          redirectResponse.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            console.log('✅ Download completed successfully!');
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('✅ Download completed successfully!');
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('📥 CrosswordQA Dataset Downloader');
    console.log('==================================');
    
    const url = DATASET_URLS[requestedFile];
    await downloadFile(url, outputFile);
    
    console.log(`✅ Successfully downloaded to: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    console.log('\n💡 Suggestions:');
    console.log('1. Ensure you have internet access');
    console.log('2. Check if the CrosswordQA dataset is available');
    console.log('3. Try again later if Hugging Face is experiencing issues');
    
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { downloadFile };