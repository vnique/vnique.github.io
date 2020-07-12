"use strict";
/**
 * 企业版微信通讯录相关功能
 */

/**
 * 加载微信企业版文件，网页script方法加载太不靠谱了
 */
function loadWxAddressFile(callback) {
  // alert("企业微信文件又没有加载完，用备用方案加载")
  var jweixinFile = document.createElement("script");
  jweixinFile.setAttribute(
    "src",
    "https://res.wx.qq.com/open/js/jweixin-1.2.0.js"
  );
  jweixinFile.onload = function () {
    // alert("企业微信加载完成111")
    var jwxworkFile = document.createElement("script");
    jwxworkFile.setAttribute(
      "src",
      "https://open.work.weixin.qq.com/wwopen/js/jwxwork-1.0.0.js"
    );
    jwxworkFile.onload = function () {
      // alert("企业微信加载完成")
      callback && callback();
    };
    document.head.appendChild(jwxworkFile);
  };
  document.head.appendChild(jweixinFile);
}

/**
 * 调用接口拿到参数后初始化 wx.config
 *
 * 接口 ${ours_contextPath}/enterpriseWechat.do?method=agentApi
 *
 * 使用该方法需要引入 <script src="//res.wx.qq.com/open/js/jweixin-1.2.0.js"></script>
 *
 * @param {Function} callback 回调
 */

function initConfig(callback) {
  console.log("initConfig");
  var url = ours.getContextPath() + "enterpriseWechat.do?method=jsapi";
  var data = {
    url: window.location.href.split("#")[0],
  };
  data["corpId"] = ours.cookie("corp_id");
  var jsApiList = [
    "onMenuShareTimeline",
    "onMenuShareAppMessage",
    "onMenuShareQQ",
    "onMenuShareWeibo",
    "hideOptionMenu",
    "showOptionMenu",
    "getLocation",
    "openLocation",
    "closeWindow",
    "scanQRCode",
    "previewFile",
    "chooseImage",
    "uploadImage",
    "getLocalImgData",
    "previewImage",
  ];
  $.ajax({
    url: url,
    data: data,
    success: function success(resData) {
      var data = JSON.parse(resData.msg);
      var configData = {
        beta: true,
        debug: false,
        appId: data.appId,
        timestamp: data.timestamp,
        nonceStr: data.nonceStr,
        signature: data.signature,
        jsApiList: jsApiList,
      };
      console.log("wx.config", configData);
      wx.config(configData);
      wx.ready(function (ready) {
        callback && callback("ready", ready);
        console.log("wx.ready", ready);

        // if (ours.wxAddressBook) {
        //   ours.wxAddressBook.initConfigStatus = true
        // }

        // alert("wx.ready");
      });
      wx.error(function (error) {
        callback && callback("error", error);
        console.error("wx.error", error);
        // // alert("wx.error")
      });
    },
    dataType: "json",
  });
}
/**
 * 调用接口拿到参数后初始化 wx.agentConfig
 *
 * 接口 ${ours_contextPath}/enterpriseWechat.do?method=agentApi
 *
 * 使用该方法需要引入 <script src="//open.work.weixin.qq.com/wwopen/js/jwxwork-1.0.0.js"></script>
 *
 * @param {Number} agentid agentid
 * @param {Function} callback 回调
 */
