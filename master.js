"use strict"
const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')

const utils = require('./utils')
const log = utils.log

const config = require('./config')
const task_url_head = config.task_url_head
const main_url = config.main_url
const proxy_url = config.proxy_url

const redis_cache = require('./redis_cache')
const redis_client = redis_cache.client

const Task = function() {
    this.id = 0
    this.title = ''
    this.url = ''
    this.file_name = ''
    this.file_url = 0
    this.is_download = false
}
//总下载数
var down_cont = 0
//当前下载数
var cur_cont = 0

const taskFromBody = function(task_url, body) {
    
    const task = new Task()
    // cheerio.load 用字符串作为参数返回一个可以查询的特殊对象
    // body 就是 html 内容
    const e = cheerio.load(body)
    // 查询对象的查询语法和 DOM API 中的 querySelector 一样
    const title = e('.controlBar').find('.epi-title').text()
    const file_url = e('.audioplayer').find('audio').attr('src')
    const ext = file_url.substring(file_url.length-4)
    const task_id = task_url.substring(task_url.length-5)
    const file_name = task_id+'.'+title+ext

    task.id = task_id
    task.title = title
    task.url = task_url
    task.file_name = file_name.replace(/\//g,"-").replace(/:/g,"：")
    task.file_url = file_url
    task.is_download = false

    redis_client.set('Task:id:'+task_id,JSON.stringify(task),function (error, res) {
        if (error) {
            log('Task:id:'+task_id, error)
        } else {
            log('Task:id:'+task_id, res)
        }
        cur_cont = cur_cont + 1
        if (down_cont == cur_cont) {
            // 操作完成，关闭redis连接
            redis_client.end(true);
            log('已完成')
        }
    })
}

const taskFromUrl = function(task_url) {
    request({
        'url':task_url,
        'proxy':proxy_url,
        }, 
        function(error, response, body) {
        // 回调函数的三个参数分别是  错误, 响应, 响应数据
        // 检查请求是否成功, statusCode 200 是成功的代码
        if (error === null && response.statusCode == 200) {
            taskFromBody(task_url, body)
        } else {
            log('*** ERROR 请求失败 ', error)
        }
    })
}

const parseLink = function(div) {
    let e = cheerio.load(div)
    let href = e('a').attr('href')
    return href
}

const dataFromUrl = function(url) {
    // request 从一个 url 下载数据并调用回调函数
    request({
            'url' : url,
            'proxy' : proxy_url,
            }, 
            function(error, response, body) {
            // 回调函数的三个参数分别是  错误, 响应, 响应数据
            // 检查请求是否成功, statusCode 200 是成功的代码
            if (error === null && response.statusCode == 200) {
                // cheerio.load 用字符串作为参数返回一个可以查询的特殊对象
                // body 就是 html 内容
                const e = cheerio.load(body)
                // 查询对象的查询语法和 DOM API 中的 querySelector 一样
                const itmeDivs = e('.epiItem.video')

                for(let i = 0; i < itmeDivs.length; i++) {
                    let element = itmeDivs[i]
                    // 获取 div 的元素并且用 itmeFromDiv 解析
                    // 然后加入 link_list 数组中
                    const div = e(element).html()
                    // log(div)
                    const url_body = parseLink(div)
                    const task_url = task_url_head+url_body
                    down_cont = itmeDivs.length
                    taskFromUrl(task_url)
                    // redis_client.set('Task:id:'+task_id+':url', task_link, )
                }
                // 操作完成，关闭redis连接
                // redis_client.end(true)
                log('*** success ***')
            } else {
                log('*** ERROR 请求失败 ', error)
            }
        })
}

const __main = function() {
    // 这是主函数
    const url = main_url
    dataFromUrl(url)
}

__main()