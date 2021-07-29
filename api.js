/*
 * @Date: 2021-07-19 18:31:30
 * @LastEditors: E'vils
 * @LastEditTime: 2021-07-20 15:48:44
 * @Description:
 * @FilePath: /api.js
 */

const fs = require("fs-extra");
const async = require("async");
const marked = require("marked");

var fliesdata = [];
/**
 * 文件写入
 */
const flieWrite = (data) => {
  fs.writeFileSync("api.json", JSON.stringify(data), function (err) {
    if (err) throw err;
  });
};
/**
 * 文件读取解析
 * @param {*} url
 * @return {*}
 */
const fileread = (url, cb2) => {
  // 读取文件
  const myFile = fs.readFileSync(url, "utf8");
  const tokens = marked.lexer(myFile);
  var _temp = {
    name: "",
    desc: [],
    attrs: [],
    tips: [],
  };
  var _arr = [];
  // 遍历markdowm节点树
  tokens.map((c, i) => {
    // console.log(`c`, c);
    // 判断是否是开头,并将名字写入
    const regexs = new RegExp("^uni.");
    if (c.type == "heading" && regexs.test(c.text)) {
      if (_temp.name) {
        _arr.push(_temp);
        _temp = {
          name: "",
          desc: [],
          attrs: [],
          tips: [],
        };
      }
      _temp.name = c.text;
      _temp.desc.push(tokens[i + 1].text);
    }
    // 判断是否是属性
    const regex = new RegExp("属性名|属性");
    if (c.type == "table" && regex.test(c.header[0])) {
      if (c.cells.length > 0) {
        // 遍历属性
        c.cells.map((e) => {
          _temp.attrs.push({
            name: e[0].replace("@", ""),
            type: { name: e[1] },
            defaultValue: e[2],
            desc: [e[3]],
            since: e[4],
          });
        });
      }
    }
    // 判断是否是tips的list
    if (c.type == "list") {
      c.items.forEach((d) => {
        _temp.tips.push(d.text);
      });
    }
    // 判断是否是tips的list
    if (c.type == "code") {
      console.log(`c`, c.text);
    }
  });
  // console.log(`_temp`, _temp);
  // 传入全局数据
  _arr.push(_temp);
  fliesdata.push(_arr);
  // 打印可能报错的内容列表
  if (_temp.attrs.length == 0) {
    console.log(`error`, _temp.name);
  }
  cb2(null, _temp);
};
// 获取文件列表并执行操作
const getList = async () => {
  // const files = await fs.readdir("./docs/api/");
  // console.log("[ files ]", files);
  let files = ["key.md"];
  asyncWrite(files);
};
// map文件列表,并一条一条的读取操作
const asyncWrite = (files) => {
  async.mapLimit(
    files,
    1,
    function (coll, cb2) {
      let url = `./docs/api/${coll}`;
      fileread(url, cb2);
    },
    function (err, results) {
      if (err) {
        console.log(`err`, err);
      }
      if (results) {
        // 写入文件
        flieWrite(fliesdata);
        console.log(`结束了`);
      }
    }
  );
};

getList();