function initAgentConfig(agentid, callback) {
  console.log("initAgentConfig");
  // // alert("initAgentConfig")
  var urla = ours.getContextPath() + "enterpriseWechat.do?method=agentApi";
  var data = {
    url: window.location.href.split("#")[0],
  };
  data["corpId"] = ours.cookie("corp_id");
  var jsApiList = [
    "onMenuShareTimeline",
    "onMenuShareAppMessage",
    "onMenuShareQQ",
    "onMenuShareWeibo",
    "hideOptionMenu",
    "showOptionMenu",
    "getLocation",
    "openLocation",
    "closeWindow",
    "scanQRCode",
    "previewFile",
    "chooseImage",
    "uploadImage",
    "getLocalImgData",
    "previewImage",
  ];
  $.ajax({
    url: urla,
    data: data,
    success: function success(resData) {
      var data = JSON.parse(resData.msg);

      var config = {
        corpid: ours.cookie("corp_id"),
        beta: true,
        debug: false,
        agentid: data.agentId,
        timestamp: data.JsAPISignature.timestamp,
        nonceStr: data.JsAPISignature.nonceStr,
        signature: data.JsAPISignature.signature,
        jsApiList: jsApiList,
        success: function () {
          callback && callback("success");
          console.log("wx.agentConfig.success");
          // // alert("wx.agentConfig.success")

          // if (ours.wxAddressBook) {
          //   ours.wxAddressBook.initAgentConfigStatus = true
          // }

          // WWOpenData.on("sessionTimeout", function (params) {
          //   console.log("WWOpenDatasessionTimeout", params);
          // });

          // WWOpenData.on("error", function (params) {
          //   console.log("WWOpenDataError", params);
          // });

          // WWOpenData.on("update", function (params) {
          //   console.log("WWOpenDataupdate", params);
          // });
          // // alert("???");
          // alert("wx.agentConfig.success");
          setInterval(function () {
            WWOpenData.bindAll(document.querySelectorAll("ww-open-data"));
            console.log("WWOpenData.bindAll");
            // // alert("重新刷新页面元素")
          }, 1000);
        },
        fail: function (res) {
          callback && callback("fail", res);
          // alert("通讯录组件初始化失败");
          console.error("wx.agentConfig.fail", res);
        },
      };
      console.log("wx.agentConfig", config);
      // // alert(JSON.stringify(config))
      wx.agentConfig(config);
    },
    dataType: "json",
  });
}

/**
 * 通讯录展示组件
 * @param {Number} agentid agentid
 * @param {Function} callback 回调
 */
function initAddressBooks(agentid, callback) {
  // console.log("initAddressBooks");

  console.log("initAddressBooks", ours.wxAddressBook.initAddressBooksStatus);
  if (ours.wxAddressBook.initAddressBooksStatus) {
    // alert("加载啥呢。跳过");
    callback && callback();
    return;
  }
  // alert("initAddressBooks!!");
  ours.wxAddressBook.initAddressBooksStatus = true;
  loadWxAddressFile(function () {
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      var times = 0;

      initConfig(function (data) {
        if (data == "ready") {
          if (times == 0) {
            times = times + 1;
            setTimeout(function () {
              if (times != 2) {
                initAgentConfig(agentid, callback);
              }
            }, 2000);
            return;
          }
          times = 2;

          initAgentConfig(agentid, callback);
        }
      });
    } else {
      initAgentConfig(agentid, callback);
    }
  });

  // if (/MicroMessenger/i.test(navigator.userAgent)) {
  //   var times = 0;

  //   initConfig(function (data) {
  //     if (data == "ready") {
  //       if (times == 0) {
  //         times = times + 1;
  //         setTimeout(function () {
  //           if (times != 2) {
  //             initAgentConfig(agentid, callback);
  //           }
  //         }, 2000);
  //         return;
  //       }
  //       times = 2;

  //       initAgentConfig(agentid, callback);
  //     }
  //   });
  // } else {
  //   initAgentConfig(agentid, callback);
  // }
  // ours.wxAddressBook.initAddressBooksStatus = true;
}

/**
 * 替换标题中的userId
 * @param {*} params 标题
 */
function replaceAddressName(params) {
  console.log("自动", params);
  return params
    .replace(/\s/g, "")
    .replace(
      /(<<([^<>].*?)>>)/g,
      '<ww-open-data type="userName" openid="$2"></ww-open-data>'
    )
    .replace(
      /(\[\[([^\[\]].*?)\]\])/g,
      '<ww-open-data type="departmentName" openid="$2"></ww-open-data>'
    );
}

/**
 * 替换多选人为微信通讯录展示
 * @param {*} params 多选人
 */
