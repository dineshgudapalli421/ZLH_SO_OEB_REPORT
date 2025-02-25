sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/Token"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageToast, MessageBox, Filter, FilterOperator, JSONModel, Token) {
        "use strict";
        var oRouter, oController, oSelectionScreenModel, oOEBoDataModel, oResourceBundle, UIComponent;
        return Controller.extend("com.sap.lh.cs.zlhoebreport.controller.selection", {
            onInit: function () {
                oController = this;
                UIComponent = oController.getOwnerComponent();
                oOEBoDataModel = oController.getOwnerComponent().getModel();
                oRouter = UIComponent.getRouter();
                oResourceBundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
                var oModel = new JSONModel({});
                var oSelectionModel = new JSONModel({
                    bPageBusy: false,
                    OrderNo: [],
                    OrderStatusSelected: [],
                    OperationStatusSelected: [],
                    minDate: new Date(),
                    sActualFinishDate: "",
                    aSelOpWorkCenter: [],
                    aSelOpActivity: [],
                    aSelOrders: [],
                    aSelOrderType: [],
                    aSelMainWC: [],
                    OrderStatus: [{ Key: 'OUTS', description: 'Outstanding' },
                    { Key: 'INPR', description: 'In Process' },
                    { Key: 'COMP', description: 'Completed' },
                    { Key: 'Hist', description: 'Historical' },
                    { Key: 'OEBE', description: 'OEB Exception' }],
                    OperationStatus: [
                        {
                            Key: 'HOLD',
                            description: 'hold'
                        }, {
                            Key: 'RCC',
                            description: 'ready for customer confirm'
                        }, {
                            Key: 'DISP',
                            description: 'DISPATCHED'
                        }, {
                            Key: 'RDFD',
                            description: 'Ready for dispatch'
                        }, {
                            Key: 'COMP',
                            description: 'Completed'
                        }]
                });
                oController.getOwnerComponent().setModel(oModel, "GlobalOEBModel");
                oController.getView().setModel(oSelectionModel, "oSelectionModel");
            },

            onPressNext: function () {
                var oModel = oController.getView().getModel("oSelectionModel");
                var sPath = "/OEB_OPSSet";
                oModel.setProperty("/bPageBusy", true);
                var aFilter = oController._fnReturnFilterparameter();
                oOEBoDataModel.read(sPath, {
                    filters: aFilter,
                    success: function (oData) {
                        var oResults = oData.results;
                        if (oResults.length) {
                            UIComponent.getModel("GlobalOEBModel").setProperty("/OEBReportList", oResults);
                            oRouter.navTo("OEBReport");
                        } else {
                            MessageBox.error("No results found for selection criteria");
                        }
                        oModel.setProperty("/bPageBusy", false);
                    }, error: function (oError) {
                        var oMessage;
                        oModel.setProperty("/bPageBusy", false);
                        if (oError.responseText.startsWith("<")) {
                            var parser = new DOMParser();
                            var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");
                            oMessage = xmlDoc.getElementsByTagName("message")[0].childNodes[0].nodeValue;
                        } else {
                            var oResponseText = oError.responseText;
                            var sParsedResponse = JSON.parse(oResponseText);
                            oMessage = sParsedResponse.error.message.value
                        }
                        MessageBox.error(oMessage);
                    }
                })
            },
            onSubmitOrderNumber: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oSelOrder = oModel.getProperty("/aSelOrders");
                var sOrderNo = oEvent.getParameter('value');
                var sPath = "/Service_OrderSet('" + sOrderNo + "')";
                var oSource = oEvent.getSource();
                oModel.setProperty("/bPageBusy", true);
                oOEBoDataModel.read(sPath, {
                    success: function (oData) {
                        if (oData.OrderId) {
                            var oToken = new Token({
                                key: oData.OrderId, //Key
                                text: oData.OrderId // Text
                            });
                            oSource.addToken(oToken);
                            oSource.setValue("");
                            oSelOrder.push(oData.OrderId);
                            oModel.setProperty("/aSelOrders", oSelOrder);
                            oModel.setProperty("/bPageBusy", false);
                        }
                    }, error: function (oError) {
                        var oMessage;
                        oModel.setProperty("/bPageBusy", false);
                        if (oError.responseText.startsWith("<")) {
                            var parser = new DOMParser();
                            var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");
                            oMessage = xmlDoc.getElementsByTagName("message")[0].childNodes[0].nodeValue;
                        } else {
                            var oResponseText = oError.responseText;
                            var sParsedResponse = JSON.parse(oResponseText);
                            oMessage = sParsedResponse.error.message.value
                        }
                        MessageBox.error(oMessage);
                    }
                })
            },
            // _fnReturnFilterparameter: function () {
            //     var oModel = oController.getView().getModel("oSelectionModel");
            //     var OrderNumber = oModel.getProperty("/OrderNo");
            //     var aFilter = [];
            //     aFilter.push(new Filter({
            //         filters: [
            //             new Filter({
            //                 path: 'OrderNo',
            //                 operator: FilterOperator.EQ,
            //                 value1: OrderNumber//"000001000020"
            //             })
            //         ],
            //         and: true
            //     }));
            //     return aFilter;
            // },
            _fnReturnFilterparameter: function () {
                // debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var OrderStatus = oModel.getProperty("/OrderStatusSelected");
                var aOrderNo = oModel.getProperty("/aSelOrders");
                var OrdType = oModel.getProperty("/aSelOrderType");
                var aFunLoc = [];
                var aMainWorkCenter = oModel.getProperty("/aSelMainWC");
                var aPeriod = [];
                var aOpeWorkCenter = [];
                var aOpActivityType = oModel.getProperty("/aSelOpActivity");
                var ActualFinishDate = oModel.getProperty("/sActualFinishDate"); //need to correct
                var OperationStatus = oModel.getProperty("/OperationStatusSelected");

                function createOrFilter(arr, field) {
                    if (!arr || arr.length === 0) return null;
                    var filters = arr.map(value => new Filter(field, FilterOperator.EQ, value));
                    return new Filter(filters, false);
                }

                var afilterOrdStatus = createOrFilter(OrderStatus, "Status");
                var afilterOrderNo = createOrFilter(aOrderNo, "OrderNo");
                var afilterOrderType = createOrFilter(OrdType, "ORDER_TYPE");
                var afilterFunLoc = createOrFilter(aFunLoc, "FUN_LOC"); // change Filed name 
                var afilterWorkCenter = createOrFilter(aMainWorkCenter, "WorkCenter");
                var afilterPeriod = createOrFilter(aPeriod, "Period"); // change Filed name 
                var afilterOpWorkCenter = createOrFilter(aOpeWorkCenter, "OP_WORKCENTER");
                var afilterOpActivity = createOrFilter(aOpActivityType, "OP_ACTIVITY"); // change Filed name 
                var afilterActualFinishDate = createOrFilter(ActualFinishDate, "ActualFinsihDate"); // change Filed name 
                var afilterOpSTATUS = createOrFilter(OperationStatus, "OP_STATUS"); // change Filed name 
                var allFilters = [afilterOrdStatus, afilterOrderNo, afilterOrderType, afilterFunLoc, afilterWorkCenter,
                    afilterPeriod, afilterOpWorkCenter, afilterOpActivity, afilterActualFinishDate, afilterOpSTATUS].filter(f => f !== null);
                // var finalFilter = new sap.ui.model.Filter(allFilters, true);
                return allFilters; //finalFilter;
            },
            onOpActivSuggestionItemPress: function (oEvent) {
                var oModel = oController.getView().getModel("oSelectionModel");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOpActivity");
                var oValue = oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
                var oSelOpActivity = oModel.getProperty("/aSelOpActivity");
                oSelOpActivity.push(oValue);
                oModel.setProperty("/aSelOpActivity", oSelOpActivity);
            },
            onMainWCSuggestionItemPress: function (oEvent) {
                var oModel = oController.getView().getModel("oSelectionModel");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idMainWorkCenter");
                var oValue = oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
                var oSelMainWC = oModel.getProperty("/aSelMainWC");
                oSelMainWC.push(oValue);
                oModel.setProperty("/aSelMainWC", oSelMainWC);
            },
            onOrderTypeSuggestionItemPress: function (oEvent) {
                var oModel = oController.getView().getModel("oSelectionModel");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOrderType");
                var oValue = oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
                var oSelOrderType = oModel.getProperty("/aSelOrderType");
                oSelOrderType.push(oValue);
                oModel.setProperty("/aSelOrderType", oSelOrderType);
            },
            onOrderSuggestionItemPress: function (oEvent) {
                var oModel = oController.getView().getModel("oSelectionModel");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idServiceOrder");
                var oValue = oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
                var oSelOrder = oModel.getProperty("/aSelOrders");
                oSelOrder.push(oValue);
                oModel.setProperty("/aSelOrders", oSelOrder);
            },
            onOpWorkCenterPress: function (oEvent) {
                var oModel = oController.getView().getModel("oSelectionModel");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOpWorkCenter");
                var oValue = oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
                var oSelOpWC = oModel.getProperty("/aSelOpWorkCenter");
                oSelOpWC.push(oValue);
                oModel.setProperty("/aSelOpWorkCenter", oSelOpWC);
            },
            onSuggestionItemSelected: function (oSelectedItem, oMultiInput) {
                var oSelectedCells = oSelectedItem.getCells();
                var oToken = new Token({
                    key: oSelectedCells[1].getText(), //Key
                    text: oSelectedCells[0].getText() // Text
                });
                oMultiInput.addToken(oToken);
                oMultiInput.setValue("");
                return oSelectedCells[0].getText()
            }
        });


    });
