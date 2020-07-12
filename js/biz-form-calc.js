/**
 * 业务表单计算
 * Created by yangh on 2017/1/6.
 */
(function () {
    var NS = ours.getNS();

    var BizFormCalc = {};

    BizFormCalc.CalcCacheMap = {};


    /**
     * 将计算式所有函数都放到一个数组中国
     */
    BizFormCalc.calcMathFuncs = (function (calcMath) {
        var funcs = [];
        for (var key in calcMath) {
            if (typeof calcMath[key] == 'function') {
                funcs.push(key);
            }
        }
        return funcs;
    })(ours.CalcMath);

    var calcRightisNull = true;

    var subDataId = "";
    //设置明细表数据ID
    BizFormCalc.setSubDataId = function (dataId) {
        subDataId = dataId;
    };

    /**
     * 触发明细表删除最后一行 刷新主表控件的计算
     */
    BizFormCalc.triggerSubCalc4DeleteLastRow = function (tableId) {
        var subTable = NS.SubForm && NS.SubForm.getSubFormTable();
        if (tableId) {
            subTable = ours.getById(tableId);
            var allColumns = subTable.findAllColumns();
            if (allColumns && allColumns.length > 0) {
                for (var i = 0, len = allColumns.length; i < len; i++) {
                    var columnField = allColumns[i];
                    var $controlDom = columnField['$oursControlDom'];
                    if ($controlDom) {
                        var calcStr = $($controlDom).attr("calc");
                        if (!calcStr) {
                            continue;
                        }
                        var calcArray = ours.parseJson(calcStr);
                        var calc = {};
                        for (var j = 0, jLen = calcArray.length; j < jLen; j++) {
                            calc = ours.parseJson(calcArray[j] || {});
                            var calcFormula = calc["calcStr"];
                            //获取结果字段ID
                            var targetFieldId = calc["calcField"];
                            //如果结果字段包含formId 则需要去掉formId 只留字段id
                            var subFormId = null;
                            if (targetFieldId.indexOf(".") > -1) {
                                var parts = targetFieldId.split(".");
                                subFormId = parts[0];
                                targetFieldId = parts[1];
                            }
                            if (targetFieldId) {
                                var result;
                                //直接在界面中取控件，如果能取到则说明目标控件是主表字段，如果不能则说明是明细表控件
                                targetField = ours.getById(targetFieldId);
                                if (targetField) {
                                    try {
                                        NS.BizForm.addSaveLabel();
                                        calcFormula = BizFormCalc.getFormula(calcFormula, calc.isConditionCalc);
                                        result = BizFormCalc.getResult(calcFormula, targetField, calcRightisNull);
                                        if ((result + "").indexOf("Infinity") > -1) {//除数为0则直接执行下一个计算式
                                            continue;
                                        }
                                        //计算结果设置
                                        NS.BizForm.releaseSaveLabel();

                                        // targetField.setValue(result + "");
                                        BizFormCalc.setValue2ResultControl(targetField, result + "");

                                        var cacheValue = BizFormCalc.CalcCacheMap[targetField.attr("oursId")];
                                        var trueValue = targetField.getValue();
                                        if (cacheValue !== trueValue) {
                                            BizFormCalc.CalcCacheMap[targetField.attr("oursId")] = trueValue;
                                            //结果字段可能参与计算，需要触发主动计算
                                            targetField.triggerAfterUpdate();
                                        }
                                    } catch (e) {
                                        //这里不能抛出异常，不然下一个计算不能执行
                                        // throw e;
                                        console.error(e);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    BizFormCalc.setValue2ResultControl = function (control, value, needReleaseSaveLabel) {
        control.attr("value", value);
        if (control.attr("type") === 'number' || control.attr("type") === 'pay') {//数字控件需要调用一次init
            control.init();
        }
        control.render();
        if (needReleaseSaveLabel) {
            NS.BizForm.releaseSaveLabel();
        }
        control.triggerUpdate();
    };

    /**
     * 触发明细数据行的计算事件
     */
    BizFormCalc.triggerSubCalc = function (tableId) {
        if (subDataId) {
            var subTable = NS.SubForm && NS.SubForm.getSubFormTable();
            if (tableId) {
                subTable = ours.getById(tableId);
            }
            var tempSubDataId = subDataId;
            var subData = subTable.findRowBy({dataId: subDataId});
            NS.SubForm.updateCurrentRow(null, subData);
            for (var key in subData) {
                var fieldData = subData[key];
                if (fieldData && fieldData['controlOursId']) {
                    var control = ours.getByOursId(fieldData['controlOursId']);
                    if (control) {
                        if (control.attr("calcStr")) {//字段存在计算式
                            try {
                                calcRightisNull = true;
                                targetField = control;
                                BizFormCalc.setSubDataId(tempSubDataId);

                                var calcFormula = BizFormCalc.getFormula(control.attr("calcStr"), false);
                                // subDataId = subDataId;
                                var result = BizFormCalc.getResult(calcFormula, control, calcRightisNull);
                                if ((result + "").indexOf("Infinity") < 0) {//除数为0则直接执行下一个计算式
                                    BizFormCalc.setValue2ResultControl(targetField, result + "");
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }
                        var cacheValue = BizFormCalc.CalcCacheMap[control.attr("oursId")];
                        var trueValue = control.getValue();
                        var calc = control.attr("calc");
                        var calcArray = ours.parseJson(calc);
                        if (calc && calcArray.length > 0 && (cacheValue !== trueValue ||
                            calc.indexOf("count(") >= 0 ||
                            calc.indexOf("sum(") >= 0 ||
                            calc.indexOf("max(") >= 0 ||
                            calc.indexOf("min(") >= 0 ||
                            calc.indexOf("avg(") >= 0)) {
                            BizFormCalc.CalcCacheMap[control.attr("oursId")] = trueValue;
                            control.triggerAfterUpdate();
                        }
                    }
                }
            }
        }
    };

    var targetField = null;

    /**
     * 获取明细表表格
     * @param id
     * @returns {*}
     */
    BizFormCalc.getSubTable = function (id) {
        //瀑布流表格
        var subTable = NS.SubForm && NS.SubForm.getSubFormTable();
        if (!subTable) {//获取原样表单表格
            subTable = ours.getById("subForm_table_" + id);
        }
        return subTable;
    };

    var checkArray = ['sum', 'count', 'avg', 'max', 'min'];
    /**
     * ruleCheck
     * @param formula
     * @returns {boolean}
     */
    BizFormCalc.hasSubFuncCalc = function (formula) {

        for (var key in checkArray) {
            if (formula.indexOf(checkArray[key] + "(") > -1) {
                return true;
            }
        }
        return false;
    };

    /**
     * 根据计算是获取计算结果
     * @param formula 计算式
     * @param targetFieldControl 目标字段控件
     * @param calcRightIsNull 右边计算是否为空
     */
    BizFormCalc.getResult = function (formula, targetFieldControl, calcRightIsNull) {
        var result = "";
        if (!calcRightIsNull || BizFormCalc.hasSubFuncCalc(formula)) {
            try {
                result = window.eval(formula);
            } catch (e) {//如果计算错误则直接返回空字符串
                result = "";
            }
        }
        if (targetFieldControl.attr("type") == "datepicker") {
            if (result) {
                if (targetFieldControl.attr("showType") + "" == "0") {
                    result = ours.dateStrByDateStr(result, "yyyy-MM-dd");
                } else if (targetFieldControl.attr("showType") + "" == "1") {
                    result = ours.dateStrByDateStr(result, "yyyy-MM-dd HH:mm");
                }
            }
        } else if (targetFieldControl.attr("type") == "number" || targetFieldControl.attr("type") == "pay") {
            if ((result + "").indexOf("Infinity") > -1) {//除数为0的时候返回的结果
                result = "0";
            } else {
                if (result != null && result != "") {
                    if (result + '' === 'NaN') {
                        result = 0;
                    }
                    var validate = ours.parseJson(targetFieldControl.attr('validate') || '{}');
                    var dotNum = parseInt(validate.dotNum || 0);
                    if (dotNum == 0) {
                        if (NS.isRoundingNum + '' === 'true') {
                            result = Number(result).toFixed(0);
                        } else {
                            if (targetFieldControl.attr("format") === "%") {
                                result = Number(result).toFixed(3);
                            } else {
                                result = parseInt(result);
                            }
                        }
                    } else {
                        if (NS.isRoundingNum + '' == 'true') {
                            if ((result + "").indexOf(".") > 0) {
                                var rA = (result + "").split(".");
                                var dV = rA[1];
                                if (dV.length > 10) {//如果小数计算结果，小数位超过了10位则执行多次四舍五入
                                    // result = toFixed(result, dotNum + 1);
                                    result = Number(result).toFixed(dotNum + 3);
                                }
                            }
                            result = toFixed(result, dotNum);
                        } else {
                            // 原始代码，精度有问题
                            // result = Number(result).toFixed(20);
                            // result = (result + "").substring(0, (result + "").lastIndexOf(".") + dotNum + 1);
                            
                            // 处理百分比计算不对
                            var otherAttrsStr = JSON.parse(targetFieldControl.attr("otherAttrs"))
                            if(otherAttrsStr && (otherAttrsStr.format+'') === '%'){
                                result = result*100 + ''
                            }
                            // 修改代码
                            result = toFixed(result, dotNum);
                            
                            if(otherAttrsStr && (otherAttrsStr.format+'') === '%'){
                                result = result/100 + ''
                            } 
							//精度问题，需要截取，否则存不上
							result = result.substring(0,result.lastIndexOf(".") + dotNum + 1);
                        }
                    }
                    if(Number(result) === 0){
                        result = (result + "").replace("-", "");
                    }
                }
            }
        } else if (targetFieldControl.attr("type") == "textfield") {
            result = (result + "").replace(/[\n]/g, "");
        }
        return result;
    };

    /**
     * 处理计算式，得到可运行的计算式
     * @param calcFormula 计算式
     * @param isConditionCalc 是否条件计算式
     * @returns {*}
     */
    BizFormCalc.getFormula = function (calcFormula, isConditionCalc) {
        var dotReg = /\'.*?\'/gi;
        var num = 0;
        var tempFormula;
        //替换掉手动输入的字符
        tempFormula = calcFormula.replace(dotReg, function () {
            return "'$" + (num++) + "'";
        });
        //替换计算式中的变量
        tempFormula = BizFormCalc.replaceVar(tempFormula);
        //将计算式中的函数参数，含有字段Id的替换成可识别id
        tempFormula = BizFormCalc.replaceFieldId4Func(tempFormula);
        //将计算式中字段Id替换成可识别id
        tempFormula = BizFormCalc.replaceFiledId(tempFormula);
        //替换计算式中的函数名
        tempFormula = BizFormCalc.replaceFuncName(tempFormula);

        //如果存在手动收入得到字符串或者手动输入的数字，则计算右边都不为空
        if (tempFormula.indexOf("+'") > -1 || tempFormula.match(/[\+|\-|\*|\/]\d/)) {
            calcRightisNull = false;
        }

        var dotArray = calcFormula.match(dotReg);
        //将之前替换的手动输入字符替换回到计算式中
        if (dotArray && dotArray.length > 0) {
            for (var j = 0, jlen = dotArray.length; j < jlen; j++) {
                tempFormula = tempFormula.replace("'$" + j + "'", dotArray[j]);
            }
        }
        calcFormula = tempFormula;
        //判断是否是条件计算
        if (isConditionCalc || ours.startWith(calcFormula, "if")) {
            calcFormula = 'function _c(){' + calcFormula + '};_c();';
            //如果是条件计算则不管字段是否有值，都执行一次
            calcRightisNull = false;
        }
        return calcFormula;
    };
    /**
     * 参与计算的控件 触发计算事件 
     * @param control
     */
    BizFormCalc.doCalc = function (control) {
        calcRightisNull = true;
        //取控件的tableOursId，判断触发计算的控件是否明细表控件
        var tableOursId = control.attr("tableOursId");
        var isSubTrigger = !!tableOursId;//是否明细表触发
        var calcStr = control.attr("calc");
        if (!calcStr) {
            return;
        }
        var calcArray = ours.parseJson(calcStr);
        var calc = {};
        for (var i = 0, len = calcArray.length; i < len; i++) {
            NS.BizForm.addSaveLabel();
            calc = ours.parseJson(calcArray[i] || {});
            var calcFormula = calc["calcStr"];
            var tempCalcFormula = calcFormula;
            calcFormula = BizFormCalc.getFormula(calcFormula, calc.isConditionCalc);
            //获取结果字段ID
            var targetFieldId = calc["calcField"];
            //如果结果字段包含formId 则需要去掉formId 只留字段id
            var subFormId = null;
            if (targetFieldId.indexOf(".") > -1) {
                var parts = targetFieldId.split(".");
                subFormId = parts[0];
                targetFieldId = parts[1];
            }
            if (targetFieldId) {
                var result;
                //直接在界面中取控件，如果能取到则说明目标控件是主表字段，如果不能则说明是明细表控件
                targetField = ours.getById(targetFieldId);
                if (targetField) {
                    try {
                        //获取计算结果
                        result = BizFormCalc.getResult(calcFormula, targetField, calcRightisNull);
                        if ((result + "").indexOf("Infinity") > -1) {//除数为0则直接执行下一个计算式
                            continue;
                        }
                        //计算结果设置
                        NS.BizForm.releaseSaveLabel();

                        BizFormCalc.setValue2ResultControl(targetField, result + "");

                        var cacheValue = BizFormCalc.CalcCacheMap[targetField.attr("oursId")];
                        var trueValue = targetField.getValue();
                        if (cacheValue !== trueValue) {
                            BizFormCalc.CalcCacheMap[targetField.attr("oursId")] = trueValue;
                            //结果字段可能参与计算，需要触发主动计算
                            targetField.triggerAfterUpdate();
                        }
                    } catch (e) {
                        //这里不能抛出异常，不然下一个计算不能执行
                        // throw e;
                        console.error(e);
                    }
                } else {//根据目标字段获取目标控件所在的明细表是否存在
                    var subTable = BizFormCalc.getSubTable(subFormId);
                    if (subTable) {//目标字段的明细表存在界面上
                        var rowLength = subTable.getRowLength();
                        if (rowLength > 0) {
                            var subDataArray = subTable.attr("data");
                            if (isSubTrigger && !subDataId) {//如果是明细表触发，并且有明细表具体行Id则只触发一行
                                try {
                                    NS.BizForm.addSaveLabel();
                                    var subData = subTable.findRowBy({dataId: subDataId});
                                    if(subData[targetFieldId]){
                                        targetField = ours.getByOursId(subData[targetFieldId].controlOursId);
                                        calcFormula = BizFormCalc.getFormula(tempCalcFormula, calc.isConditionCalc);
                                        result = BizFormCalc.getResult(calcFormula, targetField, calcRightisNull);
                                        if ((result + "").indexOf("Infinity") < 0) {//除数为0则直接执行下一个计算式
                                            BizFormCalc.setValue2ResultControl(targetField, result + "", true);
                                            var cacheValue = BizFormCalc.CalcCacheMap[targetField.attr("oursId")];
                                            var trueValue = targetField.getValue();
                                            if (cacheValue !== trueValue) {
                                                BizFormCalc.CalcCacheMap[targetField.attr("oursId")] = trueValue;
                                                //结果字段可能参与计算，需要触发主动计算
                                                targetField.triggerAfterUpdate();
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            } else {
                                $.each(subDataArray, function (index, _subData) {
                                    if (_subData[targetFieldId]) {
                                        try {
                                            NS.BizForm.addSaveLabel();
                                            subDataId = _subData["dataId"];
                                            targetField = ours.getByOursId(_subData[targetFieldId].controlOursId);
                                            calcFormula = BizFormCalc.getFormula(tempCalcFormula, calc.isConditionCalc);
                                            //获取计算结果
                                            result = BizFormCalc.getResult(calcFormula, targetField, calcRightisNull);
                                            if ((result + "").indexOf("Infinity") < 0) {//除数为0则直接执行下一个计算式
                                                BizFormCalc.setValue2ResultControl(targetField, result + "", true);
                                                var cacheValue = BizFormCalc.CalcCacheMap[targetField.attr("oursId")];
                                                var trueValue = targetField.getValue();
                                                if (cacheValue !== trueValue) {
                                                    BizFormCalc.CalcCacheMap[targetField.attr("oursId")] = trueValue;
                                                    //结果字段可能参与计算，需要触发主动计算
                                                    targetField.triggerAfterUpdate();
                                                }
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }
                                });
                            }
                            NS.BizForm.releaseSaveLabel();
                        }
                    }
                }
            }
        }
        //如果没有找到目标字段等情况，也算是计算完成
        NS.BizForm.releaseSaveLabel();
    };
    /**
     * 替换字段Id
     * @param calcFormula
     * @returns {*}
     */
    BizFormCalc.replaceFiledId = function (calcFormula) {
        // var reg = /\{([^{]+)}/ig;
        var reg = /c_\{([^{]+)}|\{([^{]+)}/ig;
        var fields = calcFormula.match(reg);
        if (fields && fields.length > 0) {
            for (var i = 0, len = fields.length; i < len; i++) {
                var field = fields[i];
                var isConditionField = field.indexOf("c_{") > -1;
                var fieldId = field.replace("c_{", "").replace("{", "").replace("}", "");
                calcFormula = calcFormula.replace(field, "ours.getNS().BizFormCalc.getFieldValue('" + fieldId + "'," + isConditionField + ")");
                if (calcRightisNull) {
                    try {
                        var feildValue = BizFormCalc.getFieldValue(fieldId, isConditionField);
                        if (feildValue != null && feildValue !== "") {
                            calcRightisNull = false;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }
        return calcFormula;
    };

    /**
     * 替换函数中的字段Id
     * @param calcFormula
     * @returns {*}
     */
    BizFormCalc.replaceFieldId4Func = function (calcFormula) {
        var reg = /-?\{func_([^{]+)}/ig;
        var fields = calcFormula.match(reg);
        if (fields && fields.length > 0) {
            for (var i = 0, len = fields.length; i < len; i++) {
                var field = fields[i];
                // var parts = field.split('.');
                var isConditionField = field.indexOf("c_{") > -1;
                var fieldId;
                if (field.indexOf("-") == 0) {
                    fieldId = field.replace("-{func_", "'-").replace("}", "'");
                } else {
                    fieldId = field.replace("{func_", "'").replace("}", "'");
                }
                calcFormula = calcFormula.replace(field, fieldId);
                if (calcRightisNull) {
                    try {
                        var feildValue = BizFormCalc.getFieldValue(fieldId.replace(/'\-/g, "").replace(/'/g, ""), isConditionField);
                        if (feildValue != null && feildValue !== "") {
                            calcRightisNull = false;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }
        return calcFormula;
    };

    /**
     * 替换函数名称
     * @param calcFormula
     * @returns {*}
     */
    BizFormCalc.replaceFuncName = function (calcFormula) {
        var calcFuncs = BizFormCalc.calcMathFuncs;
        var reg;
        for (var i = 0, len = calcFuncs.length; i < len; i++) {
            reg = new RegExp(calcFuncs[i] + "\\(", "g");
            calcFormula = calcFormula.replace(reg, "ours.getNS().BizFormCalc." + calcFuncs[i] + "(");
        }
        return calcFormula;
    };

    /**
     * 替换变量
     * @param calcFormula
     * @returns {*}
     */
    BizFormCalc.replaceVar = function (calcFormula) {
        var reg = /\[([^\[]+)]/ig;
        var vars = calcFormula.match(reg);
        if (vars && vars.length > 0) {
            calcRightisNull = false;
            for (var i = 0, len = vars.length; i < len; i++) {
                var varStr = vars[i];
                var _varStr = varStr.replace("[", "").replace("]", "");
                calcFormula = calcFormula.replace(varStr, "ours.getNS().BizFormCalc.getVarByName('" + _varStr + "')");
            }
        }
        return calcFormula;
    };

    BizFormCalc.getFieldValue4Check = function (fieldId) {
        if (fieldId) {
            var formId;
            if (fieldId.indexOf(".") > -1) {
                var parts = fieldId.split('.');
                formId = parts[0];
                fieldId = parts[1];
            } else {
                console.log("没有表单Id的字段Id:" + fieldId);
            }
            var subTable = BizFormCalc.getSubTable(formId);

            if (typeof NS.SubForm != "undefined" && subTable && subDataId) {
                // var subDataId = NS.SubForm.currentRowData.dataId;
                //获取当前行数所有数据
                var subData = subTable.findRowBy({"dataId": subDataId});
                if (subData[fieldId]) {
                    return subData[fieldId]["value"];
                } else {//获取数据库中的数据做计算
                    return BizFormCalc.getFieldValue4FormData4Calc4Check(formId, fieldId)
                }
            } else {
                var field = ours.getById(fieldId);
                if (field) {
                    return field.getValue();
                } else {//获取数据库中的数据做计算
                    return BizFormCalc.getFieldValue4FormData4Calc4Check(formId, fieldId)
                }
            }
        }
        throw "字段未找到!fieldId:" + fieldId;
    };

    /**
     * 在数据库中获取字段值
     * @param formId
     * @param fieldId
     * @returns {*}
     */
    BizFormCalc.getFieldValue4FormData4Calc4Check = function (formId, fieldId) {
        if (formId.indexOf(".") > -1 && arguments.length == 1) {
            var parts = formId.split('.');
            formId = parts[0];
            fieldId = parts[1];
        }
        var fieldValue;
        try {
            var formData4Calc = NS.formData4Calc['formData'];
            var formData = formData4Calc[formId];
            var fieldDatas = formData[fieldId];
            var fieldData = fieldDatas[0];
            var controlType = fieldData['controlType'];
            fieldValue = fieldData['value']
        } catch (e) {
            throw "获取字段值失败！formId:" + formId + ";fieldId:" + fieldId;
        }
        return fieldValue;
    };


    /**
     * 根据变量名获取变量值
     * @param varName
     * @returns {*}
     */
    BizFormCalc.getVarByName = function (varName) {
        var formSysVar = NS.formData4Calc['sysVar'];
        if (varName) {
            var varValue;
            try {
                varValue = formSysVar[varName]['value'];
            } catch (e) {
                throw "获取变量出错";
            }
            return varValue;
        } else {
            return "";
        }
    };

    /**
     * 在数据库中获取字段值
     * @param formId
     * @param fieldId
     * @param isConditionCalc
     * @returns {*}
     */
    BizFormCalc.getFieldValue4FormData4Calc = function (formId, fieldId, isConditionCalc) {
        if (formId.indexOf(".") > -1 && arguments.length == 1) {
            var parts = formId.split('.');
            formId = parts[0];
            fieldId = parts[1];
        }
        var fieldValue = "";
        try {
            var formData4Calc = NS.formData4Calc['formData'];
            var formData = formData4Calc[formId];
            var fieldDatas = formData[fieldId];
            var fieldData = fieldDatas[0];
            var controlType = fieldData['controlType'];
            var data4DB = fieldData['data4DB'];
            data4DB = ours.parseJson(data4DB);
            if (fieldData['controlType'] == 'number') {
                if (isConditionCalc) {
                    fieldValue = fieldData['value'];
                    if (fieldValue == '') {
                        fieldValue = null;
                    }
                } else {
                    if (targetField && (targetField.attr("type") == "textfield" || targetField.attr("type") == "textarea")) {
                        fieldValue = fieldData['value'] + "";
                    } else {
                        fieldValue = Number(fieldData['value'] || 0);
                    }
                }
            } else if (controlType == "radio" || controlType == "singleselect") {
                if (isConditionCalc) {
                    return data4DB["value"] || null;
                }
                if (controlType == "radio" && (data4DB["value"] + "" == "-1") && (!data4DB['display'])) {
                    fieldValue = "其它";
                } else {
                    fieldValue = data4DB["display"] || "";
                }
            } else if (controlType === 'multiselect') {//多选框
                fieldValue = getDisplayBydata4DB(data4DB);
            } else if (controlType == "selectperson" || controlType == "selectdept") {
                var selectPersonItems = data4DB["items"];
                if (selectPersonItems && selectPersonItems.length > 0) {
                    var selectPersonVo = selectPersonItems[0];
                    if (isConditionCalc) {
                        return selectPersonVo["id"] || null;
                    }
                    fieldValue = selectPersonVo['name'];
                } else {
                    fieldValue = "";
                    if (isConditionCalc) {
                        fieldValue = null;
                    }
                }
            } else if (fieldData['controlType'] == 'textfield' || fieldData['controlType'] == 'textarea') {
                fieldValue = fieldData['value'] || "";
            } else {
                fieldValue = fieldData['value'];
                if (isConditionCalc) {
                    fieldValue = fieldValue || null;
                }
            }
        } catch (e) {
            throw "获取字段值失败！formId:" + formId + ";fieldId:" + fieldId;
        }
        if (isConditionCalc) {
            fieldValue = fieldValue || null;
        }
        return fieldValue;
    };

    var getDisplayBydata4DB = function (data4DB) {
        var dataArray = data4DB.items;
        var display = [];
        if (dataArray) {
            for (var i = 0, len = dataArray.length; i < len; i++) {
                if (dataArray[i].value === '-1' && !dataArray[i].display) {
                    display.push("其它");
                } else {
                    display.push(dataArray[i].display);
                }
            }
        }
        return display.join("，");
    };

    /**
     * 获取明细表字段值数组
     * @param formId
     * @param fieldId
     * @returns {Array}
     */
    BizFormCalc.getSubFieldValue4FormData4Calc = function (formId, fieldId) {
        if (formId.indexOf(".") > -1 && arguments.length == 1) {
            var parts = formId.split('.');
            formId = parts[0];
            fieldId = parts[1];
        }
        var fieldValueArray = [];
        try {
            var subTable = BizFormCalc.getSubTable(formId);
            var formData4Calc = NS.formData4Calc['formData'];
            //判断当前页是否明细表页面
            if (typeof NS.SubForm != "undefined" && subTable) {//重复表
                var tableDatas = subTable.attr("data");
                for (var i = 0, len = tableDatas.length; i < len; i++) {
                    var fieldData = tableDatas[i][fieldId];
                    var fieldValue;
                    var controlType = fieldData['controlType'];
                    var control = ours.getByOursId(fieldData.controlOursId);
                    var data4DB = control.getData4DB();
                    data4DB = ours.parseJson(data4DB);
                    if (controlType == 'number') {
                        fieldValue = Number(fieldData['value'] || 0);
                    } else if (controlType == "radio" || controlType == "singleselect") {
                        if (controlType == "radio" && (data4DB["value"] + "" == "-1") && (!data4DB['display'])) {
                            fieldValue = "其它";
                        } else {
                            fieldValue = data4DB["display"] || "";
                        }
                    } else if (controlType === 'multiselect') {//多选框
                        fieldValue = getDisplayBydata4DB(data4DB);
                    } else if (controlType == "selectperson" || controlType == "selectdept") {
                        var selectPersonItems = data4DB["items"];
                        if (selectPersonItems && selectPersonItems.length > 0) {
                            var selectPersonVo = selectPersonItems[0];
                            fieldValue = selectPersonVo['name'];
                        } else {
                            fieldValue = "";
                        }
                    } else {
                        fieldValue = fieldData['value']
                    }
                    fieldValueArray.push(fieldValue);
                }
            } else if (formData4Calc && formData4Calc[formId] && formData4Calc[formId][fieldId]) {
                var formData = formData4Calc[formId];
                var fieldDatas = formData[fieldId];
                for (var i = 0; i < fieldDatas.length; i++) {
                    var fieldData = fieldDatas[i];
                    var fieldValue;
                    var controlType = fieldData['controlType'];
                    var data4DB = fieldData['data4DB'];
                    data4DB = ours.parseJson(data4DB);
                    if (controlType == 'number') {
                        fieldValue = Number(fieldData['value'] || 0);
                    } else if (controlType == "radio" || controlType == "singleselect") {
                        if (controlType == "radio" && (data4DB["value"] + "" == "-1") && (!data4DB['display'])) {
                            fieldValue = "其它";
                        } else {
                            fieldValue = data4DB["display"] || "";
                        }
                    } else if (controlType === 'multiselect') {//多选框
                        fieldValue = getDisplayBydata4DB(data4DB);
                    } else if (controlType == "selectperson" || controlType == "selectdept") {
                        var selectPersonItems = data4DB["items"];
                        if (selectPersonItems && selectPersonItems.length > 0) {
                            var selectPersonVo = selectPersonItems[0];
                            fieldValue = selectPersonVo['name'];
                        } else {
                            fieldValue = "";
                        }
                    } else {
                        fieldValue = fieldData['value']
                    }
                    fieldValueArray.push(fieldValue);
                }
            } else {
                return fieldValueArray;
            }
        } catch (e) {
            throw "获取字段值失败！formId:" + formId + ";fieldId:" + fieldId;
        }
        return fieldValueArray;
    };

    /**
     * 根据字段Id（包含表单Id）获取字段值
     * @param fieldId
     * @param isConditionCalc
     * @returns {*}
     */
    BizFormCalc.getFieldValue = function (fieldId, isConditionCalc) {
        if (fieldId) {
            var formId;
            if (fieldId.indexOf(".") > -1) {
                var parts = fieldId.split('.');
                formId = parts[0];
                fieldId = parts[1];
            } else {
                console.log("没有表单Id的字段Id:" + fieldId);
            }
            var subTable = BizFormCalc.getSubTable(formId);

            if (subTable && subDataId) {
                var subData = subTable.findRowBy({"dataId": subDataId});
                if (subData[fieldId]) {
                    var control = ours.getByOursId(subData[fieldId].controlOursId);
                    if (control) {
                        var controlType = control.attr("type");
                        var data4DB = control.getData4DB();//subData[fieldId]["data"];
                        data4DB = ours.parseJson(data4DB);
                        if (controlType == "number" || controlType == "numberonline") {
                            if (isConditionCalc) {
                                if (subData[fieldId]["value"] == '') {
                                    return null;
                                } else {
                                    return subData[fieldId]["value"];
                                }
                            } else {
                                if (targetField && (targetField.attr("type") == "textfield" || targetField.attr("type") == "textarea")) {
                                    if (control.attr("format") === "%") {
                                        if (control.getFormatValue()) {
                                            return control.getFormatValue() + "%";
                                        } else {
                                            return "";
                                        }
                                    } else {
                                        return control.getFormatValue() + "";
                                    }
                                } else {
                                    return Number(subData[fieldId]["value"]);
                                }
                            }
                        } else if (controlType == "radio" || controlType == "singleselect") {
                            if (isConditionCalc) {
                                return data4DB["value"] || null;
                            }
                            if (controlType == "radio" && (data4DB["value"] + "" == "-1") && (!data4DB['display'])) {
                                return "其它";
                            }
                            return data4DB["display"] || "";
                        } else if (controlType === 'multiselect') {//多选框
                            return getDisplayBydata4DB(data4DB);
                        } else if (controlType == "selectperson" || controlType == "selectdept") {
                            var selectPersonItems = data4DB["items"];
                            if (selectPersonItems && selectPersonItems.length > 0) {
                                var selectPersonVo = selectPersonItems[0];
                                if (isConditionCalc) {
                                    return selectPersonVo["id"] || null;
                                }
                                return selectPersonVo['name'];
                            } else {
                                if (isConditionCalc) {
                                    return null;
                                }
                                return "";
                            }
                        } else if (controlType == 'textfield' || controlType == 'textarea') {
                            return subData[fieldId]["value"] || "";
                        }
                    }
                    if (isConditionCalc) {
                        return subData[fieldId]["value"] || null;
                    }
                    return subData[fieldId]["value"];
                } else {//获取数据库中的数据做计算
                    return BizFormCalc.getFieldValue4FormData4Calc(formId, fieldId, isConditionCalc)
                }
            } else {
                var field = ours.getById(fieldId);
                if (field) {
                    var val = field.getValue();
                    var controlType = field.attr("type");
                    var data4DB = field.getData4DB();//subData[fieldId]["data"];
                    data4DB = ours.parseJson(data4DB);
                    if (field.attr("type") == "number" || field.attr("type") == "numberonline") {
                        if (isConditionCalc) {
                            return val || null;
                        } else {
                            if (targetField && (targetField.attr("type") == "textfield" || targetField.attr("type") == "textarea")) {
                                if (field.attr("format") === "%") {
                                    if (field.getFormatValue()) {
                                        return field.getFormatValue() + "%";
                                    } else {
                                        return "";
                                    }
                                } else {
                                    return field.getFormatValue() + "";
                                }
                            } else {
                                val = val || 0;
                                return Number(val);
                            }
                        }
                    } else if (controlType == "radio" || controlType == "singleselect") {
                        if (isConditionCalc) {
                            return data4DB["value"] || null;
                        }
                        if (controlType == "radio" && (data4DB["value"] + "" == "-1") && (!data4DB['display'])) {
                            return "其它";
                        }
                        return data4DB["display"] || "";
                    } else if (controlType === 'multiselect') {//多选框
                        return getDisplayBydata4DB(data4DB);
                    } else if (controlType == "selectperson" || controlType == "selectdept") {
                        var selectPersonItems = data4DB["items"];
                        if (selectPersonItems && selectPersonItems.length > 0) {
                            var selectPersonVo = selectPersonItems[0];
                            if (isConditionCalc) {
                                return selectPersonVo['id'] || null;
                            }
                            return selectPersonVo['name'];
                        } else {
                            if (isConditionCalc) {
                                return null;
                            }
                            return "";
                        }
                    } else if (controlType == 'textfield' || controlType == 'textarea') {
                        return val || "";
                    } else {
                        if (isConditionCalc) {
                            return val || null;
                        } else {
                            return val;
                        }
                    }
                } else {//获取数据库中的数据做计算
                    return BizFormCalc.getFieldValue4FormData4Calc(formId, fieldId, isConditionCalc)
                }
            }
        }
        throw "字段未找到!fieldId:" + fieldId;
    };

    function toFixed(number, decimal) {
        decimal = decimal || 0;
        var s = String(number);
        var decimalIndex = s.indexOf('.');
        var fraction = '';
        var i;
        if (decimalIndex < 0) {
            fraction = '';
            for (i = 0; i < decimal; i++) {
                fraction += '0';
            }
            return s + '.' + fraction;
        }
        var numDigits = s.length - 1 - decimalIndex;
        if (numDigits <= decimal) {
            fraction = '';
            for (i = 0; i < decimal - numDigits; i++) {
                fraction += '0';
            }
            return s + fraction;
        }
        var digits = s.split('');
        var pos = decimalIndex + decimal;
        var roundDigit = digits[pos + 1];
        if (roundDigit > 4) {
            //跳过小数点
            if (pos == decimalIndex) {
                --pos;
            }
            digits[pos] = Number(digits[pos] || 0) + 1;
            //循环进位
            while (digits[pos] == 10) {
                digits[pos] = 0;
                --pos;
                if (pos == decimalIndex) {
                    --pos;
                }
                digits[pos] = Number(digits[pos] || 0) + 1;
            }
        }
        //避免包含末尾的.符号
        if (decimal == 0) {
            decimal--;
        }
        return digits.slice(0, decimalIndex + decimal + 1).join('');
    }

    BizFormCalc.getMod = function (fieldId, divs) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        var field2Value = divs;
        if (typeof divs == "string" && divs.indexOf("field_") > -1) {
            field2Value = BizFormCalc.getFieldValue(divs);
        }
        return ours.CalcMath.getMod(Number(field1Value), field2Value);
    };

    BizFormCalc.subDate = function (fieldId1, fieldId2) {
        var field1Value = BizFormCalc.getFieldValue(fieldId1);
        var field2Value = BizFormCalc.getFieldValue(fieldId2);
        return ours.CalcMath.subDate(field1Value, field2Value);
    };

    BizFormCalc.subDateTime = function (fieldId1, fieldId2) {
        var field1Value = BizFormCalc.getFieldValue(fieldId1);
        var field2Value = BizFormCalc.getFieldValue(fieldId2);
        return ours.CalcMath.subDateTime(field1Value, field2Value);
    };

    BizFormCalc.getInt = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getInt(field1Value);
    };

    BizFormCalc.getYear = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getYear(field1Value);
    };

    BizFormCalc.getMonth = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getMonth(field1Value);
    };

    BizFormCalc.getDay = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getDay(field1Value);
    };

    BizFormCalc.weekday = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.weekday(field1Value);
    };
    BizFormCalc.roundUp = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.roundUp(field1Value);
    };
    BizFormCalc.roundDown = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.roundDown(field1Value);
    };

    BizFormCalc.toUpperForLong = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.toUpperForLong(field1Value);
    };

    BizFormCalc.toUpperForShort = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.toUpperForShort(field1Value);
    };

    BizFormCalc.toUpper = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.toUpper(field1Value);
    };

    BizFormCalc.date = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.date(field1Value);
    };

    BizFormCalc.time = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.time(field1Value);
    };

    BizFormCalc.getYearMonth = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getYearMonth(field1Value);
    };

    BizFormCalc.calcDateTime = function (fieldId1, fieldId2) {
        var field1Value = BizFormCalc.getFieldValue(fieldId1);
        var field2Value = fieldId2;
        if (typeof fieldId2 == "string" && fieldId2.indexOf("field_") > -1) {
            if (fieldId2.indexOf("-") == 0) {
                field2Value = (-BizFormCalc.getFieldValue(fieldId2.substr(1)));
            } else {
                field2Value = BizFormCalc.getFieldValue(fieldId2);
            }
        }
        var result = ours.CalcMath.calcDateTime(field1Value, field2Value);
        if (result) {
            result = result.format("yyyy-MM-dd HH:mm:ss");
        }
        return result;
    };

    BizFormCalc.calcDateTimeByHour = function (fieldId1, fieldId2) {
        var field1Value = BizFormCalc.getFieldValue(fieldId1);
        var field2Value = fieldId2;
        if (typeof fieldId2 == "string" && fieldId2.indexOf("field_") > -1) {
            if (fieldId2.indexOf("-") == 0) {
                field2Value = (-BizFormCalc.getFieldValue(fieldId2.substr(1)));
            } else {
                field2Value = BizFormCalc.getFieldValue(fieldId2);
            }
        }
        var result = ours.CalcMath.calcDateTimeByHour(field1Value, field2Value);
        if (result) {
            result = result.format("yyyy-MM-dd HH:mm:ss");
        }
        return result;
    };

    BizFormCalc.like = function (str1, str2) {
        return ours.CalcMath.like(str1, str2);
    };

    BizFormCalc.compareDate = function (str1, str2, op) {
        return ours.CalcMath.compareDate(str1, str2, op);
    };

    BizFormCalc.compareDateTime = function (str1, str2, op) {
        return ours.CalcMath.compareDateTime(str1, str2, op);
    };

    BizFormCalc.funcIn = function (str1, str2) {
        return ours.CalcMath.funcIn(str1, str2);
    };

    BizFormCalc.funcNotIn = function (str1, str2) {
        return ours.CalcMath.funcNotIn(str1, str2);
    };

    BizFormCalc.sum = function (fieldId) {
        var fieldValues = BizFormCalc.getSubFieldValue4FormData4Calc(fieldId);
        var result = ours.CalcMath.sum(fieldValues);
        return Number(result);
    };

    BizFormCalc.count = function (fieldId) {
        var fieldValues = BizFormCalc.getSubFieldValue4FormData4Calc(fieldId);
        return ours.CalcMath.count(fieldValues);
    };

    BizFormCalc.avg = function (fieldId) {
        var fieldValues = BizFormCalc.getSubFieldValue4FormData4Calc(fieldId);
        return ours.CalcMath.avg(fieldValues);
    };

    BizFormCalc.max = function (fieldId) {
        var fieldValues = BizFormCalc.getSubFieldValue4FormData4Calc(fieldId);
        return ours.CalcMath.max(fieldValues);
    };

    BizFormCalc.min = function (fieldId) {
        var fieldValues = BizFormCalc.getSubFieldValue4FormData4Calc(fieldId);
        return ours.CalcMath.min(fieldValues);
    };

    BizFormCalc.getIDBirthday = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getIDBirthday(field1Value);
    };

    BizFormCalc.getAge = function (fieldId) {
        var field1Value = BizFormCalc.getFieldValue(fieldId);
        return ours.CalcMath.getAge(field1Value);
    };


    window.formBean = window.formBean || NS.formBean || {};
    window.dataBean = window.dataBean || NS.dataBean || {};
    /**
     * 全部满足条件 函数
     * @param subFormId
     * @param exp
     * @returns {boolean}
     */
    BizFormCalc.all = function (subFormId, exp) {
        var subTable = BizFormCalc.getSubTable(subFormId);
        var oldSubId = subDataId;
        if (subTable && subTable.getRowLength() > 0) {
            var allData = subTable.getData();
            var subData = null;
            for (var i = 0, len = allData.length; i < len; i++) {
                subData = allData[i];
                subDataId = subData['dataId'].value;
                var expStr = 'function _expStrC(){return ' + exp + '};_expStrC();';
                var flag = false;
                try {
                    flag = window.eval(expStr);
                } catch (e) {
                    flag = false;
                }
                if (flag === false) {
                    subDataId = oldSubId;
                    return false;
                }
            }
            subDataId = oldSubId;
            return true;
        } else {
            return false;
        }
    };

    /**
     * 部分满足条件函数
     * @param subFormId
     * @param exp
     * @returns {boolean}
     */
    BizFormCalc.exists = function (subFormId, exp) {
        var subTable = BizFormCalc.getSubTable(subFormId);
        var oldSubId = subDataId;
        if (subTable && subTable.getRowLength() > 0) {
            var allData = subTable.getData();
            var subData = null;
            for (var i = 0, len = allData.length; i < len; i++) {
                subData = allData[i];
                subDataId = subData['dataId'].value;
                var expStr = 'function _expStrC(){return ' + exp + '};_expStrC();';
                var flag = false;
                try {
                    flag = window.eval(expStr);
                } catch (e) {
                    flag = false;
                }
                if (flag === true) {
                    subDataId = oldSubId;
                    return true;
                }
            }
            subDataId = oldSubId;
            return false;
        } else {
            return false;
        }
    };

    NS.BizFormCalc = BizFormCalc;
})();