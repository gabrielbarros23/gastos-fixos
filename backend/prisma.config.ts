import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // process.env (e não env()) para que `prisma generate` funcione sem .env,
    // por exemplo no postinstall de um clone novo.
    url: process.env.DATABASE_URL,
  },
});
