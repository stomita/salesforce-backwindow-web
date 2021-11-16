const { build } = require('esbuild');

build({
  entryPoints: ['./src/client/main.tsx'],
  outfile: './public/main.js',
  bundle: true,
  define: {
    'process.env.GL_BACKWINDOW_CLIENT_ID': JSON.stringify(process.env.GL_BACKWINDOW_CLIENT_ID),
    'process.env.GL_BACKWINDOW_REDIRECT_URI': JSON.stringify(process.env.GL_BACKWINDOW_REDIRECT_URI),
  },
  watch: process.argv[2] === "watch",
}).catch(() => process.exit(1))
