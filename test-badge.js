import { calculateMemberBadges } from './src/utils/badges.js';

const payments = [
  {
    "Payment ID": "P1782574127565750",
    "Member ID": "MEM-0007",
    "Status": "Paid",
    "Category": "Membership Fee",
    "Description": "Test receivable"
  }
];

const badges = calculateMemberBadges("MEM-0007", payments, [], [], []);
console.log("Earned badges:", badges.map(b => b.name));
