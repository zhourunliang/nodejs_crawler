"use strict"
const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')
const redis = require('redis')

const utils = require('./utils')
const log = utils.log

const config = require('./config')

const redis_cache = require('./redis_cache')
const redis_client = redis_cache.client

const download = function(url, path) {
    log(url, path)
    // request({
    //             'url':url,
    //             'proxy':'http://127.0.0.1:8087'
    //         }).pipe(fs.createWriteStream(path)).on('close', function() {
    //             log('下载完成')
    //         });
    var writeStream = fs.createWriteStream(path);
    var readStream = request({
        'url':url,
        'proxy':'http://127.0.0.1:8087'
    })
    readStream.pipe(writeStream);
    readStream.on('end', function() {
        console.log('文件下载成功', path);
    });
    readStream.on('error', function() {
        console.log("错误信息:" + err)
    })
    writeStream.on("finish", function() {
        console.log("文件写入成功", path);
        writeStream.end();
    });
}

const getTask = function() {
    redis_client.keys('Task:id:[0-9]*',function (err,v){
        // console.log(v.sort())  
        let task_keys = v.sort()
        for (let i = 0; i < task_keys.length; i++) {
            redis_client.get(task_keys[i],function (err,v){
                let task = JSON.parse(v)
                let file_url = task.file_url
                let file_name = task.file_name
                let file_path = './download/'+file_name.replace(/\//g,"-")
                download(file_url, file_path)
                if(i == task_keys.length-1){
                    redis_client.end(true)                            
                }
            })    
        }
       
    })
}

const __main = function() {
    // 这是主函数
    getTask()
    // download('http://app3.rthk.hk/podcast/media/people/287_1112141904_13912.mp3', './download/岳飛(五)）：靖康之難（上）.mp3')


}

__main()
