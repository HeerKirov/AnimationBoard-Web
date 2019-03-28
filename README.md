# Animation Board - Web Frontend
> Coding...

## Fixed & Features
### Fixed
- 修复在番剧编辑页，将搜索的标签内容添加为新标签时，搜索内容不会清空的问题
- 修复番剧编辑页，STAFF搜索器无法区分大小写，且关闭搜索器后没有清除搜索关键字的问题
- 修复番剧详情页，简介文字的回车无法被显示的问题
- 修复重复进入番剧新建页时，会导致控件功能失效的问题
- 修复番剧列表、STAFF列表、标签列表页，搜索框的搜索按钮点击无反应的问题
- 修复在番剧编辑页，将搜索的标签内容添加为新标签时，多余的空格会形成空标签的问题
- 修复番剧列表在有多页时，初始没有页码的问题
- 修复各个分页列表中，分页时串行的问题

### Feature
- 添加STAFF的新属性【备注】
- 在日记簿添加新的过滤方式【活跃订阅】，相当于【有存货】和【在更新】的并集。这被设定为默认过滤方式
- 调整日记条目的【订阅时间】逻辑
- 添加补充已看过的番剧的【补充日记】业务
- 添加限制评级的文字描述

### Optimize
- 数据库页面现在将懒加载每个子页面，而不是预先全部加载
- semantic-ui、jquery、vue的静态资源被替换为CDN资源，以提升加载速度
- 调整评分的文字描述

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