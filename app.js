const express = require('express');
const path = require('path');
// 用于提升加载favicon性能的中间件
const favicon = require('serve-favicon');
// 日志生成中间件
const logger = require('morgan');
// 设置cookie
const cookieParser = require('cookie-parser');
// 模板引擎handlebars
const handlebars = require('express-handlebars');
// 提供解析JSON的json、处理表单和Ajax的urlencoded
const bodyParser = require('body-parser');
// lodash是个具有一致接口、模块化、高性能等特性的 JavaScript 工具库
const _ = require('lodash');

// 添加markdown语法支持
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt({
    breaks: true,
    linkify: true
});
let users = [];
const routes = require('./routes/index');
// const notFound =require('./routes/404');

const app = express();

const server = app.listen(3000);
const io = require('socket.io').listen(server);
// 防范XSS
const xss = function(a) {
    return String(a)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};
// 设置模板引擎
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', handlebars({ defaultLayout: 'mainlayout' }));
app.set('view engine', "handlebars");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// 生成日志
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());
// static这个中间件可以连入多次，并可以指定不同的目录
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// 定制404页面
app.use(function(req, res) {
    res.status(404);
    res.render('404', { title: '路径错啦' })
});

app.use(function(req, res) {
    console.error(err.stack);
    res.status(500);
    res.render('error', { title: '服务器内部错误啦' });
});

io.on('connection', function(socket) {

    socket.on('user connection', function(msg) {
        // 有一个客户端建立连接后，就把该用户加入数组里
        msg = xss(msg);
        let avatar = Math.floor(Math.random() * 13 + 1);
        users.push({
            id: socket.id,
            name: msg,
            avatar: avatar
        });
        io.emit('hi', msg + ' 加入聊天室 当前在线人数 ' + users.length);
    });

    socket.on('disconnect', function() {
        // 断开连接后，就把它从数组里面删掉
        let i = _.findIndex(users, {
            id: socket.id
        });
        if (i >= 0) {
            let _user = users[i];
            _.remove(users, function(u) {
                return u.id == socket.id;
            })
            io.emit('hi', _user.name + ' 离开了聊天室 当前在线人数' + users.length);
        }
    });

    socket.on('chat message', function(msg) {
        if (msg) {
            let i = _.findIndex(users, {
                id: socket.id
            });
            if (i >= 0) {
                io.emit('chat message', {
                    user: users[i],
                    msg: md.render(msg),
                });
            }
        }
    });
    // first是from的服务器接收到的
    socket.on('whisper-first',function(msg){
        // 说明是其他客户端的消息
        if(msg!==socket.id){
            let i = _.findIndex(users, {
                id: socket.id
            });
            if(i>=0){
                socket.broadcast.to(msg).emit('whisper-second', {
                    to:msg,
                    from:socket.id,
                    user:users[i],
                 });
            }
            
        }
    });
    // third是只有from的服务器才会接收到
    socket.on('whisper-third',function(msg){

        // 同意进行私聊后，给from的人发送消息，连接开始
        let i = _.findIndex(users, {
                id: msg.to
            });
        if(i>=0){
            socket.broadcast.to(msg.from).emit('whisper-forth',{
                to:msg.to,
                from:msg.from,
                user:users[i]
            });
        }
    });

});


module.exports = app;
