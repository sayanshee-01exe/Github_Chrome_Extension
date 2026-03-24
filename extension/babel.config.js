module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { chrome: '110' }, modules: false }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
