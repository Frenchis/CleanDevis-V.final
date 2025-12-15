
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../src/data/changelog.json');

try {
    console.log('Generating changelog from git history...');

    // Fetch git log in JSON-like format
    // We use a custom separator ~|~ to avoid issues with quotes in messages
    const logOutput = execSync(
        'git log --date=iso --pretty=format:"%h~|~%ad~|~%an~|~%s"'
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
