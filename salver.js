"use strict"
const http = require("http")
const fs = require("fs")
const path = require("path")
const redis = require('redis')
const async = require('async')

const utils = require('./utils')
const log = utils.log

const config = require('./config')
const save_dir_path = config.save_dir_path

const redis_cache = require('./redis_cache')
const redis_client = redis_cache.client

//总下载数
var down_cont = 0
//当前下载数
var cur_cont = 0

const getHttpReqCallback = function(fileUrl, dirName, fileName, downCallback) {
    log('getHttpReqCallback fileName ', fileName)
    var callback = function (res) {
        log("request: " + fileUrl + " return status: " + res.statusCode)
        if (res.statusCode != 200) {
            startDownloadTask(fileUrl, dirName, fileName, downCallback)
            return
        }
        var contentLength = parseInt(res.headers['content-length'])
        var fileBuff = []
        res.on('data', function (chunk) {
            var buffer = new Buffer(chunk)
            fileBuff.push(buffer)
        })
        res.on('end', function () {
            log("end downloading " + fileUrl)
            if (isNaN(contentLength)) {
                log(fileUrl + " content length error")
                return
            }
            var totalBuff = Buffer.concat(fileBuff)
            log("totalBuff.length = " + totalBuff.length + " " + "contentLength = " + contentLength)
            if (totalBuff.length < contentLength) {
                log(fileUrl + " download error, try again")
                startDownloadTask(fileUrl, dirName, fileName, downCallback)
                return
            }
            fs.appendFile(dirName + "/" + fileName, totalBuff, function (err) {
                if (err){
                    throw err;  
                }else{
                    log('download success')
                    downCallback()
                } 
            })
        })
    }
    return callback
}

var startDownloadTask = function (fileUrl, dirName, fileName, downCallback) {
    log("start downloading " + fileUrl)
    var option = {
        host : '127.0.0.1',
        port : '8087',
        method:'get',//这里是发送的方法
        path : fileUrl,
        headers:{
            'Accept-Language':'zh-CN,zh;q=0.8',
            'Host':'maps.googleapis.com'
        }
    }
    var req = http.request(option, getHttpReqCallback(fileUrl, dirName, fileName, downCallback))
    req.on('error', function (e) {
        log("request " + fileUrl + " error, try again")
        startDownloadTask(fileUrl, dirName, fileName, downCallback)
    })
    req.end()
}

const beginTask = function(task_key, callback) {
    log('beginTask', task_key)
    redis_client.get(task_key,function (err,v){
        let task = JSON.parse(v)
        // log('task', task)

        let file_url = task.file_url
        let dir_path = save_dir_path
        let file_name = task.file_name
        
        if (task.is_download === false) {
            startDownloadTask(file_url, dir_path, file_name,function(){
                task.is_download = true
                redis_client.set(task_key, JSON.stringify(task), function (error, res) {   
                    log('update redis success', task_key)
                    // cur_cont = cur_cont + 1
                    // if(cur_cont == down_cont){
                    //     redis_client.end(true)                            
                    // }
                    callback(null,"successful !");
                })
            })
        }else{
            callback(null,"successful !");
        }
    }) 
}


const mainTask = function() {
    redis_client.keys('Task:id:[0-9]*',function (err,v){
        // log(v.sort())  
        let task_keys = v.sort()
        down_cont = task_keys.length
        log('down_cont', down_cont)
        //控制异步
        async.mapLimit(task_keys, 2, function(task_key,callback){
            beginTask(task_key, callback)
        },function(err,result){
            if(err){
                log(err);
            }else{
                // log(result);  //会输出多个“successful”字符串的数组
                log("all down！");
                redis_client.end(true)     
            }
        });
       
    })
}

const initDownFile = function() {
    fs.readdir(save_dir_path, function(err, files){
        if (err) {
            return console.error(err)
        }
        let file_list = []
        files.forEach( function (file){
            file_list.push(file.substring(0, 5))
        })
        // log(file_list)
        redis_client.keys('Task:id:[0-9]*',function (err,v){
            let task_keys = v
            // log(task_keys)
            let unfinish_len = task_keys.filter((item)=>file_list.includes(item.substring(item.length - 5)) == false).length
            let cur_unfinish_lent = 0
            task_keys.forEach(function (task_key){
                let task_id = task_key.substring(task_key.length - 5)
                
                if (file_list.includes(task_id) == false) {
                    // log(task_key)
                    redis_client.get(task_key,function (err,v){
                        let task = JSON.parse(v)

                        task.is_download = false
                        // log(task)
                        // log(task_key)
                        redis_client.set(task_key, JSON.stringify(task), function (error, res) {
                            cur_unfinish_lent++
                            // log('cur_unfinish_lent', cur_unfinish_lent)
                            if (cur_unfinish_lent == unfinish_len) {
                                redis_client.end(true)  
                                log('init finish')
                            }
                        })  
                    })
                }
            })
        })
     })
}

const __main = function() {
    // 这是主函数
    // initDownFile()
    mainTask()
}

__main()
