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
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    const match = l.match(/>\{([^}]+)\}</g);
    if (match) {
      match.forEach(m => {
        const expr = m.substring(2, m.length - 2).trim();
        // Ignore strings, function calls, logical expressions, ternaries, etc for now if they look safe
        if (!expr.includes('.') && !expr.includes('(') && !expr.includes('?') && !expr.includes('&&') && !expr.includes('||') && !expr.includes('`') && !expr.includes("'") && !expr.includes('"')) {
          console.log(`${f} Line ${i+1}: ${m}`);
        }
      });
    }
  });
});
