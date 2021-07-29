/*
 * @Date: 2021-07-19 18:31:30
 * @LastEditors: E'vils
 * @LastEditTime: 2021-07-22 18:27:39
 * @Description:
 * @FilePath: /doc.js
 */

const fs = require("fs-extra");
const async = require("async");
const marked = require("marked");

var fliesdata = [];
/**
 * 是测试
 */
const isTest = false;
/**
 * 文件写入
 */
const flieWrite = (data) => {
  let url = isTest ? "components.json" : "./res/components.json";
  fs.writeFileSync(url, JSON.stringify(data), function (err) {
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
    docLink: "",
  };
  // 遍历markdowm节点树
  tokens.map((c, i) => {
    // console.log(`c`, c);
    // 判断是否是开头,并将名字写入
    if (c.type == "heading" && !_temp.name) {
      _temp.name = c.text;
      _temp.desc.push(tokens[i + 1].text);
      _temp.docLink = `https://uniapp.dcloud.io/component/${c.text}`;
    }
    // 判断是否是属性
    const regexsx = new RegExp("属性名|属性");
    const regexz = new RegExp("值|模式");
    if (c.type == "table" && regexsx.test(c.header[0])) {
      let { propList, attrName, attrDesc, attrType, attrdefault, attrenum } =
        getLocation(c.header);
      if (c.cells.length > 0) {
        // 遍历属性
        c.cells.map((e) => {
          let _enum = [];
          // 如果属性是布尔,增加可选项并根据文档生成描述
          if (e[attrType] == "Boolean" || e[attrType] == "boolean") {
            const yes = e[attrDesc]?.replace("是否", "");
            const no = e[attrDesc]?.replace("是否", "不");
            _enum = [
              {
                value: "true",
                desc: [yes],
              },
              {
                value: "false",
                desc: [no],
              },
            ];
          }
          if (e[attrenum] == "&nbsp;") {
            e[attrenum] = "";
          }
          // 如果是有@符号,增加一个bind词条
          if (/@/.test(e[attrName])) {
            _temp.attrs.push({
              name: e[attrName]?.replace("@", "bind"),
              type: { name: e[attrType] },
              defaultValue: e[attrdefault] || "",
              desc: [e[attrDesc] || ""],
              since: e[attrenum] || "",
              enum: _enum,
            });
          }
          _temp.attrs.push({
            name: e[attrName]?.replace("@", ""),
            type: { name: e[attrType] },
            defaultValue: e[attrdefault] || "",
            desc: [e[attrDesc] || ""],
            since: e[attrenum] || "",
            enum: _enum,
          });
        });
      }
    }
    if (c.type == "table") {
      // console.log(`tokens[i - 2]`, c);
    }
    if (c.type == "table" && regexz.test(c.header[0])) {
      const z = new RegExp("值|模式");
      let vId = 0;
      let docId = 1;
      c.header.forEach((v, i) => {
        if (v == "值") {
          vId = i;
        }
        if (v == "说明") {
          docId = i;
        }
      });
      var enumName = "";
      const regyxz = new RegExp(".?有效值");
      [1, 2, 3, 4, 5, 6].map((j) => {
        if (regyxz.test(tokens[i - j].text) && !enumName) {
          enumName = tokens[i - j].tokens?.[0]?.text.match(/[\w-]/g).join("");
        }
      });
      if (!enumName) {
        return;
      }
      let valArr = c.cells.map((e) => {
        return {
          value: e[vId],
          desc: e[docId],
        };
      });
      // console.log(enumName, `:`, valArr);
      _temp.attrs = _temp.attrs.map((v) => {
        if (v.name == enumName) {
          v.enum = valArr;
        }
        return v;
      });
    }
    // 判断是否是tips的list
    if (c.type == "list") {
      c.items.forEach((d) => {
        _temp.tips.push(d.text);
      });
    }
  });
  // console.log(`_temp`, _temp);
  // 传入全局数据
  fliesdata.push(_temp);
  // 打印可能报错的内容列表
  if (_temp.attrs.length == 0) {
    console.log(`error`, _temp.name);
  }
  cb2(null, _temp);
};
// 获取文件列表并执行操作
const getList = async () => {
  let files = [];
  if (isTest) {
    files = ["image.md"];
  } else {
    files = await fs.readdir("./docs/component");
    console.log("[ files ]", files);
  }
  asyncWrite(files);
};
// map文件列表,并一条一条的读取操作
const asyncWrite = (files) => {
  async.mapLimit(
    files,
    1,
    function (coll, cb2) {
      let url = `./docs/component/${coll}`;
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
function getLocation(data) {
  let param = new RegExp("参数|事件名|属性名|名称|方法名");
  let DocName = new RegExp("^说明");
  let TypeName = new RegExp("类型");
  let defaultName = new RegExp("默认值|默认");
  let eunmName = new RegExp("平台说明|平台");
  let attrName;
  let attrDesc;
  let attrType;
  let attrdefault;
  let attrenum;
  data.forEach((v, i) => {
    if (param.test(v)) {
      attrName = i;
    } else if (DocName.test(v)) {
      attrDesc = i;
    } else if (TypeName.test(v)) {
      attrType = i;
    } else if (defaultName.test(v)) {
      attrdefault = i;
    } else if (eunmName.test(v)) {
      attrenum = i;
    }
  });
  let propList = [attrName, attrDesc, attrType, attrdefault, attrenum];
  return {
    propList,
    attrName,
    attrDesc,
    attrType,
    attrdefault,
    attrenum,
  };
}
