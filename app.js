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
let users=[];
const routes = require('./routes/index');

const app = express();

const server=app.listen(3000);
const io=require('socket.io').listen(server);

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


io.on('connection', function(socket) {

    socket.on('user connection', function(msg) {
        users.push({
            id: socket.id,
            name: msg
        })
        io.sockets.emit('hi', msg + '加入聊天室\n当前在线人数' + users.length);
    });

    socket.on('disconnect', function() {
        let i = _.findIndex(users, {
            id: socket.id
        });
        if (i >= 0) {
            let _user = users[i];
            _.remove(users, function(u) {
                return u.id == socket.id;
            })
            io.sockets.emit('hi', _user.name + '离开了聊天室\n当前在线人数' + users.length);
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
                    msg: md.render(msg)
                });
            }
        }
    });

});

module.exports = app;