function replaceMultiselectPersonAddressName(params) {
  return params
    .split(",")
    .map(function (e) {
      return (
        '<ww-open-data type="userName" openid="' +
        e.replace(/\s/g, "") +
        '"></ww-open-data>'
      );
    })
    .join(",");
}

/**
 * 替换多选人为微信通讯录展示
 * @param {*} params 多选部门
 */
function replaceMultiselectDepartmentAddressName(params) {
  return params
    .split(",")
    .map(function (e) {
      return (
        '<ww-open-data type="departmentName" openid="' +
        e.replace(/\s/g, "") +
        '"></ww-open-data>'
      );
    })
    .join(",");
}

/**
 * 重载微信 userId
 */
function reloadWWOpenData() {
  WWOpenData.bindAll(document.querySelectorAll("ww-open-data"));
}

/**
 * iframe 页面重载微信 userId
 */
function iframeReloadWWOpenData() {
  setInterval(function () {
    window.parent.WWOpenData.bindAll(document.querySelectorAll("ww-open-data"));
  }, 1000);
}

/**
 * 是否企业微信
 * @return {Boolean} 返回是否企业微信APP登录
 */
function isMicroMessenger() {
  if (/MicroMessenger/i.test(navigator.userAgent)) {
    return true;
  } else {
    return false;
  }
}

/**
 * 自动替换选人组件中的name
 */
function replaceName() {
  var selectInfoDom = $(".selectInfo");

  for (var index = 0; index < selectInfoDom.length; index++) {
    var element = selectInfoDom[index];
    var spdata = element.attributes.spdata;

    if (spdata) {
      var userData = JSON.parse(spdata.value); // {"admin":false,"id":"4833041175668833689","name":"DaBai","typeFlag":"person","_name":"DaBai"}

      var typeFlag = userData.typeFlag;
      var userName = userData.name;

      if (typeFlag == "person") {
        element.querySelector(
          ".selectFlex"
        ).innerHTML = ours.wxAddressBook.replaceMultiselectPersonAddressName(
          userName
        );
      }
    }
  }
}

/**
 * 劫持修改选人组件的render方法
 */
function changeSelectPersonUIRender() {
  ours.SelectPersonUI._renderA = ours.SelectPersonUI.render;

  ours.SelectPersonUI.render = function (key, data, noReplace) {
    ours.SelectPersonUI._renderA(key, data, noReplace);
    replaceName();
  };
}

/**
 * 替换选人后页面显示的内容
 */
function replaceDom() {
  var getReplaceDom = $("div[type=selectperson]");

  for (var index = 0; index < getReplaceDom.length; index++) {
    var element = getReplaceDom[index];
    var _element$attributes = element.attributes,
      type = _element$attributes.type,
      showtype = _element$attributes.showtype;

    if (type.value == "selectperson" && showtype.value == 3) {
      // 如果选人为空，则不进行任何操作333
      console.log("element.innerText", element.innerText);

      if (element.innerText == "") {
        continue;
      }

      if (
        element.innerText.indexOf(",") != -1 &&
        element.innerText.split(",")[0] == ""
      ) {
        continue;
      }

      if (element.querySelectorAll("div").length >= 1) {
        element.querySelectorAll(
          "div"
        )[0].innerHTML = ours.wxAddressBook.replaceMultiselectPersonAddressName(
          element.innerText
        );
      } else {
        element.innerHTML = ours.wxAddressBook.replaceMultiselectPersonAddressName(
          element.innerText
        );
      }
    }

    if (type.value == "selectperson" && showtype.value == 4) {
      // 如果选人为空，则不进行任何操作333
      console.log("element.innerText", element.innerText);

      if (element.innerText == "") {
        continue;
      }

      if (
        element.innerText.indexOf(",") != -1 &&
        element.innerText.split(",")[0] == ""
      ) {
        continue;
      }

      if (element.querySelectorAll("div").length >= 1) {
        element.querySelectorAll(
          "div"
        )[0].innerHTML = ours.wxAddressBook.replaceMultiselectDepartmentAddressName(
          element.innerText
        );
      } else {
        element.innerHTML = ours.wxAddressBook.replaceMultiselectDepartmentAddressName(
          element.innerText
        );
      }
    }
  }
}

