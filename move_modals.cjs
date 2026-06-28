const fs = require('fs');
const file = '/Users/vineethpillai/Projects/Rotary/src/pages/MeetingConsole.jsx';
let content = fs.readFileSync(file, 'utf8');

const modalStartStr = '{/* Action Item Conversion Modal */}';
const modalEndStr = '          </div>\n                )}\n\n              </div>\n            </div>';
const modalStartIdx = content.indexOf(modalStartStr);
const modalEndIdx = content.indexOf(modalEndStr);

if (modalStartIdx !== -1 && modalEndIdx !== -1) {
  const modalContent = content.substring(modalStartIdx, modalEndIdx);
  content = content.substring(0, modalStartIdx) + content.substring(modalEndIdx);
  
  const endDivIdx = content.lastIndexOf('      </div>\n    </div>\n  );\n};');
  if (endDivIdx !== -1) {
    content = content.substring(0, endDivIdx) + modalContent + '\n' + content.substring(endDivIdx);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Success");
  } else {
    console.log("Could not find end of component.");
  }
} else {
  console.log("Could not find Modals block.");
}
