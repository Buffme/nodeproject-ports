var express = require('express');
var app = express();

var async = require('async');

//需要使用body-parser中间件解决req.body无法获取参数的问题
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://127.0.0.1:27017';

//转化为数据库匹配的_id
var ObjectId = require('mongodb').ObjectId;

//上传图片
var multer = require('multer');
var upload = multer({ dest: 'C:temp' });
var fs = require('fs');
var path = require('path');

app.use(express.static('public'));

// 使用中间件设置响应头来处理跨域问题
app.use(function (req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*'
  })
  next();
})

//登录的接口：127.0.0.1:3000/api/login
app.post('/api/login', function (req, res) {
  // 获取参数
  var name = req.body.name;
  var pwd = req.body.pwd;
  var results = {};
  // 验证参数的有效性
  if (!name) {
    results.code = -1;
    results.msg = '用户名不能为空';
    return;
  }

  if (!pwd) {
    results.code = -1;
    results.msg = '密码不能为空';
    return;
  }
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('user').find({
      name: name,
      pwd: pwd
    }).toArray(function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '查询数据库失败';
      } else if (data.length <= 0) {
        results.code = -1;
        results.msg = '用户名或密码错误';
      } else {
        // 登录成功
        results.code = 0;
        results.msg = '登录成功';
        results.data = {
          name: data[0].name,
          //传给前端，作登录验证
          nickname: data[0].nickname

        }
      }
      client.close();
      res.json(results);
    })
  })
});

// 注册的接口：127.0.0.1:3000/api/register
app.post('/api/register', function (req, res) {
  var name = req.body.name;
  var pwd = req.body.pwd;
  var nickname = req.body.nickname;
  var age = parseInt(req.body.age);
  var sex = req.body.sex;
  var isAdmin = req.body.isAdmin === '是' ? true : false;
  var results = {};
  //若通过正则，则不可能为空
  // if (!name) {
  //   results.code = -1;
  //   results.msg = '用户名不能为空';
  //   return;
  // }
  // if (!pwd) {
  //   results.code = -1;
  //   results.msg = '密码不能为空';
  //   return;
  // }
  // if (!nickname) {
  //   results.code = -1;
  //   results.msg = '昵称不能为空';
  //   return;
  // }
  // if (!age) {
  //   results.code = -1;
  //   results.msg = '年龄不能为空';
  //   return;
  // }
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    async.series([
      function (cb) {
        db.collection('user').find({ name: name }).count(function (err, num) {
          if (err) {
            cb(err)
          } else if (num > 0) {
            // 该用户名已注册，
            cb(new Error('该用户名已被注册'));
          } else {
            // 可以注册
            cb(null);
          }
        })
      },
      function (cb) {
        db.collection('user').insertOne({
          name: name,
          pwd: pwd,
          nickname: nickname,
          age: age,
          sex: sex,
          isAdmin: isAdmin
        }, function (err) {
          if (err) {
            cb(err);
          } else {
            cb(null);
          }
        })
      }
    ], function (error, result) {
      if (error) {
        results.code = -1;
        results.msg = error.message;
      } else {
        results.code = 0;
        results.msg = '注册成功';
      }
      client.close();
      res.json(results);
    })
  })
});


// 用户列表的接口127.0.0.1:3000/api/users/list
app.get('/api/users/list', function (req, res) {
  var page = parseInt(req.query.page);// 页码
  var pageSize = parseInt(req.query.pageSize);// 每页显示的条数
  var totalSize = 0;// 总条数
  var totalPage = 0;// 总页数
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    async.series([
      function (cb) {
        db.collection('user').find().count(function (err, num) {
          if (err) {
            cb(err);
          } else {
            totalSize = num;
            cb(null);
          }
        })
      },
      function (cb) {
        db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        })
      }
    ], function (err, result) {
      if (err) {
        results.code = -1;
        results.msg = err.message;
      } else {
        totalPage = Math.ceil(totalSize / pageSize);
        results.code = 0;
        results.msg = '查询数据库成功';
        results.data = {
          list: result[1],
          totalPage: totalPage,
          page: page
        }
      }
      client.close();
      res.json(results);
    })
  })
});

// 删除用户的接口127.0.0.1:3000/api/users/delete
app.get('/api/users/delete', function (req, res) {
  var id = req.query.id;
  //console.log(id);
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('user').deleteOne({
      //将前端传过来的id转化成数据库所需的id
      _id: ObjectId(id)
    }, function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '删除数据失败';
      } else {
        // 删除成功
        results.code = 0;
        results.msg = '删除成功';
      }
      client.close();
      res.json(results);
    })
  })

});

