# vite-plugin-pages
vite 多页项目插件， 开箱即用

***
适用 vite 5.x
``` 建议项目结构
src
- pages
    - login
        index.html
        index.js
        index.vue
    - home
        index.html
        index.js
        index.vue
    - project
        index.html
        index.js
        index.vue
        detail.html
        detail.js
        detail.vue

构建后将会得到：
dist/
    assets/
        css/
        js/
        images/
        fonts/
        media/
    login.html',
    home.html',
    project.html',
    project_detail.html',
```

vite.config.js 中使用
```
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ViteMpaPlugin from 'vite-plugin-multiple-entry';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
    console.log('构建环境', command, mode);
    const config = {
        base: mode === 'development' ? './' : '',
        productionSourceMap: false,
        integrity: true,
        crossorigin: 'anonymous',
        define: {
            ENV: JSON.stringify(mode),
        },
        resolve: {
            alias: {
                '@': path.join(__dirname, './src')
            }
        },
        plugins: [
            vue(),
            ViteMpaPlugin(),
        ],
    };

    return config;
})

```
