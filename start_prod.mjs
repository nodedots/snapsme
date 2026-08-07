import { execSync } from 'child_process';
import { resolve } from 'path';

process.env.NODE_ENV = 'production';
import('./server.js').then(() => {
  console.log('Started server in production mode!');
});