/**
 * 劫持修改选人组件的点击确认方法
 */
function changeSelectPersonClick2Ok(callback) {
  callback && callback()
}

/**
 * 将新企业的Dom修改为老企业的Dom
 */
function changeToOldDom() {
  // alert("排查老企业不刷新问题")
  console.log("changeToOldDom!!")
  setInterval(function (params) {
    var wxAddressDom = document.querySelectorAll("ww-open-data");

    for (var index = 0; index < wxAddressDom.length; index++) {
      var element = wxAddressDom[index];
      wxAddressDom[index].innerHTML = element.getAttribute("openid");
    }
    console.log("changeToOldDom??")
    // // alert("排查老企业不刷新问题- 走两步不走了？")
  }, 1000);
}

/**
 * 通讯录展示组件，给formAppRightEdit4phone.jsp这个NB页面单独写的方法，这个页面几乎没法调，具体去看一下这个settimeout吧，去掉了没法执行
 * @param {*} agentid
 * @param {*} callback
 */
function initAgentConfigBug(agentid, callback) {
  var urla = ours.getContextPath() + "enterpriseWechat.do?method=agentApi";
  var data = {
    url: window.location.href.split("#")[0],
  };
  data["corpId"] = ours.cookie("corp_id");
  var jsApiList = [
    "onMenuShareTimeline",
    "onMenuShareAppMessage",
    "onMenuShareQQ",
    "onMenuShareWeibo",
    "hideOptionMenu",
    "showOptionMenu",
    "getLocation",
    "openLocation",
    "closeWindow",
    "scanQRCode",
    "previewFile",
    "chooseImage",
    "uploadImage",
    "getLocalImgData",
    "previewImage",
  ];
  $.ajax({
    url: urla,
    data: data,
    success: function success(resData) {
      // // alert("后端传initAgentConfig")
      var data = JSON.parse(resData.msg);
      var config = {
        corpid: ours.cookie("corp_id"),
        beta: true,
        debug: false,
        agentid: data.agentId,
        timestamp: data.JsAPISignature.timestamp,
        nonceStr: data.JsAPISignature.nonceStr,
        signature: data.JsAPISignature.signature,
        jsApiList: jsApiList,
        success: function success() {},
        fail: function fail(res) {
          // alert("通讯录组件初始化失败");
        },
      };
      wx.agentConfig(config);
    },
    dataType: "json",
  });
}

/**
 * 通讯录展示组件，给formAppRightEdit4phone.jsp这个NB页面单独写的方法，这个页面几乎没法调，具体去看一下这个settimeout吧，去掉了没法执行
 * @param {*} callback
 */
function initConfigBug(callback) {
  // console.log("initConfig");
  // // alert("initConfig")
  var url = ours.getContextPath() + "enterpriseWechat.do?method=jsapi";
  var data = {
    url: window.location.href.split("#")[0],
  };
  data["corpId"] = ours.cookie("corp_id");
  var jsApiList = [
    "onMenuShareTimeline",
    "onMenuShareAppMessage",
    "onMenuShareQQ",
    "onMenuShareWeibo",
    "hideOptionMenu",
    "showOptionMenu",
    "getLocation",
    "openLocation",
    "closeWindow",
    "scanQRCode",
    "previewFile",
    "chooseImage",
    "uploadImage",
    "getLocalImgData",
    "previewImage",
  ];
  $.ajax({
    url: url,
    data: data,
    success: function success(resData) {
      // // alert("后端传initConfig")
      var data = JSON.parse(resData.msg);
      var configData = {
        beta: true,
        debug: false,
        appId: data.appId,
        timestamp: data.timestamp,
        nonceStr: data.nonceStr,
        signature: data.signature,
        jsApiList: jsApiList,
      };
      // console.log("wx.config", configData);
      // // alert(JSON.stringify(configData))
      wx.config(configData);
      wx.ready(function (ready) {
        callback && callback("ready", ready);
        if (ours.wxAddressBook) {
          ours.wxAddressBook.initConfigStatus = true;
        }
        // console.log("wx.ready", ready);
        // // alert("wx.ready")
      });
      wx.error(function (error) {
        callback && callback("error", error);
        // console.error("wx.error", error);
        // // alert("wx.error")
      });
    },
    dataType: "json",
  });
}

