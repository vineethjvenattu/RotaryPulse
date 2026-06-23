const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/api.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add activeChapterId to the top, right after imports
content = content.replace(
  /export const api = {/,
  `let activeChapterId = null;

export const setApiChapterId = (id) => {
  activeChapterId = id;
};

export const api = {`
);

// Replace collection(db, "name") with collection(db, "chapters", activeChapterId, "name")
const collectionsToReplace = [
  'members', 'events', 'attendance', 'payments', 'announcements',
  'tasks', 'projectNotes', 'minutes', 'opinions', 'payment_edits'
];

collectionsToReplace.forEach(col => {
  // Regex to match collection(db, "col") or collection(db, 'col')
  const regex = new RegExp(`collection\\(\\s*db\\s*,\\s*["']${col}["']\\s*\\)`, 'g');
  content = content.replace(regex, `collection(db, "chapters", activeChapterId, "${col}")`);
});

// For doc(collection(db, "attendance")) -> this is already covered by the replace above!
// wait, doc(collection(db, "chapters", activeChapterId, "attendance")) is perfectly valid.

// The login and setPin methods need to query 'users' instead of 'members'
// Let's manually fix those after this script, or do it here.
content = content.replace(
  /const membersRef = collection\(db, "chapters", activeChapterId, "members"\);\s*const q = query\(membersRef, where\("Email", "==", email\.toLowerCase\(\)\.trim\(\)\)\);/g,
  `const usersRef = collection(db, "users");\n        const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));`
);
// In setPin as well:
// Actually, let's just do the global `collection` replace and then manually review `login`.

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ api.js updated for activeChapterId');
