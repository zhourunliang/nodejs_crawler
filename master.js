"use strict"
const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')

const utils = require('./utils')
const log = utils.log

const config = require('./config')
const task_url_head = config.task_url_head

const redis_cache = require('./redis_cache')
const redis_client = redis_cache.client


const parseLink = function(div) {
    let e = cheerio.load(div)
    let href = e('a').attr('href')
    return href
}

const dataFromUrl = function(url) {
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
                const itmeDivs = e('.epiItem.video')

                for(let i = 0; i < itmeDivs.length; i++) {
                    let element = itmeDivs[i]
                    // 获取 div 的元素并且用 itmeFromDiv 解析
                    // 然后加入 link_list 数组中
                    const div = e(element).html()
                    // log(div)
                    const m = parseLink(div)
                    const task_link = task_url_head+m
                    const task_id = task_link.substring(task_link.length-5)
                    redis_client.set('Task:id:'+task_id+':url', task_link, )
                }
                // 操作完成，关闭redis连接
                redis_client.end(true)
                log('*** success ***')
            } else {
                log('*** ERROR 请求失败 ', error)
            }
        })
}

const __main = function() {
    // 这是主函数
    const url = 'http://podcasts.rthk.hk/podcast/item_all.php?pid=287&current_year=2011'
    dataFromUrl(url)
}

__main()