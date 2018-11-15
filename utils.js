const _saveJSON = function(path, answers) {
    // 这个函数用来把一个保存了所有电影对象的数组保存到文件中
    const fs = require('fs')
    const s = JSON.stringify(answers, null, 2)
    fs.writeFile(path, s, function(error) {
        if (error !== null) {
            console.log('*** 写入文件错误', error)
        } else {
            console.log('--- 保存成功')
        }
    })
}

const _log = function() {
    console.log.apply(console, arguments)
}

// test 函数没有用 exports 导出
// 所以在别的文件里面是无法使用的
const _test = function() {
    console.log('test log')
}
/*
通过 exports 制作自己的模块
*/
exports.saveJSON = _saveJSON
exports.log = _log