// 用户搜索的接口127.0.0.1:3000/api/users/search
app.post('/api/users/search', function (req, res) {
  var name = req.body.name;
  console.log(name);
  var filter = new RegExp(name);
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('user').find({
      nickname: filter
    }).toArray(function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '查询数据失败';
      } else if (data.length <= 0) {
        results.code = -1;
        results.msg = '当前无数据';
      } else {
        // 查询成功
        results.code = 0;
        results.msg = '查询成功';
        results.data = {
          list: data
        }
      }
      client.close();
      res.json(results);
    })
  })
});


// 新增手机的接口：127.0.0.1:3000/api/phone/add
app.post('/api/phone/add', upload.single('file'), function (req, res) {
  var name = req.body.name;
  var brand = req.body.brand;
  var price = req.body.price;
  var recyclePrice = req.body.recyclePrice;
  var results = {};
  if (!name) {
    results.code = -1;
    results.msg = '手机名称不能为空';
    return;
  }
  if (!price) {
    results.code = -1;
    results.msg = '手机官方价格不能为空';
    return;
  }
  if (!recyclePrice) {
    results.code = -1;
    results.msg = '请输入您想要的回收价格';
    return;
  }
  // 如果想要通过浏览器访问到这张图片的话，是不是需要将图片放到public里面去
  var filename = 'phoneImg/' + new Date().getTime() + '_' + req.file.originalname;
  var newFileName = path.resolve(__dirname, 'public/', filename);
  try {
    var data = fs.readFileSync(req.file.path);
    fs.writeFileSync(newFileName, data);
    // 操作数据库写入
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
      var db = client.db('project');

      db.collection('phone').insertOne({
        name: name,
        brand: brand,
        price: price,
        recyclePrice: recyclePrice,
        fileName: filename
      }, function (err) {

        results.code = 0;
        results.msg = '新增手机成功';
        res.json(results);
      })
      client.close();

    })

  } catch (error) {
    console.log(error);
    results.code = -1;
    results.msg = 'error';
    res.json(results);
  }
});

// 手机列表的接口127.0.0.1:3000/api/phone/list
app.get('/api/phone/list', function (req, res) {
  var page = parseInt(req.query.page);// 页码
  var pageSize = parseInt(req.query.pageSize);// 每页显示的条数
  var totalSize = 0;// 总条数
  var totalPage = 0;// 总页数
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    async.series([
      function (cb) {
        db.collection('phone').find().count(function (err, num) {
          if (err) {
            cb(err);
          } else {
            totalSize = num;
            cb(null);
          }
        })
      },
      function (cb) {
        db.collection('phone').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        })
      }
    ], function (err, result) {
      if (err) {
        results.code = -1;
        results.msg = err.message;
      } else {
        totalPage = Math.ceil(totalSize / pageSize);
        results.code = 0;
        results.msg = '查询数据库成功';
        results.data = {
          list: result[1],
          totalPage: totalPage,
          page: page
        }
      }
      client.close();
      res.json(results);
    })
  })
});

// 删除手机的接口127.0.0.1:3000/api/phone/delete
app.get('/api/phone/delete', function (req, res) {
  var id = req.query.id;
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('phone').deleteOne({
      //将前端传过来的id转化成数据库所需的id
      _id: ObjectId(id)
    }, function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '删除数据失败';
      } else {
        // 删除成功
        results.code = 0;
        results.msg = '删除成功';
      }
      client.close();
      res.json(results);
    })
  })

});

//渲染修改的接口
app.get('/api/phone/updateShow', function (req, res) {
  var id = req.query.id;
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('phone').find({
      _id: ObjectId(id)
    }).toArray(function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '查询数据失败';
      } else if (data.length <= 0) {
        results.code = -1;
        results.msg = '当前无数据';
      } else {
        // 查询成功
        results.code = 0;
        results.msg = '查询成功';
        results.data = {
          list: data
        }
      }
      client.close();
      res.json(results);
    })
  });

});

// 修改手机的接口127.0.0.1:3000/api/phone/update 
app.post('/api/phone/update', upload.single('file'), function (req, res) {
  var id = req.body.id;

  var name = req.body.name;
  var brand = req.body.brand;
  var price = req.body.price;
  var recyclePrice = req.body.recyclePrice;

  var results = {};
  if (!name) {
    results.code = -1;
    results.msg = '手机名称不能为空';
    return;
  }
  if (!price) {
    results.code = -1;
    results.msg = '手机官方价格不能为空';
    return;
  }
  if (!recyclePrice) {
    results.code = -1;
    results.msg = '请输入您想要的回收价格';
    return;
  }

  var filename = 'phoneImg/' + new Date().getTime() + '_' + req.file.originalname;
  var newFileName = path.resolve(__dirname, 'public/', filename);
  try {
    var data = fs.readFileSync(req.file.path);
    fs.writeFileSync(newFileName, data);
    // 操作数据库写入
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
      var db = client.db('project');

      db.collection('phone').updateOne({ _id: ObjectId(id) }, {
        $set: {
          name: name,
          brand: brand,
          price: price,
          recyclePrice: recyclePrice,
          fileName: filename
        }
      }, function (err) {

        results.code = 0;
        results.msg = '修改成功';
        res.json(results);
      })
      client.close();

    })

  } catch (error) {
    console.log(error);
    results.code = -1;
    results.msg = 'error';
    res.json(results);
  }
});

