const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

if (!content.includes('import { FeedbackWidget }')) {
  content = content.replace(
    "import { Header } from './components/Header';",
    "import { Header } from './components/Header';\nimport { FeedbackWidget } from './components/FeedbackWidget';"
  );
  
  // Find where currentUser is defined in AuthProvider context
  // App.jsx has: const { currentUser } = useAuth();
  
  content = content.replace(
    "        <div className=\"main-content\">",
    "        <div className=\"main-content\">\n          {currentUser && <FeedbackWidget currentUser={currentUser} />}"
  );
  fs.writeFileSync('src/App.jsx', content);
}
