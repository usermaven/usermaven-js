#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively traverse the directory and collect all file paths.
 * Usage: node copyContents.js ./myFolder ./output.txt
 *
 *
 * @param {string} dir - The directory to traverse.
 * @param {string[]} fileList - Accumulator for file paths.
 * @returns {Promise<string[]>} - Array of file paths.
 */
async function traverseDirectory(dir, fileList = []) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await traverseDirectory(fullPath, fileList);
            } else if (entry.isFile()) {
                fileList.push(fullPath);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dir}:`, err.message);
    }
    return fileList;
}

/**
 * Main function to execute the script.
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node copyContents.js <input_folder_path> <output_file_path>');
        process.exit(1);
    }

    const [inputFolder, outputFile] = args;

    // Check if input folder exists
    try {
        const stat = await fs.stat(inputFolder);
        if (!stat.isDirectory()) {
            console.error(`The path "${inputFolder}" is not a directory.`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`Error accessing input folder "${inputFolder}":`, err.message);
        process.exit(1);
    }

    // Traverse the directory and get all file paths
    const files = await traverseDirectory(inputFolder);

    if (files.length === 0) {
        console.log('No files found in the specified directory.');
        process.exit(0);
    }

    // Prepare the output content
    let outputContent = '';

    for (const filePath of files) {
        // Get the relative path from the input folder
        const relativePath = path.relative(inputFolder, filePath);
        outputContent += `/${relativePath}\n\n`;

        try {
            const data = await fs.readFile(filePath, 'utf8');
            outputContent += `${data}\n\n`;
        } catch (err) {
            console.error(`Error reading file "${filePath}":`, err.message);
            outputContent += `[Error reading file: ${err.message}]\n\n`;
        }
    }

    // Write the output to the specified output file
    try {
        await fs.writeFile(outputFile, outputContent, 'utf8');
        console.log(`Content successfully copied to "${outputFile}".`);
    } catch (err) {
        console.error(`Error writing to output file "${outputFile}":`, err.message);
    }
}

// Execute the main function
main();
