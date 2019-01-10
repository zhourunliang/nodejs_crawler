### node.js主从分布式爬虫

+ 采用Redis为任务队列服务
+ 主程序获取任务
+ 从程序获得数据并下载
+ 通过代理接口获取数据

### 本地环境配置
+ 安装node.js和Redis
+ 安装request与Redis相关的库
+ 克隆项目到本地
```
git clone https://github.com/zhourunliang/nodejs_crawler
```
+ 修改config.js
+ 运行主爬虫
```
node master.js
```
+ 运行从爬虫
```
node salver.js
```