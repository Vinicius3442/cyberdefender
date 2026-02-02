const { PeerServer } = require('peer');

const server = PeerServer({
    port: 8000,
    path: '/myapp',
    allow_discovery: true,
    corsOptions: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
    }
});

console.log('--------------------------------------------------');
console.log('  PeerServer is running on PORT 8000');
console.log('  Path: /myapp');
console.log('  Discovery: ENABLED');
console.log('  CORS: ENABLED (All Origins)');
console.log('--------------------------------------------------');
