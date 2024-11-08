
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path';
import history from 'connect-history-api-fallback'
import { getHistoryReWriteRuleList, getPages } from './lib/utils.mjs';


/**
 * 多页面构建插件
 * pageDir 下所有的html都会被视为一个单独的入口
 * 请注意： html的文件名与其引用的js名需要保持一致
 * 页面请严格按照 aaa.html, aaa.js 来编写， js与html必须同名
 * @param {*} userOptions 用户配置
 * @returns 
 */
function ViteMpaPlugin(userOptions = {}) {
    const options = {
        // 两种模式
        // html: 直接生成html
        // 例如 src/pages/login/index.html 将会得到 login.html
        // src/pages/project/detail.html 将会得到 project_detail.html
        // 
        // path: 将会按路径生成（设想，暂未开发该功能）
        // src/pages/login/index.html 将会得到 login/index.html
        // src/pages/project/detail.html 将会得到 project/detail/index.html
        mode: 'html',
        // 源代码页面放置路径
        pageDir: 'src/pages',
        // 静态资源存放路径，相对于 outDir
        assetsPath: './assets',
        rewrites: [],
        ...userOptions,
    }
    options.pageDir = /\/$/.test(options.pageDir) ? options.pageDir : options.pageDir + '/';
    // 获取指定路径下的所有页面
    const pages = getPages(options.pageDir);
    let resolvedConfig = {};

    return {
        name: 'vite-mpa-plugin',
        enforce: 'post', // pre: 之前， post: 确保插件在其他插件之后运行

        /// vite独有节点
        config(config) {
            config.build = config.build || {}
            const outDir = config.build.outDir || 'dist/'
            config.build.outDir = /\/$/.test(outDir) ? outDir : outDir + '/';
            config.build.rollupOptions = config.build.rollupOptions || {}
            config.build.rollupOptions.input = pages
            // 输出配置
            config.build.rollupOptions.output = config.build.rollupOptions.output || {}
            config.build.rollupOptions.output.entryFileNames = config.build.rollupOptions.output.entryFileNames || 'assets/js/[name].js';
            config.build.rollupOptions.output.chunkFileNames = config.build.rollupOptions.output.chunkFileNames || 'assets/js/[name].js';
            config.build.rollupOptions.output.assetFileNames = config.build.rollupOptions.output.assetFileNames || function (file) {
                if (/\.(ttf|woff2?)$/.test(file.name)) {
                    return 'assets/fonts/[name].[ext]';
                }
                if (/\.(svg|png|jpg|gif|jpeg|webp)$/.test(file.name)) {
                    return 'assets/images/[name].[ext]';
                }
                if (/\.(mp3|mp4|m3u8)$/.test(file.name)) {
                    return 'assets/media/[name].[ext]';
                }
                return 'assets/[ext]/[name].[ext]';
            };
            // 开发配置
            config.server = config.server || {
                port: 8080,
                strictPort: true,
                hmr: true, // 开启热更新
            }
            resolvedConfig = config
        },

        /// vite独有节点
        /// 配置本地服务
        configureServer({ middlewares: app }) {
            app.use(
                // @see https://github.com/vitejs/vite/blob/8733a83d291677b9aff9d7d78797ebb44196596e/packages/vite/src/node/server/index.ts#L433
                history({
                    verbose: Boolean(process.env.DEBUG) && process.env.DEBUG !== 'false',
                    disableDotRule: undefined,
                    htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
                    rewrites: getHistoryReWriteRuleList(options),
                }),
            )
        },

        // options - 这个钩子允许你在解析命令行选项后修改最终的配置对象。这对于基于环境动态调整配置非常有用。
        // buildStart - 当构建开始时触发，可用于执行一些初始化工作，比如清理输出目录。
        // resolveId - 在尝试加载模块前调用此钩子，可以用来重定向模块请求到其他路径，或者处理虚拟模块等场景。
        // load - 当 Rollup 需要从文件系统或其他来源加载源码时会调用这个钩子。你可以返回自定义内容代替实际文件的内容，适用于注入全局变量、模拟数据等情况。
        // transform - 该钩子允许你转换已加载的源代码。这是实现代码转译（如 Babel）、添加头部注释等操作的好地方。
        // moduleParsed - 每当一个模块被完全解析之后都会调用这个钩子，这使得可以在生成图表之前对模块进行额外处理。
        // renderStart - 开始渲染输出时触发，适合于需要根据输出格式做不同处理的情况。
        // generateBundle - 当所有文件和 chunk 已经生成完毕但还未写入磁盘时调用。可以通过此钩子访问并修改即将输出的所有资源。
        // writeBundle - 文件已经写入磁盘后触发。如果你需要在构建完成后执行某些任务（例如运行测试），那么这是一个很好的时机。
        // closeBundle - 整个构建过程结束时调用。对于清理临时文件或者其他收尾工作很有帮助。
        // watchChange - 当监听模式下检测到文件变动时触发，可用于决定是否应该重新构建整个项目还是只更新特定部分。
        closeBundle() {
            console.log('执行 vite-mpa-plugin');
            const outDir = resolvedConfig.build.outDir
            const { assetsPath } = options;

            // 循环将 dist/src/pages/login/index.html 文件复制到 dist/login.html
            // 并将文件中的静态资源路径替换成 文件迁移后的静态路径 或者 cdn之类的路径
            Object.keys(pages).forEach(pageName => {
                const filepath = `${outDir}${pages[pageName]}`;
                // 读取文件内容
                let content = readFileSync(filepath, { encoding: 'utf-8' });
                content = content.replaceAll('../../../assets', assetsPath);
                writeFileSync(resolve(`${outDir}${pageName}.html`), content, { encoding: 'utf-8' });
            });

            // 移除dist中的src
            rmSync('dist/src', { force: true, recursive: true });
        },
    };
}

export default ViteMpaPlugin;
