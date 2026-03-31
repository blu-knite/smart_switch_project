module.exports = {
  env: 'production',
  server: {
    port: process.env.PORT || 10008
  },
  // Production settings would be overridden by environment variables
  // but we keep defaults here
};