/**
 * 通讯录展示组件，给formAppRightEdit4phone.jsp这个NB页面单独写的方法，这个页面几乎没法调，具体去看一下这个settimeout吧，去掉了没法执行
 * @param {Number} agentid agentid
 * @param {Function} callback 回调
 */
function initAddressBooksBug(agentid, callback) {
  if (/MicroMessenger/i.test(navigator.userAgent)) {
    var temp = setTimeout(function (params) {
      initAgentConfigBug(agentid, callback);
    }, 100);
    initConfigBug(function () {
      clearInterval(temp);
      temp = null;
      initAgentConfigBug(agentid, callback);
    });
  } else {
    initAgentConfigBug(agentid, callback);
  }
}

/**
 * 从SVG流程表单中获取所有的用户名id
 * @param {*} params
 */
function getNameList(params) {
  function unique(arr) {
    if (!Array.isArray(arr)) {
      console.log("type error!");
      return;
    }

    var array = [];

    for (var i = 0; i < arr.length; i++) {
      if (array.indexOf(arr[i]) === -1) {
        array.push(arr[i]);
      }
    }

    return array;
  }

  var userNameList = [];
  var departmentNameList = [];

  if ("creatorName" in params) {
    userNameList.push(params.creatorName);
  }

  if ("workFlowNodeList" in params) {
    if (params.workFlowNodeList.length > 0) {
      var workFlowNodeListData = params.workFlowNodeList;

      for (var index = 0; index < workFlowNodeListData.length; index++) {
        var workFlowNodeListDataElement = workFlowNodeListData[index];
        var nodeType = workFlowNodeListDataElement.nodeType;

        if ("nodeDisplayName" in workFlowNodeListDataElement) {
          if (workFlowNodeListDataElement.nodeDisplayName != "") {
            if (nodeType == "person") {
              userNameList.push(workFlowNodeListDataElement.nodeDisplayName);
            }

            if (nodeType == "department") {
              departmentNameList.push(workFlowNodeListDataElement.nodeDisplayName);
            }
          }
        }

        if ("nodeName" in workFlowNodeListDataElement) {
          if (workFlowNodeListDataElement.nodeName != "") {
            if (nodeType == "person") {
              userNameList.push(workFlowNodeListDataElement.nodeName);
            }

            if (nodeType == "department") {
              departmentNameList.push(workFlowNodeListDataElement.nodeName);
            }
          }
        }

        if ("nodePersonList" in workFlowNodeListDataElement) {
          var nodePersonListData = workFlowNodeListDataElement.nodePersonList;

          for (var _index = 0; _index < nodePersonListData.length; _index++) {
            var nodePersonListDataElement = nodePersonListData[_index];

            if ("personName" in nodePersonListDataElement) {
              userNameList.push(nodePersonListDataElement.personName);
            }
          }
        }
      }
    }
  }

  return {
    userNameList: unique(userNameList),
    departmentNameList: unique(departmentNameList),
    userNameListStr: unique(userNameList).join(","),
    departmentNameListStr: unique(departmentNameList).join(",")
  };
}

