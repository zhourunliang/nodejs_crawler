"use strict"
const http = require("http")
const fs = require("fs")
const path = require("path")

const getHttpReqCallback = function(fileUrl, dirName, fileName, downCallback) {
    var callback = function (res) {
        console.log("request: " + fileUrl + " return status: " + res.statusCode)
        var contentLength = parseInt(res.headers['content-length'])
        var fileBuff = []
        res.on('data', function (chunk) {
            var buffer = new Buffer(chunk)
            fileBuff.push(buffer)
        })
        res.on('end', function () {
            console.log("end downloading " + fileUrl)
            if (isNaN(contentLength)) {
                console.log(fileUrl + " content length error")
                return
            }
            var totalBuff = Buffer.concat(fileBuff)
            console.log("totalBuff.length = " + totalBuff.length + " " + "contentLength = " + contentLength)
            if (totalBuff.length < contentLength) {
                console.log(fileUrl + " download error, try again")
                startDownloadTask(fileUrl, dirName, fileName)
                return
            }
            fs.appendFile(dirName + "/" + fileName, totalBuff, function (err) {
                console.log('download success')
                downCallback
            })
        })
    }

    return callback
}

var startDownloadTask = function (fileUrl, dirName, fileName, downCallback) {
    console.log("start downloading " + fileUrl)
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
        console.log("request " + fileUrl + " error, try again")
        startDownloadTask(fileUrl, dirName, fileName)
    })
    req.end()
}

startDownloadTask('http://app3.rthk.hk/podcast/media/people/287_1112141904_13912.mp3', './download', '岳飛(五)）：靖康之難（上）.mp3')

// urlList.forEach(function (item, index, array) {
//     startDownloadTask(item, './', index)
// })

// 异步控制
var requestAndwrite=function(url,callback){
    request.get(url).end(function(err,res){
        if(err){
            console.log(err);
            console.log("有一张图片请求失败啦...");
        }else{
            var fileName=path.basename(url);
            fs.writeFile("./img1/"+fileName,res.body,function(err){
                if(err){
                    console.log(err);
                    console.log("有一张图片写入失败啦...");
                }else{
                    console.log("图片下载成功啦");
                    callback(null,"successful !");
                    /*callback貌似必须调用，第二个参数将传给下一个回调函数的result，result是一个数组*/
                }
            });
        }
    });
}

var downloadImg=function(asyncNum){
    /*有一些图片链接地址不完整没有“http:”头部,帮它们拼接完整*/
    for(var i=0;i<photos.length;i++){
        if(photos[i].indexOf("http")===-1){
            photos[i]="http:"+photos[i];
        }
    }
    console.log("即将异步并发下载图片，当前并发数为:"+asyncNum);
    async.mapLimit(photos,asyncNum,function(photo,callback){
        console.log("已有"+asyncNum+"张图片进入下载队列");
        requestAndwrite(photo,callback);
    },function(err,result){
        if(err){
            console.log(err);
        }else{
            // console.log(result);<=会输出一个有2万多个“successful”字符串的数组
            console.log("全部已下载完毕！");
        }
    });

};