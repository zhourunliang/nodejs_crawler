"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const getHttpReqCallback = function(fileUrl, dirName, fileName) {
    var callback = function (res) {
        console.log("request: " + fileUrl + " return status: " + res.statusCode);
        var contentLength = parseInt(res.headers['content-length']);
        var fileBuff = [];
        res.on('data', function (chunk) {
            var buffer = new Buffer(chunk);
            fileBuff.push(buffer);
        });
        res.on('end', function () {
            console.log("end downloading " + fileUrl);
            if (isNaN(contentLength)) {
                console.log(fileUrl + " content length error");
                return;
            }
            var totalBuff = Buffer.concat(fileBuff);
            console.log("totalBuff.length = " + totalBuff.length + " " + "contentLength = " + contentLength);
            if (totalBuff.length < contentLength) {
                console.log(fileUrl + " download error, try again");
                startDownloadTask(fileUrl, dirName, fileName);
                return;
            }
            fs.appendFile(dirName + "/" + fileName, totalBuff, function (err) {});
        });
    };

    return callback;
}

var startDownloadTask = function (fileUrl, dirName, fileName) {
    console.log("start downloading " + fileUrl);
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
    var req = http.request(option, getHttpReqCallback(fileUrl, dirName, fileName));
    req.on('error', function (e) {
        console.log("request " + fileUrl + " error, try again");
        startDownloadTask(fileUrl, dirName, fileName);
    });
    req.end();
}

startDownloadTask('http://app3.rthk.hk/podcast/media/people/287_1112141904_13912.mp3', './download', '岳飛(五)）：靖康之難（上）.mp3')

// urlList.forEach(function (item, index, array) {
//     startDownloadTask(item, './', index);
// })