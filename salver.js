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

const begin_task = function(task_id, url) {
    log('begin task '+task_id)
    // request 从一个 url 下载数据并调用回调函数
    request({
        'url':url,
        'proxy':'http://127.0.0.1:8087'
        }, 
        function(error, response, body) {
        // 回调函数的三个参数分别是  错误, 响应, 响应数据
        // 检查请求是否成功, statusCode 200 是成功的代码
        if (error === null && response.statusCode == 200) {
            // cheerio.load 用字符串作为参数返回一个可以查询的特殊对象
            // body 就是 html 内容
            const e = cheerio.load(body)
            // 查询对象的查询语法和 DOM API 中的 querySelector 一样
            const title = e('.controlBar').find('.epi-title').text()
            const link = e('.audioplayer').find('audio').attr('src')
            const ext = link.substring(link.length-4)
            const file_name = task_id+'.'+title+ext
            // log(title)
            // log(link)
            download(link, './download/'+file_name)
            log('begin task '+task_id+' success')
        } else {
            log('*** ERROR 请求失败 ', error)
        }
    })
}


const download = function(link, path) {
    log(link, path)
    request({
                'url':link,
                'proxy':'http://127.0.0.1:8087'
            }).pipe(fs.createWriteStream(path))
}

const __main = function() {
    // 这是主函数
    redis_client.keys('Task:id:[0-9]*:url',function (err,v){
        // console.log(v.sort())  
        let task_keys = v.sort()
        for (let i = 0; i < task_keys.length; i++) {
            redis_client.get(task_keys[i],function (err,v){
                const url = v
                const task_id = url.substring(url.length-5)
                log(task_id, url)
                begin_task(task_id, url)
                if(i == task_keys.length-1){
                    redis_client.end(true)                            
                }
            })    
        }
       
    })
    // let url = 'http://app3.rthk.hk/podcast/media/people/287_1112141904_13912.mp3' 
    // request({
    //         'url':url,
    //         'proxy':'http://127.0.0.1:8087'
    //         }).pipe(fs.createWriteStream('岳飛(五)）：靖康之難（上）.mp3'));
}

__main()