// 新增品牌的接口：127.0.0.1:3000/api/brand/add
app.post('/api/brand/add', upload.single('file'), function (req, res) {
  var name = req.body.name;
  var results = {};
  if (!name) {
    results.code = -1;
    results.msg = '品牌名称不能为空';
    return;
  }
  console.log(req.file);
  // 如果想要通过浏览器访问到这张图片的话，是不是需要将图片放到public里面去
  var filename = 'phoneImg/' + new Date().getTime() + '_' + req.file.originalname;
  var newFileName = path.resolve(__dirname, 'public/', filename);
  try {
    var data = fs.readFileSync(req.file.path);
    fs.writeFileSync(newFileName, data);
    // 操作数据库写入
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
      var db = client.db('project');

      db.collection('brand').insertOne({
        name: name,
        fileName: filename
      }, function (err) {
        results.code = 0;
        results.msg = '新增手机成功';
        res.json(results);
      })
      client.close();
    })

  } catch (error) {
    console.log(error);
    results.code = -1;
    results.msg = 'error';
    res.json(results);
  }
});

// 品牌列表的接口127.0.0.1:3000/api/brand/list
app.get('/api/brand/list', function (req, res) {
  var page = parseInt(req.query.page);// 页码
  var pageSize = parseInt(req.query.pageSize);// 每页显示的条数
  var totalSize = 0;// 总条数
  var totalPage = 0;// 总页数
  var results = {};

  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    async.series([
      function (cb) {
        db.collection('brand').find().count(function (err, num) {
          if (err) {
            cb(err);
          } else {
            totalSize = num;
            cb(null);
          }
        })
      },
      function (cb) {
        db.collection('brand').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        })
      }
    ], function (err, result) {
      if (err) {
        results.code = -1;
        results.msg = err.message;
      } else {
        totalPage = Math.ceil(totalSize / pageSize);
        results.code = 0;
        results.msg = '查询数据库成功';
        results.data = {
          list: result[1],
          totalPage: totalPage,
          page: page
        }
      }
      client.close();
      res.json(results);
    })
  })
});

// 删除某个品牌的接口127.0.0.1:3000/api/brand/delete
app.get('/api/brand/delete', function (req, res) {
  var id = req.query.id;
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('brand').deleteOne({
      //将前端传过来的id转化成数据库所需的id
      _id: ObjectId(id)
    }, function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '删除数据失败';
      } else {
        // 删除成功
        results.code = 0;
        results.msg = '删除成功';
      }
      client.close();
      res.json(results);
    })
  })

});

//渲染品牌修改的接口
app.get('/api/brand/updateShow', function (req, res) {
  var id = req.query.id;
  var results = {};
  MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
    if (err) {
      results.code = -1;
      results.msg = '连接数据库失败';
      res.json(results);
      return;
    }
    var db = client.db('project');
    db.collection('brand').find({
      _id: ObjectId(id)
    }).toArray(function (err, data) {
      if (err) {
        results.code = -1;
        results.msg = '查询数据失败';
      } else if (data.length <= 0) {
        results.code = -1;
        results.msg = '当前无数据';
      } else {
        // 查询成功
        results.code = 0;
        results.msg = '查询成功';
        results.data = {
          list: data
        }
      }
      client.close();
      res.json(results);
    })
  });

});

// 修改品牌的接口127.0.0.1:3000/api/brand/update
app.post('/api/brand/update', upload.single('file'), function (req, res) {
  var id = req.body.id;

  var name = req.body.name;

  var results = {};
  if (!name) {
    results.code = -1;
    results.msg = '手机品牌不能为空';
    return;
  }


  var filename = 'phoneImg/' + new Date().getTime() + '_' + req.file.originalname;
  var newFileName = path.resolve(__dirname, 'public/', filename);
  try {
    var data = fs.readFileSync(req.file.path);
    fs.writeFileSync(newFileName, data);
    // 操作数据库写入
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
      var db = client.db('project');

      db.collection('brand').updateOne({ _id: ObjectId(id) }, {
        $set: {
          name: name,
          fileName: filename
        }
      }, function (err) {

        results.code = 0;
        results.msg = '修改成功';
        res.json(results);
      })
      client.close();

    })

  } catch (error) {
    console.log(error);
    results.code = -1;
    results.msg = 'error';
    res.json(results);
  }
});

app.listen(3000);
