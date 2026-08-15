const fs = require('fs');
const file = '/app/app/profile/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove BlockedUserCard component definition
const blockedUserCardRegex = /\/\/ One blocked user row.*?\nfunction BlockedUserCard.*?}\n/s;
content = content.replace(blockedUserCardRegex, '');

// 2. Remove Blocked users section from JSX
const blockedUsersSectionRegex = /\{\/\* Blocked users \*\/\}.*?<\/div>\n\s+<\/div>/s;
content = content.replace(blockedUsersSectionRegex, '</div>');

fs.writeFileSync(file, content);
