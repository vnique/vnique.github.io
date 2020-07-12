/**
 * 业务表单公用的JS：流程、无流程、明细表
 * @author zhangj
 */
(function () {
    var NS = ours.getNS();
    var isFromPC = NS.isFromPC;
    ours.getNS().saveLabel = true;
    var FORM_DATA_VALIDATE_ERROR_CODE = 5000;//数据异常
    var FORM_CHANGED_ERROR_CODE = 7000;//保存数据时，表单已经被修改的异常
    var FORM_DATA_FIELD_UNIQUE_ERROR_CODE = 8000;//字段唯一异常错误码
    var FORM_DATA_FIELD_REQUIRE_CODE = 9000;//字段必填错误码
    var FORM_DATA_LOCKED_CODE = 10000;//数据锁错误码
    var FORM_DATA_CHECK_RULE_ERROR_CODE = 13000;
    var FORM_DATA_SUB_FORM_NOT_NULL_ERROR_CODE = 14000;
    var contextPath = ours.getContextPath();
    
    var hasPayControl = $('.ours-class-pay').length >0 ? true : false   // 判断是否有支付控件

    //公共参数
    var formId = NS.formId;//主表表单Id
    var subFormId = NS.subFormId;//子表Id
    var isSubForm = !!subFormId;//是否是子表

    var dataId = NS.mainDataId;//主数据id
    var orderId //订单id
    var payOption   //发起微信支付参数

    //有流程参数
    // var flowId = NS.workflowFlowId;
    // var nodeId = NS.workflowNodeId;
    // var templateId = NS.workflowTemplateId;

    var BizForm = {
        isSubForm: isSubForm //是否是子表
    };

    //外部填写 重载选人
    if (NS.isExternalAccess) {
        ours.selectPerson = function () {
            ours.alert('外部填单不允许操作哦');
            return false;
        };
    }

    /**
     * 原样表单 切换瀑布流或表格式展现方式
     */
    BizForm.changeFormShowType = function () {
        var toggleTable = function () {
            var url = NS.formBaseLink;
            var formShowType = ours.getParamByUrl(url, "formShowType") || 'basic';
            if (formShowType === 'basic' || formShowType === '') {
                url = ours.setParam(url, "formShowType", "oursDesignForm");
                BizForm.tabChange(url);
            } else {
                url = ours.setParam(url, "formShowType", "basic");
                BizForm.tabChange(url);
            }
        };
        if (NS.isEditView + "" === "true") {
            BizForm.saveTempData({
                require: false,
                progress: false
            }, function () {
                toggleTable();
            });
        } else {
            toggleTable();
        }
        return false;
    };

    /**
     * 切换表单页签(主表切换需要保存当前数据)
     * @param tab 切换的页签
     */
    BizForm.goFormTab = function (tab) {
        var payNum = Number($('.ours-class-pay').text()) || Number($('.pay-num-input').val())
        if(hasPayControl){
            pay_amount = payNum;
        }
        var url = $(tab).attr('target');
        if (NS.isEditView === "true") {///编辑态
            BizForm.saveTempData(false, function (response) {
                BizForm.tabChange(url);
            });
        } else {
            BizForm.tabChange(url);
        }
    };

    /**
     * 页签切换加载明细表或者主表
     * @param url
     */
    BizForm.tabChange = function (url) {
        if (url) {
            //TODO 当滚动条滚动后，在点击有点点迟钝，待研究
            var html = ours.loadUrl(url);
            var $html = $("<div></div>");
            $html.html(html);
            var $content = $html.find(".form-container");
            if ($content.length > 0) {
                html = $content.html();
            } else {
                html = $html.html();
            }
            var $formArea = ours.getNS().$(".form-container");
            //清除不用的空间
            ours.clearByContainer($formArea);
            $formArea.html(html);
        }
    };

    /**
     * 重新加载表单
     */
    BizForm.reloadForm = function(){
        //主表地址
        var url = NS.formBaseLink;
        BizForm.tabChange(url);
    };

    /**
     * 前端校验当前表单
     * @returns {true}
     */
    BizForm.validateForm = function (require) {
        var area = null;//控件区域
        var findErrorBreak = false;
        if (NS.BizForm.isSubForm) {//表格
            findErrorBreak = true;//表格，错误信息是在同一位置显示，需要终止掉
            area = "#form-fields-body";
        } else {//移动单条
            area = "#contentForm";
        }
        area = ours.getNS().$(area);
        return ours.checkForm(area, {
            isFindErrorBreak: findErrorBreak,
            isNotCheckRequire: !require,
            failCallback: function (failEls) {
                if (failEls && failEls.length) {//存在错误元素滚动到视野位置
                    BizForm.scrollToField($(failEls[0]));
                }
            }
        });
    };

    /**
     * 校验是否可以执行保存数据，返回true，则可以，否则不可以
     */
    BizForm.checkSave = function () {
        return ours.getNS().saveLabel;
    };

    /**
     * 设置保存标识，调用此方法后，则不允许保存
     */
    BizForm.addSaveLabel = function () {
        ours.getNS().saveLabel = false;
    };

    /**
     *
     */
    BizForm.releaseSaveLabel = function (ns) {
        if (ns) {
            ns.saveLabel = true;
        } else {
            ours.getNS().saveLabel = true;
        }
    };

    /**
     * 滚动到指定控件
     * @param field
     */
    BizForm.scrollToField = function (field) {
        if (typeof field === 'string') {
            field = NS.$("#control_" + field).parent();
        } else {
            var _id = field.attr("id");
            if (_id && _id.indexOf("control_") < 0) {
                if (_id.indexOf('checkMsgCode') >= 0) {//手机验证码
                    _id = _id.replace('checkMsgCode', '');
                }
                field = NS.$("#control_" + _id).parent();
            } else {
                field = field.parent();
            }
        }
        if (NS.BizForm.isSubForm) {//的明细表水平滚动
            var table = NS.SubForm.getSubFormTable();
            var scrollView;
            if (table.attr("showType") === '1') {//卡片式
                //考虑当前错误字段是否在编辑中，如果在编辑中则滚动编辑窗口，如果不是则滚动整个表格窗口
                var dd = field.closest("dd")[0];
                var dl = field.closest("dl");
                if (dl.hasClass('row-edit-layout')) {//判断当前行是否在编辑中
                    dl.scrollTop(dd.offsetTop);
                } else {
                    scrollView = $(table.getEl()).find(".ours-grid-rows-view");
                    scrollView.scrollTop(dd.offsetTop);
                }
            } else {
                var td = field.closest('td')[0];
                scrollView = $(table.getEl()).find(".ours-grid-rows-view");
                scrollView.scrollLeft(td.offsetLeft);
                scrollView.scrollTop(td.offsetTop);
            }

        } else {//垂直滚动
            //修改移动端urldialog弹出的时候校验信息显示滚到详细控件去
            var $cP = NS.$('#contentForm');
            if (isFromPC) {
                $cP = $("html,body");
                $cP.scrollTop(field[0].offsetTop - ($(window).height() / 3));
            } else {//移动端
                if($cP.closest(".page-container").parent().is("body")){//非dialog
                    $cP = NS.$(".form-container");
                }
                $cP.scrollTop(field[0].offsetTop - ($cP.height() / 3));
                if (ours.os.ios) {
                    $cP.hide();
                    setTimeout(function () {
                        $cP.show();
                    }, 0);
                }
            }
        }
    };

    /**
     * 第一步: 保存临时表数据
     * @param params 是否校验必填
     * @param successCallBack 成功回调
     * @param failedCallBack 错误回调
     */
    BizForm.saveTempData = function (params, successCallBack, failedCallBack) {
        var require;
        var progress = "提交中";
        if (typeof params === 'object') {
            require = !!params.require;
            if (params.progress === false) {//添加明细表行的时候不需要提示
                progress = false;
            }
        } else {
            require = !!params;
        }
        if (!BizForm.checkSave()) {
            return;
        }
        try {
            document.activeElement.blur();
        } catch (e) {
        }
        var checkResult = BizForm.validateForm(require);
        if (checkResult) {
            var data = {};
            if (NS.BizForm.isSubForm) {//保存明细表
                var subTable = NS.SubForm.getSubFormTable();
                if(!subTable){//TODO 如果明细表 表格获取不到，不提交数据,目前快速切换才出现该问题
                    return;
                }
                data.subData = subTable.getData(true);
                data.formModifyTime = NS.formModifyTime;
                data.subFormId = NS.subFormId;
            } else {//主表，移动端明细表
                data.id = NS.formDataId;
                var asd = ours.getFormValue(NS.$('#form-fields'), "edit,edit4ReadOnly,edit4View");
                for(var i in asd) {
                    asd[i] = $.trim(asd[i]);
                }
                data.value = asd;
                data.data = ours.getFormData(NS.$('#form-fields'), "edit,edit4ReadOnly,edit4View");
                if (NS.BizForm.isSubForm) {
                    data.subFormId = NS.subFormId;
                }
                data.formModifyTime = NS.formModifyTime;
            }
            data.dataId = dataId;
            var saveTempDataUrl = NS.savaTempDataURL;
            if(saveTempDataUrl == ""||saveTempDataUrl == undefined){
                return
            }
            if (NS.subFormId) {
                saveTempDataUrl += "&subFormId=" + NS.subFormId;
            }
            saveTempDataUrl += "&formalSubmit=" + !!require;
            BizForm.addSaveLabel();
            ours.postData(saveTempDataUrl, data, function (result) {
                if (typeof successCallBack === 'function') {
                    var param = ours.parseJson(result.msg);
                    dataId = param.dataId;
                    BizForm.releaseSaveLabel();
                    successCallBack(param);
                }
            }, function (msg, errobj) {
                BizForm.releaseSaveLabel();
                BizForm.handleError(msg, errobj, failedCallBack);
            }, false);
        } else {
            ours.progress.hide();
        }
        return false;
    };

    /**
     * 第三步 处理数据以及(非流程表单下临时数据提交正式数据)
     * @param require
     * @param successCallback
     * @param failedCallBack
     */
    BizForm.tempData2Data = function (require, successCallback, failedCallBack) {
        var url = NS.savaDataURL + "&formalSubmit=" + !!require;
        ours.postData(url, {
            dataId: dataId
        }, function (result) {
            if (typeof successCallback === 'function') {
                var param = ours.parseJson(result.msg);
                successCallback(param);
            }
        }, function (msg, errobj) {
            BizForm.handleError(msg, errobj, failedCallBack);
        }, false);
    };
    /**
     * 合并第一步，第三步 直接提交数据到正式或预处理
     *
     * 1.提交当前表单数据到临时表
     * 2.提交临时表数据到正式数据
     */
    BizForm.commitData = function (require, callback) {
        BizForm.saveTempData(require, function () {
            BizForm.tempData2Data(require, callback);
        });
    };

    /**
     * 异常处理
     * @param msg
     * @param errobj
     * @param failedCallBack
     */
    BizForm.handleError = function (msg, errobj, failedCallBack) {
        var errcode = errobj.errcode;
        var error = null;
        var formName = null;
        var fieldId = null;
        var fieldName = null;
        var message = null;
        var html = null;
        if (errcode === FORM_CHANGED_ERROR_CODE) {
            ours.confirmDialog("表单已被管理员修改，是否重新刷新页面填写", function () {
                window.location.reload();
            });
        } else if (errcode === FORM_DATA_VALIDATE_ERROR_CODE) {
            error = ours.parseJson(msg);
            formName = error.formName || '';
            message = error.message || '';
            ours.getTop().ours.alert(ours.escapeStringToHTML(formName) + "不满足校验要求，" + message, function () {
                var tab = ours.getNS().$("#form-subform-tabs").find("#form_" + error.formId);
                if (tab.hasClass('active')) {
                    return;
                }
                var url = tab.attr('target');
                if (url) {
                    url += "&validate=true";//给提示
                    BizForm.tabChange(url);
                    //ours.go(url, null, true);
                }
            });
        } else if (errcode === FORM_DATA_FIELD_UNIQUE_ERROR_CODE) {
            error = ours.parseJson(msg);
            message = error.message || '';
            var tabsObj = ours.getNS().$("#form-subform-tabs");
            if (!tabsObj.length || tabsObj.find("#form_" + error.formId).hasClass('active')) {//只存在主表或者当前打开的表单就是错误数据所在的表单
                fieldId = error.fieldId;
                var fieldObj;
                var msgPosEl;
                if (NS.BizForm.isSubForm) {
                    var index = error.index;
                    var table = NS.SubForm.getSubFormTable();
                    fieldObj = $(table.getEl()).find("[name^='" + fieldId + "']").eq(index);
                    if (table.attr("showType") === '1') {
                        var rowData = table.getRowByIndex(index);
                        var $rowDom = table.findRowDomByRow(rowData);
                        if ($rowDom) {
                            msgPosEl = $rowDom.find('#_title_' + fieldId);
                            fieldObj = $rowDom.find("[name^='" + fieldId + "']").eq(0);
                            if (fieldObj.length <= 0) {
                                var _control = table.findControlByRowAndfieldName(rowData, fieldId);
                                fieldObj = $(_control.getEl());
                            }
                        }
                    }
                } else {
                    fieldObj = $('#' + fieldId);
                }
                var validateCfg = fieldObj.attr('validate');
                validateCfg = ours.parseJson(validateCfg);
                var validateMsgPosEl = validateCfg.msgPosEl;
                if(!msgPosEl && validateMsgPosEl){//配置了posEl
                    if (validateMsgPosEl.indexOf("ours.getNS") > -1) {//存在ours.getNS
                        try {
                            validateMsgPosEl = ours.parseJson(validateMsgPosEl);
                        }catch (e){
                        }
                    } else {
                        validateMsgPosEl = ours.getNS().$(validateCfg.msgPosEl);
                    }
                } else {//没有配置posEl
                    validateMsgPosEl = ours.getNS().$("#_title_" + fieldId);
                }
                ours.showValidateMsg({
                    "msgPosEl": msgPosEl || validateMsgPosEl,
                    "failMode": validateCfg.failMode || 'msgPosEl',
                    "msgPos": validateCfg.msgPos || 'append',
                    failMsg: message
                }, false, fieldObj[0]);
                BizForm.scrollToField(fieldObj);
            } else {//错误数据在其他表单
                formName = error.formName || '';
                fieldName = error.fieldName || '';
                ours.getTop().ours.alert(ours.escapeStringToHTML(formName) + "中" + ours.escapeStringToHTML(fieldName) + "不满足唯一校验要求，" + message, function () {
                    var tab = ours.getNS().$("#form-subform-tabs").find("#form_" + error.formId);
                    var url = tab.attr('target');
                    if (url) {
                        BizForm.tabChange(url);
                    }
                });
            }
        } else if (errcode === FORM_DATA_FIELD_REQUIRE_CODE) {
            error = ours.parseJson(msg);
            formName = error.formName || '';
            ours.getTop().ours.alert(ours.escapeStringToHTML(formName) + "有数据未填写", function () {
                var tab = ours.getNS().$("#form-subform-tabs").find("#form_" + error.formId);
                if (tab.hasClass('active')) {
                    return;
                }
                var url = tab.attr('target');
                if (url) {
                    url += "&validate=true";//给提示
                    BizForm.tabChange(url);
                }
            });
        } else if (errcode === FORM_DATA_LOCKED_CODE) {
            var lock = ours.parseJson(msg);
            ours.getTop().ours.alert(lock.ownerName + "正在编辑，请稍后提交", function () {
                //reload for wechat
                var url = window.location.href;
                var now = new Date().getTime();
                var v = ours.getParam("date");
                if (v) {
                    url = url.replace('date=' + v, 'date=' + now);
                } else {
                    url = url + "&date=" + now;
                }
                BizForm.tabChange(url);
            });
        } else if (errcode === FORM_DATA_CHECK_RULE_ERROR_CODE) {
            error = ours.parseJson(msg);
            fieldId = error.fieldId;
            var needGo = true;
            if (NS.BizForm.isSubForm) {
                if (fieldId.indexOf(NS.subFormId) > -1) {
                    needGo = false;
                }
            }
            if (!ours.os.mobile) {
                html = ours.showHTMLDialog({
                    content: "<div class='checkForm-dialog-error'><img src='" + ours.getContextPath() + "res_common/ours/ui/ui_pc/images/error.png'/>" + ours.escapeStringToHTML(error.message) + "</div>",
                    contentStyle: "font-size:16px;width:650px",
                    title: "",
                    actions: [{
                        text: "确定",
                        action: function () {
                            html.hide();
                            var tab = ours.getNS().$("#form-subform-tabs").find("#form_" + error.formId);
                            if (tab.hasClass('active')) {
                                return;
                            }
                            var url = tab.attr('target');
                            if (needGo && url) {
                                url += "&checkField=" + fieldId;//给提示
                                BizForm.tabChange(url);
                            }
                        }
                    }]
                });
            } else {
                ours.alert(error.message, function () {
                    var tab = ours.getNS().$("#form-subform-tabs").find("#form_" + error.formId);
                    if (tab.hasClass('active')) {
                        return;
                    }
                    var url = tab.attr('target');
                    if (needGo && url) {
                        url += "&checkField=" + fieldId;//给提示
                        BizForm.tabChange(url);
                    }
                });
            }
            BizForm.labelField4CheckRule(fieldId);
        } else if (errcode === FORM_DATA_SUB_FORM_NOT_NULL_ERROR_CODE) {
            error = ours.parseJson(msg);
            var errorMsg = ours.parseJson(error.message);
            var total = 0;
            var list = [];
            for (var i in errorMsg) {
                if (errorMsg.hasOwnProperty(i)) {
                    total++;
                    list.push(errorMsg[i]);
                }
            }
            html = template('validate-sub-form-not-null-template', {
                    total: total,
                    list: list,
                    isMobile: ours.os.mobile
                }) + "<script type=\"text/javascript\">\n" +
                "            function notNullClick(id) {\n" +
                "                var win = ours.getTop().ours.notNullDialog.attr(\"parentWindow\");\n" +
                "                win.ours.getNS().BizForm.notNullFormGo(id);return false;\n" +
                "            }\n" +
                "        </script>";
            var errorDialog = ours.getTop().ours.showHTMLDialog({
                content: html,
                parentWindow: window,
                title: '提交错误',
                actions: [{
                    text: '确定',
                    action: function () {
                        errorDialog.hide();
                    }
                }]
            });
            ours.getTop().ours.notNullDialog = errorDialog;
        } else {
            if (typeof failedCallBack === 'function') {
                failedCallBack(errobj);
            } else {
                ours.getTop().ours.alert(msg);
            }
        }
    };

    BizForm.labelField4CheckRule = function (fieldId, errorMsg) {
        var fields = fieldId.split(",");

        function showError(fieldObj, field) {
            if (fieldObj.length) {
                var validateCfg = fieldObj.attr('validate');
                var el = fieldObj[0];
                if (validateCfg) {
                    validateCfg = ours.parseJson(validateCfg);
                } else {
                    var v = fieldObj.find("[validate]");
                    if (v) {
                        validateCfg = v.attr('validate');
                        validateCfg = ours.parseJson(validateCfg);
                        el = v[0];
                    }
                }
                if (!el) {
                    el = fieldObj.find("#" + field)[0];
                }
                ours.showValidateMsg({
                    "msgPosEl": validateCfg.msgPosEl || "#" + field,
                    "failMode": validateCfg.failMode || 'msgPosEl',
                    "msgPos": validateCfg.msgPos || 'append',
                    failMsg: errorMsg
                }, false, el);
            }
        }

        for (var field in fields) {
            if (fields.hasOwnProperty(field)) {
                var ss = fields[field].split(".");
                var formId = ss[0];
                var tempFieldId = ss[1];
                var fieldObj = ours.getById(tempFieldId);
                if (fieldObj) {
                    showError($(fieldObj.getEl()), tempFieldId);
                }
                if (NS.BizForm.isSubForm) {
                    var subFormTable = NS.SubForm.getSubFormTable(formId);
                    if (subFormTable) {
                        var subData = subFormTable.attr("data");
                        var i, len, rowData;
                        var control = null;
                        for (i = 0, len = subData.length; i < len; i++) {
                            rowData = subData[i];
                            control = subFormTable.findControlByRowAndfieldName(rowData, tempFieldId);
                            if(control){
                                showError($(control.getEl()), control.attr("id").replace("control_"));
                            }
                        }
                    }
                }
            }
        }
    };

    BizForm.notNullFormGo = function (formId) {
        ours.getTop().ours.notNullDialog.hide();
        try {
            if(NS.WorkflowRuntime.notNullFormGo4HideDialog){
                NS.WorkflowRuntime.notNullFormGo4HideDialog();
            }
        }catch (e){
        }
        var tab = ours.getNS().$("#form-subform-tabs").find("#form_" + formId);
        if (tab.hasClass('active')) {
            return;
        }
        var url = tab.attr('target');
        if (url) {
            BizForm.tabChange(url);
            //ours.go(url, null, true);
        }
        return false;
    };

    BizForm.clearErrorLabel = function (control) {
        var fieldObj = $(control.getEl());
        var el = fieldObj.find("#" + control.attr("id"));
        if (el && el.hasClass("error-border-highlight")) {
            el.removeClass("error-border-highlight");
        }
    };
    /**
     * 保存明细表并继续
     */
    BizForm.saveSubFormData4Continue = function () {
        ours.progress("保存中");
        this.saveTempData(true, function () {
            NS.parentNS.hasNewData = true;
            NS.parentNS.addDataDialog.reload();
        });
    };
    /**
     * 保存明细表并退出
     */
    BizForm.saveSubFormData4Out = function () {
        ours.progress("保存中");
        this.saveTempData(true, function () {
            window.location.reload();
        });
    };

    /**
     * 解析成功后跳转的地址，将fieldIds转位data4Display
     * @param sucURL
     * @returns {*}
     */
    BizForm.parseSuccessURL = function (sucURL) {
        if (sucURL) {
            if (sucURL.indexOf("fieldIds") > 0) {
                var fieldIdStr = ours.getParamByUrl(sucURL, "fieldIds");
                var fieldIds = fieldIdStr.split(",");
                var data4Display = null;
                var control = null;
                for (var i = 0, len = fieldIds.length; i < len; i++) {
                    var fieldId = fieldIds[i];
                    if (NS.BizForm.isSubForm && NS.mainData) {
                        var _mainData = NS.mainData;
                        _mainData = ours.parseJson(_mainData);
                        var _dataMap = _mainData.data;
                        var _valueMap = _mainData.value;
                        var value = _valueMap[fieldId];
                        if (value) {
                            if (!data4Display) {
                                data4Display = {};
                            }
                            var title = NS.SubForm.getTitleByFieldId(fieldId);
                            var _data = _dataMap[fieldId];
                            if (_data && "[]" !== _data && "{}" !== _data) {
                                data4Display[title] = {
                                    value: value,
                                    data4DB: _data
                                }
                            } else {
                                data4Display[title] = value;
                            }
                        }
                    } else {
                        control = ours.getById(fieldId);
                        if (control) {
                            if (control.getValue() !== '') {
                                if (!data4Display) {
                                    data4Display = {};
                                }
                                if (control.getData4DB() !== '' && control.getData4DB() !== '[]' && control.getData4DB() !== '{}') {
                                    var data4DB = control.getData4DB();
                                    data4Display[control.attr("title")] = {
                                        value: control.getValue(),
                                        data4DB: data4DB
                                    };
                                } else {
                                    data4Display[control.attr("title")] = control.getValue();
                                }
                            }
                        }
                    }
                }
                sucURL = ours.delParam(sucURL, 'fieldIds');
                if (data4Display) {
                    sucURL = ours.setParam(sucURL, "data4Display", encodeURIComponent(ours.parseString(data4Display)));
                }
                return sucURL;
            } else {
                return sucURL;
            }
        }
        return "";
    };
    /**
     * 无流程提交数据
     */
    BizForm.saveUnFlowData = function () {
        // 有支付控件，则数值必须大于0才能保存
        if(hasPayControl&&($('.pay-num-input').val()!=""||$('.ours-class-pay').text()!="")){
            var payNum = Number($('.pay-num-input').val()) || Number($('.ours-class-pay').text())
            if(!(payNum>0)){
                ours.alert('支付金额必须大于0')
                return
            }
        }

        var eventResult = NS.triggerFormEventByEventName("script4beforeSubmit", "save4UnFlow");
        if(!eventResult.success){
            return;
        }
        ours.progress("保存中");
        this.commitData(true, function (data) {
            eventResult = NS.triggerFormEventByEventName("script4afterSubmit", "save4UnFlow");
            if(!eventResult.success){
                return;
            }
            if (NS.isExternalAccess) {
            	var payState="";
            	var portalid=ours.getParam("portalid");
            	if(hasPayControl){
            		payState=ours.getByOursId($("div[title='paystate']").find("div[type='singleselect']").attr("oursid")).getValue();
            	}
                if(hasPayControl&&payState=="1"){
                	var url = contextPath + 'w.do?method=success&formId=' + data.encodeFormId + '&dataId=' + data.encodeDataId+"&ispay=true";
                	ours.go(url, null, true);
                }else  if (NS.viewType === 'EDIT') {
                    window.location.replace(contextPath + 'w.do?method=successEdit&formId=' + data.encodeFormId + '&dataId=' + data.encodeDataId);
                } else {
                    if (NS.successURL) {
                        window.location.replace(NS.BizForm.parseSuccessURL(NS.successURL));
                    } else {
                        var url = contextPath + 'w.do?method=success&formId=' + data.encodeFormId + '&dataId=' + data.encodeDataId;
                        if(portalid){
                        	url+="&portalid="+portalid;
                        }
                        ours.go(url, null, true);
                    }
                }
            } else {
                var win = null;
                if (isFromPC) {
                    win = ours.getTop();
                    if (win.opener) {
                        if (typeof win.opener.saveUnflowFormCallBack === 'function') {
                            win.opener.saveUnflowFormCallBack(data);
                        } else {
                            win.opener.location.reload();//重新加载
                        }
                        if(hasPayControl){   //有支付控件   
                            ours.go(data.viewDataLink, null, true);
                        }else{
                            win.close();
                        }
                    } else {
                    	if(document.referrer.indexOf("login.do")>-1){
                    	     window.location.href = "/home.do";
                    	}else{
                            ours.getTop().ours.showAutoTips('保存成功');
                            setTimeout(function () {
                            	var url = contextPath + 'form/bizFormData.do?method=success';
                            	ours.go(url, null, true);
                            },2000)
                    	}
                    }
                } else {
                    // --------- 移动端 保存无流程表单回调函数 开始 by linsong
                    win = ours.getNS().parentNS;
                    var result = null;
                    if (win && typeof win.saveUnflowFormCallBack === 'function') {
                        result = win.saveUnflowFormCallBack(data);
                    }
                    // --------- 移动端 保存无流程表单回调函数 结束
                    if (!result) {
                        if (NS.openFrom === 'scan_edit') {
                            ours.closeWebView();
                        } else {
                            if(hasPayControl){   //有支付控件   
                                ours.go(data.viewDataLink, null, true);
                            }else{
                            	if(document.referrer){
                                    if(document.referrer.indexOf("login.do")>-1){
                                        window.location.href = "/home.do";
                                    }else{
                                        ours.back();
                                    }
	                           	}else{
                                    window.location.href = "/home.do";
	                           	}
                            }
                        }
                    }
                }
            }
        });
    };

    /**
     * 发起支付--PC
     */
    BizForm.toPay = function(){
        var payNum = Number($('.ours-class-pay').text()) || Number($('.pay-num-input').val())
        if(!(payNum>0)){
            ours.alert('支付金额必须大于0')
            return
        }
        var url = contextPath + 'pay.do?method=readyPay&sourceId='+ dataId +'&sourceOtherParams='+formId;
        ours.go(url, null, true);
    };
    
    /**
     * 发起支付--移动
     */
    BizForm.mobile2Pay = function(){
        console.log('发起移动支付',dataId,formId)
        var postData = {
            sourceId: dataId,            // 表单数据ID
            tradeType:'wechatJSAPI',
            sourceOtherParams: formId    // 表单ID
        };
        ours.postData(contextPath+"pay.do?method=toPay",postData,function(result){
            console.log('后台数据',result)
            if (!result.success) {
                ours.alert(result.msg);
            } else {
                var data = JSON.parse(result.msg)
                console.log('获取微信支付参数',data)
                orderId = data.orderId
                payOption = JSON.parse(data.signData)
              //新移动门户把数据发到iframe外面
//                if(NS.isStaticMobile && window.parent && parent.document.env){
//                	var msg = {
//                			action:'payHandle',
//                			data:data,
//                			successUrl: contextPath + 'pay.do?method=paySuccess&orderId=' + orderId + '&formId=' + formId
//                	}
//                	//window.parent.postMessage(msg, '*');
//                	//debugger;
//                	if(parent.document.wxPay){
//                		parent.document.wxPay(msg);
//                	}
//            	}else{
	                if (typeof WeixinJSBridge == "undefined"){
	                    if( document.addEventListener ){
	                        document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
	                    }else if (document.attachEvent){
	                        document.attachEvent('WeixinJSBridgeReady', onBridgeReady); 
	                        document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
	                    }
	                 }else{
	                    onBridgeReady();
	                }
            	//}
            }
        }, function(error) {
            ours.alert(error);
        }, "加载中");
    };
    
    /**
     * 发起微信支付--移动
     * @param {Object} options    请求参数列表
     * options:{
        "appId":"wx2421b1c4370ec43b",     //公众号名称，由商户传入     
        "timeStamp":"1395712654",         //时间戳，自1970年以来的秒数     
        "nonceStr":"e61463f8efa94090b1f366cccfbbb444", //随机串     
        "package":"prepay_id=u802345jgfjsdfgsdg888",     
        "signType":"MD5",         //微信签名方式：     
        "paySign":"70EA570631E4BB79628FBCA90534C63FF7FADD89" //微信签名 
        }
     */
    function onBridgeReady(){
        WeixinJSBridge.invoke(
           'getBrandWCPayRequest',payOption,
           function(res){
           if(res.err_msg == "get_brand_wcpay_request:ok" ){
           // 使用以上方式判断前端返回,微信团队郑重提示：
                 //res.err_msg将在用户支付成功后返回ok，但并不保证它绝对可靠。
                console.log('支付成功了')
                var successUrl = contextPath + 'pay.do?method=paySuccess&orderId=' + orderId + '&formId=' + formId;
                ours.backUni(true);
                ours.go(successUrl, null, true);
           } else{
               ours.alert('支付失败,请重新支付')
           }
        }); 
     }
     

    /**
     * 获取subDataId
     */
    BizForm.getSubDataId = function () {
        var subDataId = null;
        if (NS.BizForm.isSubForm) {//明细表列表
            subDataId = NS.SubForm.currentRowData.dataId;
        } else {
            subDataId = ours.getParam('subDataId');
        }
        return subDataId;
    };

    /**
     * 初始化业务表单
     */
    BizForm.initBizForm = function () {
        if ('true' === ours.getParam('validate')) {
            BizForm.validateForm(true);//参数里面有validate属性，就校验
        }
        var checkField = ours.getParam('checkField');
        if (checkField) {
            BizForm.labelField4CheckRule(checkField);
        }
    };

    BizForm.showRelationBtn = function (control) {
        var dbVal = control.getData4DB() || {};
        if (dbVal.toFormId) {
            return true;
        }
    };

    /**
     * 展示关联表单列表
     */
    BizForm.showRelationList = function (control) {
        if (control.attr("right") === 'edit4ReadOnly') {//编辑不可改权限不执行
            return;
        }
        //FIXME 解决此事件比表格组件的行点击事件先触发，导致currentSubDataId取不到的问题
        setTimeout(function () {
            var otherAttrs = control.attr("otherAttrs") || "{}";
            otherAttrs = ours.parseJson(otherAttrs);
            var currentSubDataId = NS.BizForm.getSubDataId();
            //做一次判断，如果有有效设置才执行
            if (otherAttrs && otherAttrs.toFormId) {
                //先保存一次当前数据
                NS.BizForm.saveTempData({
                    require: false
                }, function (param) {
                    var method = NS.showRelationDataListURL;
                    if (!control.attr) {
                        return;
                    }
                    var par = getRelationDataParam(otherAttrs, param, control);
                    NS.BizForm.addSaveLabel();
                    ours.postData(method, par, function (data) {
                        if (data.success) {
                            var msg = data.msg;
                            msg = ours.parseJson(msg);
                            var formType = msg.formType + '';
                            var queryParam = "";
                            if (formType === "5") {
                                queryParam = '[{"expression":"=","field":"state","value":"3","dataType":"NUMBER_LONG"}]';
                            }
                            NS.BizForm.relationDialog = ours.showUrlDialog({
                                url: ours.addParams(msg.method, {
                                    showOpt: false,
                                    showHead: false,
                                    showSelect: true,
                                    showAdd: false,
                                    openType: "right",
                                    isFromOther: true,
                                    isSingle: !NS.BizForm.isSubForm,
                                    tabs: "2,4",
                                    state: 2,
                                    dConditions: msg.conditons,
                                    queryParam: queryParam
                                }),
                                //isClose:!ours.os.mobile,
                                isHideHeader: true,
                                //isShowClose:true,
                                callback: function (action) {
                                    if (action === 'close') {
                                        var ns = ours.getNS();
                                        if (ours.os.mobile) {
                                            ns = ns.parentNS;
                                        }
                                        ns.BizForm.releaseSaveLabel(ns);
                                    }

                                },
                                actions: [{
                                    text: "确定",
                                    action: function () {
                                        var ns = ours.getNS();
                                        if (ours.os.mobile) {
                                            ns = ns.parentNS;
                                        }
                                        var win = ns.BizForm.relationDialog.getWindow();
                                        if (!win.getSelecteds) {
                                            return;
                                        }
                                        var data = win.getSelecteds() || [];
                                        var result = {};
                                        if (data && data.length > 0) {
                                            var dataId = "";
                                            var flowId = "";
                                            var nodeId = "";
                                            for (var i = 0; i < data.length; i++) {
                                                if (i === 0) {
                                                    if (formType === "5") {
                                                        dataId = data[i].bizId;
                                                        flowId = data[i].id;
                                                        nodeId = data[i].workFlowNodeList[0].nodePersonList[0].flowNodeId;
                                                    } else {
                                                        dataId = data[i].id;
                                                    }
                                                } else {
                                                    if (formType === "5") {
                                                        dataId = dataId + "," + data[i].bizId;
                                                        flowId = flowId + "," + data[i].id;
                                                        nodeId = nodeId + "," + data[i].workFlowNodeList[0].nodePersonList[0].flowNodeId;
                                                    } else {
                                                        dataId = dataId + "," + data[i].id;
                                                    }
                                                }
                                            }
                                            result.dataId = dataId;
                                            result.flowId = flowId;
                                            result.nodeId = nodeId;
                                            result.rightId = data.rightId;
                                        }
                                        result.subFormId = data.subFormId;
                                        var subFormData = data.subFormData;
                                        if (subFormData && subFormData.length > 0) {
                                            var subDataId = "";
                                            for (var j = 0; j < subFormData.length; j++) {
                                                if (j === 0) {
                                                    subDataId = subFormData[j].dataId;
                                                } else {
                                                    subDataId = subDataId + "," + subFormData[j].dataId;
                                                }
                                            }
                                            result.toSubDataIds = subDataId;
                                        }
                                        if (!result.dataId) {
                                            ours.getTop().ours.alert("请选择需要关联的数据！");
                                            ns.BizForm.releaseSaveLabel(ns);
                                            return;
                                        }
                                        NS.BizForm.relationDialog.hide();
                                        ns.BizForm.relationCallback(otherAttrs.toFormId, formType, result, control.attr("name"), currentSubDataId);
                                        return false;
                                    }
                                }, {
                                    text: "取消",
                                    cls: ours.os.mobile ? "grey" : "ours-dialog-cancel",
                                    action: function () {
                                        var ns = ours.getNS();
                                        if (ours.os.mobile) {
                                            ns = ns.parentNS;
                                        }
                                        ns.BizForm.releaseSaveLabel(ns);
                                        BizForm.relationDialog.hide();
                                        return false;
                                    }
                                }]
                            });
                        } else {
                            var ns = ours.getNS();
                            if (ours.os.mobile) {
                                ns = ns.parentNS;
                            }
                            ns.BizForm.releaseSaveLabel(ns);
                        }
                    });
                });
            }
        });
    };

    function getRelationDataParam(otherAttrs, param, control) {
        var formType = otherAttrs.toFormType;
        var subDataId = BizForm.getSubDataId();
        return {
            formId: formId,
            subFormId: NS.subFormId,
            subDataId: subDataId,
            dataId: dataId,
            toFormId: otherAttrs.toFormId,
            isSingle: (typeof SubForm === "undefined"),//如果操作的是重复表数据，可以选择多条主表数据，如果是主表数据，则只能选择一条
            showOpt: false,
            showHead: false,
            openType: "right",
            formType: formType,
            dConditions: otherAttrs.condition,
            fieldId: control.attr("name")
        };
    }

    BizForm.relationCallback = function (toFormId, formType, result, fieldId, subDataId) {
        ours.postData(NS.getRelationDataURL, {
            formId: formId,
            subFormId: NS.subFormId,
            subDataId: subDataId,
            dataId: dataId,
            toFormId: toFormId,
            toDataId: result.dataId,
            toSubFormId: result.subFormId,
            toSubDataIds: result.toSubDataIds,
            formType: formType,
            flowId: result.flowId,
            nodeId: result.nodeId,
            rightId: result.rightId,
            fieldId: fieldId
        }, function (data) {
            BizForm.releaseSaveLabel();
            if (data.success) {
                data = ours.parseJson(data.msg);
                BizForm.fillFormData(data.master, data.subData, subDataId);
            } else {
                ours.getTop().ours.alert(data.msg);
            }
        });
    };

    BizForm.doAutoRelation = function (control) {
        var otherAttrs = control.attr("otherAttrs") || "{}";
        otherAttrs = ours.parseJson(otherAttrs);
        if (otherAttrs && otherAttrs.conditionField) {
            // ours.progress("数据保存中……");
            //先保存一次当前数据
            BizForm.saveTempData({
                require: false
            }, function (param) {
                var method = NS.getAutoRelationDataURL;
                ours.progress.hide();
                if (!control.attr) {
                    return;
                }
                var par = getRelationDataParam(otherAttrs, param, control);
                BizForm.addSaveLabel();
                // ours.progress("关联数据获取中……");
                ours.postData(method, par, function (data) {
                    if (data.success) {
                        var msg = data.msg;
                        msg = ours.parseJson(msg);
                        setTimeout(function () {
                            BizForm.fillFormData(msg.master, msg.subData, par.subDataId);
                            //关系设置，没有回填数据判断是否有弹框提示
                            if(msg.isShowTips){
                                ours.getTop().ours.alert(msg.tipMsg);
                            }
                            BizForm.releaseSaveLabel();
                            setTimeout(function () {
                                ours.getEvent().trigger("autoRelationComplete");
                            }, 100);
                        },200);
                    }else{
                        BizForm.releaseSaveLabel();
                    }
                    ours.progress.hide();
                },null,false);
            });
        }
    };
//相关操作PC端点击事件
    BizForm.showQuickLink = function (obj) {
        var linkDiv = $(".correlation");
        if(linkDiv.hasClass("box-show-left")){
            linkDiv.removeClass("box-show-left");
        }
        if (linkDiv.hasClass("box-show-right")) {
            linkDiv.addClass("box-show-left");
            linkDiv.removeClass("box-show-right");
            $(obj).find("span").removeClass("close-correlation");
        } else {
            linkDiv.addClass("box-show-right");
            //linkDiv.removeClass("box-show-left");
            $(obj).find("span").addClass("close-correlation");
            ours.parse();
        }
    };
    //相关操作移动端点击事件
    BizForm.showPhoneQuickLink = function (obj) {
        var linkDiv = $(".correlation");
        if (linkDiv.hasClass("box-show-right")) {
            linkDiv.removeClass("box-show-right");
            $(obj).find("span").removeClass("close-correlation");
        } else {
            linkDiv.addClass("box-show-right");
            $(obj).find("span").addClass("close-correlation");
            ours.parse();
        }
    };

    BizForm.event4ClickCorrelationOpt = function (dom) {
        var _this = $(dom);
        var openType = _this.attr("openType");
        var url = _this.attr("url");
        var correlation = "f"+formId + "_d"+dataId;
        var rightId = NS.rightId;
        if (rightId) {
            correlation = correlation + "_r"+rightId;
        }
        var flowId = NS.workflowFlowId;
        if (flowId) {
            correlation = correlation + "_w"+flowId;
        }
        var nodeId = NS.workflowNodeId;
        if (nodeId) {
            correlation = correlation + "_n"+nodeId;
        }
        url = ours.addParams(url, {
            correlation:correlation
        });
        var bizType = _this.attr("bizType");
        //设置为链接跳转，自定义链接，流程新建和无流程新建的，直接跳转
        if (openType === "2" || bizType === "12" || bizType === "2") {//openType === "2" || bizType === "12" || bizType === "2"
            ours.go(url, {}, false, true, true);
            // window.location.href=url;
        } else {
            //如果是自定义链接，用iframe形式展现
            var useIFrame = bizType === "11";
            ours.showUrlDialog({
                url:url,
                useIFrame:useIFrame,
                isClose: true
            });
        }
    };

    BizForm.doFieldRelation = function (control) {
        ours.progress("数据保存中……");
        BizForm.saveTempData({
            require: false
        }, function (param) {
            var method = NS.getFieldRelationDataURL;
            ours.progress.hide();
            if (!control.attr) {
                return;
            }
            var par = getRelationDataParam({}, param, control);
            BizForm.addSaveLabel();
            ours.progress("关联数据获取中……");
            ours.postData(method, par, function (data) {
                if (data.success) {
                    var msg = data.msg;
                    msg = ours.parseJson(msg);
                    BizForm.fillFormData(msg.master, msg.subData, par.subDataId);
                }
                BizForm.releaseSaveLabel();
                ours.progress.hide();
            });
        })
    };

    BizForm.showRelationContent = function (controll) {
        var otherAttrs = controll.getData4DB() || "{}";
        otherAttrs = ours.parseJson(otherAttrs);
        if (otherAttrs.toFormId) {
            var url = otherAttrs.url;
            if (ours.os.mobile) {
                ours.showUrlDialog({
                    url: url,
                    isClose: true
                })
            } else {
                ours.openWindow(url);
            }
        }
    };

    /**
     * 回填字段
     * 重复表数据只回填当前编辑的重复表
     * @param masterData 主表数据 数据列表 field_id:字段id，field_value:字段值，field_data：data
     * @param subData 重复表数据 数据列表 data:dsdfag, datas:[{fieldId:字段id，value:字段值，data：data}]
     * @param currentSubDataId
     */
    BizForm.fillFormData = function (masterData, subData, currentSubDataId) {
        var fieldId = null;
        var data = null;
        var field = null;
        var showData = null;
        if (masterData) {
            for (fieldId in masterData) {
                data = masterData[fieldId];
                field = ours.getById(fieldId);
                if (field) {
                    showData = data.showData;
                    showData = ours.parseJson(showData);
                    field.attr("value", ours.escapeHTMLToString(data.showValue));
                    field.attr("data", showData);
                    field.attr("data4DB", data.showData4DB);
                    field.setValueBefore && field.setValueBefore();
                    field.render();
                }
            }
        }
        if (subData) {
            var subFormData = subData[NS.subFormId];
            //当前重复表没有需要回填的数据时，不执行
            if (!subFormData) {
                return
            }
            var datas = null;
            //回填重复表
            if (NS.BizForm.isSubForm) {
                //当前编辑的表单是重复表时才执行重复表回填
                var currentRowData = NS.SubForm.currentRowData;
                var table = NS.SubForm.getSubFormTable();

                if (subFormData) {
                    for (var dataId in subFormData) {
                        datas = subFormData[dataId];
                        if (datas) {
                            datas = transData(datas);
                            datas.dataId = dataId;
                            var row = table.findRowBy({"dataId": dataId});
                            if (row) {
                                table.updateRow(row, datas, true);//这里直接更新，不需要弹出编辑界面
                            } else {
                                table.addRow(datas, table.indexOf(currentRowData) + 1, true);//直接添加不需要弹出编辑界面
                            }
                            // if (currentSubDataId && currentSubDataId == dataId) {
                            //     table.updateRow(currentRowData, datas);
                            // } else {
                            //     table.addRow(datas,table.indexOf(currentRowData)+1);
                            // }
                        }
                    }
                }
            } else {
                //回填移动重复表
                datas = subFormData[currentSubDataId];
                if (datas) {
                    for (fieldId in datas) {
                        data = datas[fieldId];
                        field = ours.getById(fieldId);
                        if (field) {
                            showData = data.showData;
                            showData = ours.parseJson(showData);
                            field.attr("value", ours.escapeHTMLToString(data.showValue));
                            field.attr("data", showData);
                            field.attr("data4DB", data.showData4DB);
                            field.setValueBefore && field.setValueBefore();
                            field.render();
                        }
                    }
                }
            }
        }

    };

    function transData(datas) {
        for (var fieldId in datas) {
            var data = datas[fieldId];
            var showData = data.showData;
            showData = ours.parseJson(showData);
            data.value = data.showValue;
            data.data = showData;
            data.data4DB = data.showData4DB;
        }
        return datas;
    }

    NS.BizForm = BizForm;
})();