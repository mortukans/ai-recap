module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Inline .sql files as strings so Drizzle migrations bundle correctly (drizzle-orm Expo setup).
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
