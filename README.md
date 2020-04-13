# Animation Board - Web Frontend

## Fixed & Features
### Fixed
- 修正部分日期内容在Safari浏览器上的兼容问题

## 部署
### 配置文件
```bash
cp config.js.example config.js
```
执行此命令，从配置文件模版复制一份文件，并酌情修改。
```
{
    port: number,       //服务器监听的端口
    prefix: string,     //在URL中添加在后续地址前的前缀，详细格式见模版示例
    serverURL: string   //配置后端API服务器的URL，详细格式见模版示例
}
```
### 安装和编译
在开始安装之前，确保安装`node`, `npm`, 并全局安装了`typescript`(`npm install -g typescript`)。  
```bash
npm install
npm run build-backend
npm run build-frontend
```
### 运行
```bash
npm run start
```
