const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let found = false;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  // Look for { someObject } where someObject is not a known string/number
  // Since we can't perfectly parse, let's look for common mistakes like {currentUser} instead of {currentUser.Name}
  if (content.includes('{currentUser}') || content.includes('{selectedMember}') || content.includes('{member}')) {
    // These might be objects!
    console.log(`Possible object rendering in ${f}`);
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('{currentUser}') || l.includes('{selectedMember}') || l.includes('{member}')) {
        console.log(`  Line ${i+1}: ${l.trim()}`);
      }
    });
  }
});
