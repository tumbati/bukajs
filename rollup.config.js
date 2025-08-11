import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
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
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false
    }),
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
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: !production,
      inlineDynamicImports: true
    }
  },
  
  // Core library - UMD
  {
    ...baseConfig,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'BukaJS',
      sourcemap: !production,
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
    input: 'src/renderers/pdf.ts',
    output: {
      file: 'dist/renderers/pdf.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/image.ts',
    output: {
      file: 'dist/renderers/image.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/docx.ts',
    output: {
      file: 'dist/renderers/docx.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/xlsx.ts',
    output: {
      file: 'dist/renderers/xlsx.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },
  
  {
    ...baseConfig,
    input: 'src/renderers/presentation.ts',
    output: {
      file: 'dist/renderers/presentation.esm.js',
      format: 'esm',
      sourcemap: true
    }
  },

  // Individual renderer builds - UMD
  {
    ...baseConfig,
    input: 'src/renderers/pdf.ts',
    output: {
      file: 'dist/renderers/pdf.js',
      format: 'umd',
      name: 'BukaJSPDFRenderer',
      sourcemap: !production,
      globals: {
        'pdfjs-dist': 'pdfjsLib',
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/image.ts',
    output: {
      file: 'dist/renderers/image.js',
      format: 'umd',
      name: 'BukaJSImageRenderer',
      sourcemap: !production,
      globals: {
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/docx.ts',
    output: {
      file: 'dist/renderers/docx.js',
      format: 'umd',
      name: 'BukaJSDocxRenderer',
      sourcemap: !production,
      globals: {
        'mammoth': 'mammoth',
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/xlsx.ts',
    output: {
      file: 'dist/renderers/xlsx.js',
      format: 'umd',
      name: 'BukaJSXlsxRenderer',
      sourcemap: !production,
      globals: {
        'xlsx': 'XLSX',
        '../core/index.js': 'BukaJS'
      }
    }
  },

  {
    ...baseConfig,
    input: 'src/renderers/presentation.ts',
    output: {
      file: 'dist/renderers/presentation.js',
      format: 'umd',
      name: 'BukaJSPresentationRenderer',
      sourcemap: !production,
      globals: {
        '../core/index.js': 'BukaJS'
      }
    }
  },

  // Styles build
  {
    input: 'src/styles/index.ts',
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      }),
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