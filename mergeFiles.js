const fs = require('fs');
const path = require('path');

// Directory to scan
const folderPath = './packages/javascript-sdk'; // Change this to your folder path
const outputFilePrefix = 'usermaven-js'; // Prefix for the output files
const maxFileSize = 1024 * 1024 * 1; // 5MB per file (adjust the size if needed)

// Folders and files to ignore
const ignoreList = [
  'node_modules', // Folder name
  '.git', // Another folder name
  'ignore.txt', // Specific file name
  '.log', // Extension (any file with .log extension)
  '.idea',
  'LICENSE',
  'output.txt',
  'mergeFiles.js',
  '.github',
  'dist',
  '__test__',
  '.husky',
  'yarn.lock',
  'package-lock.json',
];

// Function to check if a file/folder should be ignored
function shouldIgnore(filePath) {
  return ignoreList.some((ignorePattern) => {
    return filePath.includes(ignorePattern) || filePath.endsWith(ignorePattern);
  });
}

// Helper function to generate a folder structure tree
function generateFolderStructure(dir, indent = '') {
  let structure = '';

  const files = fs.readdirSync(dir);

  files.forEach((file, index) => {
    const filePath = path.join(dir, file);
    const isLast = index === files.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const relativeFilePath = path.relative('.', filePath);

    if (shouldIgnore(filePath)) {
      console.log(`Ignoring: ${relativeFilePath}`);
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      structure += `${indent}${prefix}${file}/\n`;
      const newIndent = indent + (isLast ? '    ' : '│   ');
      structure += generateFolderStructure(filePath, newIndent);
    } else {
      structure += `${indent}${prefix}${file}\n`;
    }
  });

  return structure;
}

// Recursive function to read all files in a directory and its subdirectories
function readDirectoryRecursive(dir, outputContent = '') {
  const files = fs.readdirSync(dir);

  // Prioritize README.md
  const readmeIndex = files.indexOf('README.md');
  if (readmeIndex !== -1) {
    const readmePath = path.join(dir, 'README.md');
    const relativeFilePath = path.relative('.', readmePath);
    console.log(`Processing README.md: ${relativeFilePath}`);
    const fileContent = fs.readFileSync(readmePath, 'utf8');
    outputContent += `${relativeFilePath}\n`;
    outputContent += `<->\n${fileContent}\n</->\n\n`;

    // Remove README.md from files list so it's not processed again
    files.splice(readmeIndex, 1);
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativeFilePath = path.relative('.', filePath);

    if (shouldIgnore(filePath)) {
      console.log(`Ignoring: ${relativeFilePath}`);
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      outputContent = readDirectoryRecursive(filePath, outputContent);
    } else if (fs.statSync(filePath).isFile()) {
      console.log(`Processing file: ${relativeFilePath}`);
      const fileContent = fs.readFileSync(filePath, 'utf8');

      outputContent += `${relativeFilePath}\n`;
      outputContent += `<->\n${fileContent}\n</->\n\n`;
    }
  });

  return outputContent;
}

// Function to write content to multiple files in chunks
function writeInChunks(content, outputPathPrefix, maxFileSize) {
  let currentFileIndex = 1;
  let currentFileContent = '';
  let currentFileSize = 0;

  const writeToFile = () => {
    const outputPath = `${outputPathPrefix}_${currentFileIndex}.txt`;
    fs.writeFileSync(outputPath, currentFileContent, 'utf8');
    console.log(`Content written to ${outputPath}`);
  };

  content.split('\n').forEach((line) => {
    const lineSize = Buffer.byteLength(line, 'utf8');
    if (currentFileSize + lineSize > maxFileSize) {
      writeToFile(); // Write current chunk to a new file
      currentFileIndex += 1;
      currentFileContent = ''; // Reset content for the next file
      currentFileSize = 0; // Reset file size counter
    }

    currentFileContent += line + '\n';
    currentFileSize += lineSize;
  });

  if (currentFileContent) {
    writeToFile(); // Write any remaining content
  }
}

// Main function to process the directory and write the output file
function processDirectoryAndWriteOutput(dir, outputPathPrefix, maxFileSize) {
  console.log('Starting to process directory...');

  // Step 1: Generate folder structure
  console.log('Generating folder structure...');
  const folderStructure = generateFolderStructure(dir);

  // Step 2: Recursively read the directory and get the formatted content
  console.log('Reading files and gathering content...');
  let fileContent = '';
  fileContent = readDirectoryRecursive(dir, fileContent);

  // Step 3: Combine folder structure and file content
  const finalOutput = `Folder/File Structure:\n\n${folderStructure}\n\n${fileContent}`;

  // Step 4: Write the combined output in chunks
  console.log(`Writing content to files with prefix ${outputPathPrefix}`);
  writeInChunks(finalOutput, outputPathPrefix, maxFileSize);
}

// Run the function
processDirectoryAndWriteOutput(folderPath, outputFilePrefix, maxFileSize);
