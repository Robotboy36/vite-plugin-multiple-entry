
const { glob } = require('glob')

/**
 * 从项目中提取页面
 * 得到页面入口配置
 * @returns 页面配置
 */
function getPages(pagePath) {
    const pages = {};
    const files = glob.sync(`${pagePath}/**/*.html`, {})
    const baseUrl = /\/$/.test(pagePath) ? pagePath : pagePath + '/';

    files.forEach(filepath => {
        const namepath = filepath.slice(0, -5).replace(baseUrl, '').split('/')
        const filename = namepath[0] === 'index' && namepath[0] === namepath[1] ? 'index' : namepath.join('/');

        let entryName = namepath.join('/')
        // 非 index页面， 则增加路径，确保最终生成对应路径的index.html 
        if (namepath[namepath.length - 1] !== 'index') {
            namepath.push('index');
            entryName = namepath.join('/');
        }
        // 模块名称
        // 如果是页面是index则默认去除
        const entry = {
            entry: filepath.replace(/\.html$/, '.js'),
            // 模板来源
            template: filepath,
            // 在 dist/index.html 的输出
            filename: `${filename}.html`,
            // 当使用 title 选项时，
            // template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
            // title: 'Index Page',
            // 在这个页面中包含的块，默认情况下会包含
            // 提取出来的通用 chunk 和 vendor chunk。
            // chunks: ['chunk-vendors', 'chunk-common', entryName]
        }
        pages[entryName] = filepath
    })

    return pages;
}


/**
 * 重定向路径
 * 在开发环境中， 由于生成的页面会固定按照input原原本本的生成，所以和生产生成的文件路径是不一样的
 * 例如在开发环境中，登录页面会生成在 dist/src/pages/login/index.html
 * 而按照我们的配置生产会生成在 dist/login/index.html
 * 如果我们需要像访问生产路径一样，在开发环境访问 /login/index.html， 则需要将其重写到 /src/pages/login/index.html
 */
function getHistoryReWriteRuleList(options) {
    const { rewrites } = options
    const list = rewrites
    const pages = getPages(options.pageDir);
    const pageKeys = Object.keys(pages)
    // 针对文件夹模式，对路径进行排序
    pageKeys.sort((a, b) => {
        if (a.startsWith(b)) {
            return -1
        } else if (b.startsWith(a)) {
            return 1
        } else {
            return b.length - a.length || a.localeCompare(b)
        }
    });

    pageKeys.forEach(pageName => {
        const to = `/${pages[pageName]}`;
        list.push({
            from: `/${pageName}.html`,
            to,
        });
        list.push({
            from: `/${pageName.slice(0, -5)}`,
            to,
        });
    });
    return list
}

module.exports = {
    getPages,
    getHistoryReWriteRuleList,
}
