/*
 * @Date: 2021-07-21 10:11:28
 * @LastEditors: E'vils
 * @LastEditTime: 2021-07-22 18:18:22
 * @Description:
 * @FilePath: /uviewDoc.js
 */

const async = require("async");
// const request = require("request");
const https = require("https");
const fs = require("fs");
const cheerio = require("cheerio");

let fliesdata = [];
/**
 * 文件写入
 */
const flieWrite = (data) => {
  fs.writeFileSync(
    "./res/uview-components.json",
    JSON.stringify(data),
    function (err) {
      if (err) throw err;
    }
  );
};
const getPage = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let html = "";
        res.on("data", (data) => {
          html += data;
        });
        res.on("end", () => {
          resolve(html);
        });
      })
      .on("error", () => {});
  });
};
/**
 * 获取api的列表
 */
function getPageTitle() {
  return new Promise((resolve, reject) => {
    getPage("https://www.uviewui.com/components/checkbox.html").then((html) => {
      const $ = cheerio.load(html);
      let sidebar = $(".sidebar-link");
      let pageList = [];
      sidebar.each(function (i, elem) {
        let title = $(this).text();
        let regex = new RegExp("^[a-zA-Z]");
        let exclude = new RegExp("Nvue排错指南 | Color 色彩");
        if (regex.test(title) && !exclude.test(title)) {
          let linkUrl = $(this)
            .text()
            .replace(/[\u4e00-\u9fa5\u3001-\u3003\uff1f\uff0c]+/g, "")
            .trim()
            .toLowerCase();
          pageList.push(linkUrl);
        }
      });
      resolve(pageList);
    });
  });
}
/**
 * 驼峰转横线
 */
function getKebabCase2(str) {
  str = str.replace(/\s+/g, "");
  return str
    .replace(/[A-Z]/g, function (item) {
      return "-" + item.toLowerCase();
    })
    .replace(/^-/, "");
}
/**
 * 获取详细api值
 */
const getApi = (url, coll, cb2) => {
  getPage(url).then((html) => {
    const $ = cheerio.load(html);
    // 获取api
    let api = $("#api");
    let props = api.nextAll("h3");
    // 判断类型
    let regeProps = new RegExp("Props");
    let regeEvent = new RegExp("Events|Event");
    let regeSlots = new RegExp("Slot");
    let regMethods = new RegExp("Methods");
    //判断是否是item项
    let itemList = [];
    props.each(function (i, e) {
      let name = $(this).text().replace("#", "").trim();
      if (regeProps.test(name)) {
        // 判断为Props
        let _coll = name.replace(regeProps, "").trim();
        if (_coll) {
          itemList.push({
            tableName: name,
            coll: _coll,
          });
        } else {
          setData(
            coll,
            false,
            $,
            props,
            regeProps,
            regeEvent,
            regeSlots,
            regMethods
          );
        }
      }
    });
    if (itemList.length > 0) {
      itemList.forEach((item, idx) => {
        setData(
          item.coll,
          item.tableName,
          $,
          props,
          regeProps,
          regeEvent,
          regeSlots,
          regMethods
        );
      });
    }
    cb2(null, props);
  });
};

function setData(
  coll,
  tableName,
  $,
  props,
  regeProps,
  regeEvent,
  regeSlots,
  regMethods
) {
  let _temp = {
    name: `u-${getKebabCase2(coll)}`,
    desc: [],
    attrs: [],
    tips: [],
    docLink: `https://www.uviewui.com/components/${coll}.html`,
  };
  // 获取说明
  let desc = $("h2").nextAll("p").first().text().trim();
  _temp.desc.push(desc);
  let regTable = new RegExp(/./);
  if (tableName) {
    regTable = new RegExp(coll);
  }
  // 表格内容遍历
  props.each(function (i, e) {
    let name = $(this).text().replace("#", "").trim();
    let _data = $(this).nextAll("table").first();
    if (regeProps.test(name) && regTable.test(name)) {
      // 判断为Props
      isProps($, _data, _temp);
    }
    if (regeEvent.test(name) && regTable.test(name)) {
      // 判断为Event
      isEvent($, _data, _temp);
    }
    if (regeSlots.test(name) && regTable.test(name)) {
      // 判断为slot
      isSlot(_data, $, _temp);
    }
    if (regMethods.test(name) && regTable.test(name)) {
      isSlot(_data, $, _temp, "ref");
      // 判断为ref调用的模块
    }
  });
  fliesdata.push(_temp);
}

