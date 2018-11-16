"use strict"
const http = require("http")
const fs = require("fs")
const path = require("path")


const redis = require('redis')

const utils = require('./utils')
const log = utils.log

const config = require('./config')

const redis_cache = require('./redis_cache')
const redis_client = redis_cache.client


const getHttpReqCallback = function(fileUrl, dirName, fileName, downCallback) {
    var callback = function (res) {
        log("request: " + fileUrl + " return status: " + res.statusCode)
        if (res.statusCode != 200) {
            startDownloadTask(fileUrl, dirName, fileName)
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
                startDownloadTask(fileUrl, dirName, fileName)
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


const getTask = function() {
    redis_client.keys('Task:id:[0-9]*',function (err,v){
        // log(v.sort())  
        let task_keys = v.sort()
        for (let i = 0; i < task_keys.length; i++) {
            redis_client.get(task_keys[i],function (err,v){
                let task = JSON.parse(v)


                let file_url = task.file_url
                let dir_path = './download/'
                let file_name = task.file_name
                
                if (task.is_download === false) {
                    startDownloadTask(file_url, dir_path, file_name,function(){
                        task.is_download = true
                        redis_client.set(task_keys[i], JSON.stringify(task), function (error, res) {   
                            log('update redis success', task_keys[i])
                            if(i == task_keys.length-1){
                                redis_client.end(true)                            
                            }
                        })
                    })
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
