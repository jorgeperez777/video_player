/**
 * Solo para los tests de `src/controls`: reglas sin React ni nativo, como
 * `decideOnAppState`, que se pueden probar sueltas.
 *
 * La configuración de Babel va aquí dentro, y no en un `babel.config.js`, a
 * propósito: ese fichero en la raíz lo leería también el Metro de cualquier app
 * que enlace la librería, y le cambiaría la forma de compilar el código.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        configFile: false,
        presets: [require.resolve('@babel/preset-typescript')],
        plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
      },
    ],
  },
};
