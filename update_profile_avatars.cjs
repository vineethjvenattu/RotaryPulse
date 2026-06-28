const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// Remove fetching preset avatars
content = content.replace(
  /if \(showEditProfileModal && availableAvatars\.length === 0\) \{[\s\S]*?\}\n    \} else if \(!showFamilyModal\) \{/,
  `if (showEditProfileModal) {
      document.body.style.overflow = 'hidden';
    } else if (!showFamilyModal) {`
);

// Remove the Avatar selection UI in Edit Profile Modal
content = content.replace(
  /<div style={{ marginTop: '24px' }}>\s*<h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Select Preset Avatar<\/h4>[\s\S]*?<\/div>\s*<\/div>/,
  ""
);

fs.writeFileSync('src/pages/Profile.jsx', content);
