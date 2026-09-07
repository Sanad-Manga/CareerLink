
require("dotenv").config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
// Originally added because Railway containers had no IPv6 internet connectivity:
// patch dns.lookup globally so every net.createConnection (including nodemailer's)
// resolves to IPv4 only. May not be needed on Render, but it's a harmless safety
// net — IPv4 is universally routable, so forcing it only costs unused IPv6.
const _lookup = dns.lookup.bind(dns);
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') return _lookup(hostname, { family: 4 }, options);
  return _lookup(hostname, { ...(typeof options === 'object' ? options : {}), family: 4 }, callback);
};

const connectDB = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });
});

