import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to update import paths for relative imports
function updateImportPaths(dir) {
  readdirSync(dir).forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      updateImportPaths(filePath);
    } else if (filePath.endsWith('.js')) {
      let content = readFileSync(filePath, 'utf8');
      
      // Log the original content for debugging
      console.log(`Processing file: ${filePath}`);
      console.log('Original content:', content);

      // Update relative import paths starting with '../' or './' to include .js extension
      let updatedContent = content
        .replace(/import\s+(\*?\s*(?:[\w\s,{}]+))\s+from\s+['"](\.\.\/[^'"]+)(?!\.js)['"]/g, (match, p1, p2) => {
          const newPath = `${p2}.js`;
          console.log(`Updating import from ${p2} to ${newPath}`);
          return `import ${p1} from '${newPath}'`;
        })
        .replace(/require\(['"](\.\.\/[^'"]+)(?!\.js)['"]\)/g, (match, p1) => {
          const newPath = `${p1}.js`;
          console.log(`Updating require from ${p1} to ${newPath}`);
          return `require('${newPath}')`;
        });

      // Also handle the case for imports starting with './'
      updatedContent = updatedContent
        .replace(/import\s+(\*?\s*(?:[\w\s,{}]+))\s+from\s+['"](\.\/[^'"]+)(?!\.js)['"]/g, (match, p1, p2) => {
          const newPath = `${p2}.js`;
          console.log(`Updating import from ${p2} to ${newPath}`);
          return `import ${p1} from '${newPath}'`;
        })
        .replace(/require\(['"](\.\/[^'"]+)(?!\.js)['"]\)/g, (match, p1) => {
          const newPath = `${p1}.js`;
          console.log(`Updating require from ${p1} to ${newPath}`);
          return `require('${newPath}')`;
        });

      // Write the updated content back to the file
      if (content !== updatedContent) {
        console.log('Updated content:', updatedContent);
        writeFileSync(filePath, updatedContent, 'utf8');
      }
    }
  });
}

// Run the function on the 'dist' directory
const distDir = 'dist'; // Adjust if your output directory is named differently
updateImportPaths(distDir);
