import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const production = process.env.NODE_ENV === 'production';

const copyTypesPlugin = () => ({
  name: 'copy-types',
  writeBundle() {
    mkdirSync('dist/types', { recursive: true });
    copyFileSync('src/types/index.d.ts', 'dist/types/index.d.ts');
  }
});

const baseConfig = {
  external: ['pdfjs-dist', 'mammoth', 'xlsx', 'localforage'],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    postcss({
      extract: 'styles.css',
      minimize: production
    }),
    production && terser(),
    copyTypesPlugin()
  ].filter(Boolean)
};

export default [
  // Core library - ESM
  {
    ...baseConfig,
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true
    }
  },
  
  // Core library - UMD
  {
    ...baseConfig,
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'BukaJS',
      sourcemap: true,
      inlineDynamicImports: true,
      globals: {
        'pdfjs-dist': 'pdfjsLib',
        'mammoth': 'mammoth',
        'xlsx': 'XLSX',
        'localforage': 'localforage'
      }
    }
  },
  
  // Individual renderer builds - ESM
  {
    ...baseConfig,
    input: 'src/renderers/pdf.js',
    output: {
      file: 'dist/renderers/pdf.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/image.js',
    output: {
      file: 'dist/renderers/image.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/docx.js',
    output: {
      file: 'dist/renderers/docx.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/xlsx.js',
    output: {
      file: 'dist/renderers/xlsx.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/presentation.js',
    output: {
      file: 'dist/renderers/presentation.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },

  // Individual renderer builds - UMD
  {
    ...baseConfig,
    input: 'src/renderers/pdf.js',
    output: {
      file: 'dist/renderers/pdf.js',
      format: 'umd',
      name: 'BukaJSPDFRenderer',
      sourcemap: true,
      globals: {
        'pdfjs-dist': 'pdfjsLib',
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/image.js',
    output: {
      file: 'dist/renderers/image.js',
      format: 'umd',
      name: 'BukaJSImageRenderer',
      sourcemap: true,
      globals: {
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/docx.js',
    output: {
      file: 'dist/renderers/docx.js',
      format: 'umd',
      name: 'BukaJSDocxRenderer',
      sourcemap: true,
      globals: {
        'mammoth': 'mammoth',
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/xlsx.js',
    output: {
      file: 'dist/renderers/xlsx.js',
      format: 'umd',
      name: 'BukaJSXlsxRenderer',
      sourcemap: true,
      globals: {
        'xlsx': 'XLSX',
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/presentation.js',
    output: {
      file: 'dist/renderers/presentation.js',
      format: 'umd',
      name: 'BukaJSPresentationRenderer',
      sourcemap: true,
      globals: {
        '../core/index.js': 'BukaJS'
      }
    }
  },

  // Styles build
  {
    input: 'src/styles/index.js',
    plugins: [
      postcss({
        extract: 'styles.css',
        minimize: production
      })
    ],
    output: {
      file: 'dist/styles.js',
      format: 'esm'
    }
  }
];