function formatOldData(params, callback) {
  var nameList = getNameList(params).userNameListStr;
  var departmentNameList = getNameList(params).departmentNameListStr;
  var replaceParams = params;
  ours.postData("/enterpriseWechat.do?method=getNickByWechatId", {
    userIds: nameList,
    depIds: departmentNameList
  }, function (result) {
    console.log("/enterpriseWechat.do?method=getNickByWechatId", result);
    var userInfo = JSON.parse(result.msg).user;
    var depInfo = JSON.parse(result.msg).dep; // 创建人的名字，可能只能是人名？

    if ("creatorName" in params) {
      if (replaceParams.creatorName in userInfo) {
        replaceParams.creatorName = userInfo[replaceParams.creatorName];
      }
    }

    if ("workFlowNodeList" in params) {
      if (params.workFlowNodeList.length > 0) {
        var workFlowNodeListData = params.workFlowNodeList;

        for (var index = 0; index < workFlowNodeListData.length; index++) {
          var workFlowNodeListDataElement = workFlowNodeListData[index];
          var nodeType = workFlowNodeListDataElement.nodeType;

          if ("nodeDisplayName" in workFlowNodeListDataElement) {
            if (workFlowNodeListDataElement.nodeDisplayName != "") {
              if (nodeType == "person") {
                if (workFlowNodeListDataElement.nodeDisplayName in userInfo) {
                  replaceParams.workFlowNodeList[index].nodeDisplayName = userInfo[workFlowNodeListDataElement.nodeDisplayName];
                }
              }

              if (nodeType == "department") {
                if (workFlowNodeListDataElement.nodeDisplayName in depInfo) {
                  replaceParams.workFlowNodeList[index].nodeDisplayName = depInfo[workFlowNodeListDataElement.nodeDisplayName];
                }
              }
            }
          }

          if ("nodeName" in workFlowNodeListDataElement) {
            if (workFlowNodeListDataElement.nodeName != "") {
              if (nodeType == "person") {
                if (workFlowNodeListDataElement.nodeName in userInfo) {
                  replaceParams.workFlowNodeList[index].nodeName = userInfo[workFlowNodeListDataElement.nodeName];
                }
              }

              if (nodeType == "department") {
                if (workFlowNodeListDataElement.nodeName in depInfo) {
                  replaceParams.workFlowNodeList[index].nodeDisplayName = depInfo[workFlowNodeListDataElement.nodeName];
                }
              }
            }
          }

          if ("nodePersonList" in workFlowNodeListDataElement) {
            var nodePersonListData = workFlowNodeListDataElement.nodePersonList;

            for (var _index = 0; _index < nodePersonListData.length; _index++) {
              var nodePersonListDataElement = nodePersonListData[_index];

              if ("personName" in nodePersonListDataElement) {
                if (nodePersonListDataElement.personName in userInfo) {
                  replaceParams.workFlowNodeList[index].nodePersonList[_index].personName = userInfo[nodePersonListDataElement.personName];
                }
              }
            }
          }
        }
      }
    }

    callback && callback(replaceParams, {
      userInfo: userInfo,
      depInfo: depInfo
    });
  });
}

ours.wxAddressBook = {
  initConfigStatus: false,
  initAgentConfigStatus: false,
  initAddressBooksStatus: false,

  initConfig: initConfig,
  initAgentConfig: initAgentConfig,
  initAddressBooks: initAddressBooks,
  replaceAddressName: replaceAddressName,
  replaceMultiselectPersonAddressName: replaceMultiselectPersonAddressName,
  replaceMultiselectDepartmentAddressName: replaceMultiselectDepartmentAddressName,
  reloadWWOpenData: reloadWWOpenData,
  iframeReloadWWOpenData: iframeReloadWWOpenData,
  isMicroMessenger: isMicroMessenger,
  changeSelectPersonUIRender: changeSelectPersonUIRender,
  replaceDom: replaceDom,
  changeSelectPersonClick2Ok: changeSelectPersonClick2Ok,
  changeToOldDom: changeToOldDom,
  getNameList: getNameList,
  formatOldData: formatOldData,
  loadWxAddressFile:loadWxAddressFile,

  // 通讯录展示组件，给formAppRightEdit4phone.jsp这个NB页面单独写的方法，这个页面几乎没法调，具体去看一下这个settimeout吧，去掉了没法执行
  changeSelectPersonClick2Ok: changeSelectPersonClick2Ok,
  initAddressBooksBug: initAddressBooksBug,
  // 通讯录展示组件，给formAppRightEdit4phone.jsp这个NB页面单独写的方法，这个页面几乎没法调，具体去看一下这个settimeout吧，去掉了没法执行
};
