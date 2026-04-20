const https = require('https');
const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9_%D9%88%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85_%D8%A7%D9%84%D8%A3%D9%88%D9%84%D9%8A_%D9%88%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9_%28%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8%29.png/320px-%D9%88%D8%B2%D8%A7%D8%B1%D8%A9_%D8%A7%D9%84%D8%AA%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9_%D9%88%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85_%D8%A7%D9%84%D8%A3%D9%88%D9%84%D9%8A_%D9%88%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9_%28%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8%29.png';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  const data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => {
    const base64 = Buffer.concat(data).toString('base64');
    const fs = require('fs');
    fs.writeFileSync('logoB64.txt', base64);
  });
});
