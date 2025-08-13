// server.js (place in: C:\Users\Asus\OneDrive\Desktop\aahaanya-creatives\server.js)
const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));
  server.listen(3000, () => console.log('Server running on https://www.aahaanyacreatives.in/'));
});
   