function getLocation(_data) {
  let apirProp = _data.children("thead").text().split(" ");
  let param = new RegExp("参数|事件名|属性名|名称|方法名");
  let DocName = new RegExp("说明");
  let TypeName = new RegExp("类型");
  let defaultName = new RegExp("默认值");
  let eunmName = new RegExp("可选值");
  let attrName;
  let attrDesc;
  let attrType;
  let attrdefault;
  let attrenum;
  apirProp.forEach((v, i) => {
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
  let DataArr = _data.children("tbody");
  return {
    propList,
    DataArr,
    attrName,
    attrDesc,
    attrType,
    attrdefault,
    attrenum,
  };
}

/**
 * 如果是slot
 */
function isSlot(_data, $, _temp, name = "slot") {
  let { propList, DataArr, attrName, attrDesc } = getLocation(_data);
  let elm = [];
  DataArr.children("tr").each(function (id, elem) {
    var _telm = {
      value: "",
      desc: [],
    };
    $(this)
      .children("td")
      .each(function (i, elem) {
        if (propList[i] == attrName) {
          _telm.value = $(this).text().trim();
        } else if (propList[i] == attrDesc) {
          _telm.desc.push($(this).text().trim());
        }
      });
    elm.push(_telm);
  });
  _temp.attrs.push({
    name: name,
    type: { name: "String" },
    defaultValue: "",
    desc: ["插槽"],
    since: "",
    enum: elm,
  });
}

/**
 * 如果是props参数如下处理
 * @param {*} _data
 * @param {*} _temp
 * @return {*}
 */
function isProps($, _data, _temp) {
  let {
    propList,
    DataArr,
    attrName,
    attrDesc,
    attrType,
    attrdefault,
    attrenum,
  } = getLocation(_data);
  DataArr.children("tr").each(function (id, elem) {
    let e = [];
    let elm = [];
    let since = "";
    e[attrDesc] = [];
    $(this)
      .children("td")
      .each(function (i, elem) {
        const sinceReg = /[0-9]|\.+/g;
        const modeName = /[a-zA-Z-]/g;
        let _t = $(this).text();
        // 处理值为空的情况
        if (_t == "-") {
          _t = "";
        }
        // 处理可选值的情况
        if (propList[i] == attrenum && _t) {
          // 去除所有空格
          _t = _t.replace(/\s+/g, "");
          let list = _t.split(/[\\\/\|]/g);
          list.map((v) => {
            if (v) {
              elm.push({
                value: v,
                desc: [],
              });
            }
          });
          if (e[attrdefault]) {
            elm.push({
              value: e[attrdefault],
              desc: [],
            });
          }
          return;
        }
        if (sinceReg.test(_t) && propList[i] == attrName) {
          e[propList[i]] = _t.replace(sinceReg, "").trim();
          since = _t.replace(modeName, "").trim();
        }
        // 处理desc 情况
        else if (propList[i] == attrDesc) {
          e[attrDesc].push(_t);
        } else {
          e[propList[i]] = _t;
        }
      });
    // 处理值类型为布尔的情况
    if (e[attrType] == "Boolean" || e[attrType] == "boolean") {
      const yes = e[attrDesc]?.[0]?.replace("是否", "");
      const no = e[attrDesc]?.[0]?.replace("是否", "不");
      elm = [
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
    _temp.attrs.push({
      name: e[attrName],
      type: { name: e[attrType] },
      defaultValue: e[attrdefault],
      desc: e[attrDesc],
      since: since,
      enum: elm,
    });
  });
}
/**
 * 如果是Event参数如下处理
 * @param {*} _data
 * @param {*} _temp
 * @return {*}
 */
function isEvent($, _data, _temp) {
  let { propList, DataArr, attrName, attrDesc } = getLocation(_data);
  DataArr.children("tr").each(function (id, elem) {
    let e = [];
    let since = "";
    e[attrDesc] = [];
    $(this)
      .children("td")
      .each(function (i, elem) {
        const sinceReg = /[0-9]|\.+/g;
        const modeName = /[a-zA-Z-]/g;
        let _t = $(this).text();
        // 处理值为空的情况
        if (_t == "-") {
          _t = "";
        }
        // 处理name
        if (propList[i] == attrName) {
          e[propList[i]] = _t.trim();
        }
        // 处理desc
        if (propList[i] == attrDesc) {
          e[attrDesc].push(_t);
        }
        if (sinceReg.test(_t) && propList[i] == attrName) {
          e[propList[i]] = _t.replace(sinceReg, "").trim();
          since = _t.replace(modeName, "").trim();
        }
      });
    _temp.attrs.push({
      name: e[attrName],
      type: { name: "Function" },
      defaultValue: "",
      desc: e[attrDesc],
      since: since,
      enum: [],
    });
  });
}

const asyncWrite = async () => {
  let files = await getPageTitle();
  console.log(`files`, files);
  //   let files = ["loading"];
  async.mapLimit(
    files,
    1,
    function (coll, cb2) {
      let url = `https://www.uviewui.com/components/${coll}.html`;
      console.log(`coll`, coll);
      getApi(url, coll, cb2);
    },
    function (err, results) {
      if (err) {
      }
      if (results) {
        // 写入文件
        flieWrite(fliesdata);
        console.error(`end`);
      }
    }
  );
};
asyncWrite();
