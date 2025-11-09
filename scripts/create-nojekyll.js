import { writeFileSync } from 'fs';
import { join } from 'path';

// Create .nojekyll file in docs directory for GitHub Pages
const nojekyllPath = join(process.cwd(), 'docs', '.nojekyll');
writeFileSync(nojekyllPath, '');
console.log('Created .nojekyll file in docs/');

