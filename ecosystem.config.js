module.exports = {
  apps: [
    {
      name: 'hive-jarvis',
      script: './node_modules/.bin/ts-node',
      args: './src/index.ts',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
