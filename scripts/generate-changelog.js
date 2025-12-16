
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../src/data/changelog.json');

try {
    console.log('Generating changelog from git history...');

    // Attempt to deepen the clone to get more history (fix for Vercel shallow clone)
    try {
        const gitDir = path.join(__dirname, '../.git');
        if (fs.existsSync(gitDir)) {
            const isShallow = fs.existsSync(path.join(gitDir, 'shallow'));
            if (isShallow) {
                console.log('Shallow clone detected. Attempting to unshallow...');
                try {
                    execSync('git fetch --unshallow', { stdio: 'inherit' });
                } catch (e) {
                    console.log('Unshallow failed (maybe already unshallow?), trying fetch --depth=100...');
                    execSync('git fetch --depth=100', { stdio: 'inherit' });
                }
            }
        }
    } catch (e) {
        console.warn('Could not fetch more history:', e.message);
    }

    // Fetch git log in JSON-like format
    // We use a custom separator ~|~ to avoid issues with quotes in messages
    // Using iso-strict to ensure valid parsing by new Date() in all browsers/environments
    const logOutput = execSync(
        'git log --date=iso-strict --pretty=format:"%h~|~%ad~|~%an~|~%s"'
    ).toString();

    const entries = logOutput
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [hash, date, author, message] = line.split('~|~');
            return {
                hash,
                date,
                author,
                message
            };
        });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
    console.log(`✅ Changelog generated with ${entries.length} commits.`);

} catch (error) {
    console.error('❌ Error generating changelog:', error);
    // Fallback: If git fails (e.g. no .git repo), try to keep existing or write empty
    if (!fs.existsSync(OUTPUT_FILE)) {
        fs.writeFileSync(OUTPUT_FILE, '[]');
    }
}
