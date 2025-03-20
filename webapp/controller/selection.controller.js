sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/Token",
    "sap/ui/table/Column",
    "sap/m/Label"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageToast, MessageBox, Filter, FilterOperator, JSONModel, Token, UIColumn, Label) {
        "use strict";
        var oRouter, oController, oSelectionScreenModel, oOEBoDataModel, oResourceBundle, UIComponent;
        return Controller.extend("com.sap.lh.cs.zlhoebreport.controller.selection", {
            onInit: function () {
                oController = this;
                oOEBoDataModel = oController.getOwnerComponent().getModel();
                oRouter = oController.getOwnerComponent().getRouter();
                UIComponent = oController.getOwnerComponent();
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
                    aSelOrderType: ["MS01"],
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
                var oInput = oController.getView().byId("idOrderType");
                oInput.setTokens([
                    new Token({ text: "MS01", key: "MS01" }),
                ]);
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
                            UIComponent.getModel("GlobalOEBModel").setProperty("/SelParameters", aFilter);
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
                var oModel = oController.getView().getModel("oSelectionModel");
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
            onValueHelpRequested: function (oEvent) {
                // this._oBasicSearchField = new sap.m.SearchField();
                var oInput = oEvent.getSource();
                this.loadFragment({
                    name: "com.sap.lh.cs.zlhoebreport.fragment.ValueHelp.valueHelp"
                }).then(function (oDialog) {
                    // Set Basic Search for FilterBar
                    // oFilterBar.setFilterBarExpanded(false);
                    // oFilterBar.setBasicSearch(this._oBasicSearchField);
                    oDialog.getTableAsync().then(function (oTable) {
                        if (oTable) {
                            if (!oTable.getModel()) {
                                oTable.setModel(sap.ui.getCore().getModel());
                            }
                            var oColumnProductCode = new sap.ui.table.Column({
                                label: new sap.m.Label({ text: "Order Number" }),
                                template: new sap.m.Text({ text: "{OrderId}" })
                            });
                            oColumnProductCode.data({
                                fieldName: "OrderId"
                            });
                            oTable.addColumn(oColumnProductCode);

                            var oColumnProductName = new sap.ui.table.Column({
                                label: new sap.m.Label({ text: "Description" }),
                                template: new sap.m.Text({ wrapping: false, text: "{Description}" })
                            });
                            oColumnProductName.data({
                                fieldName: "Description"
                            });
                            oTable.addColumn(oColumnProductName);
                            oTable.bindRows({
                                path: "/Service_OrderSet",
                                events: {
                                    dataReceived: function () {
                                        // Handle data received event
                                    }
                                }
                            });

                            oDialog.update();
                        }
                    });
                    oDialog.setTokens(oInput.getTokens());
                    oDialog.open();
                    this._oValueHelpDialog = oDialog;
                }.bind(this));
            },
            onOrderNumberOkPress: function (oEvent) {
                var oMultiInput = oController.getView().byId("idServiceOrder");
                var aTokens = oEvent.getParameter("tokens");
                oMultiInput.setTokens(aTokens);
                this._oValueHelpDialog.close();
            },
            onOrderNumberCancelPress: function () {
                this._oValueHelpDialog.close();
            },
            onOrderNumberAfterClose: function () {
                this._oValueHelpDialog.destroy();
            },
            onFilterDataOrders: function (oEvent) {
                var selectionSet = oEvent.getParameters().selectionSet;
                var OrderID = selectionSet[0].getValue();
                var Description = selectionSet[1].getValue();
                debugger;
            },
            _getTockens: function (oSource) {
                var aList = [];
                var aTokens = oSource.getTokens();
                aList = aTokens.map(object => object.getText());
                return aList
            },

            _fnReturnFilterparameter: function () {
                var oView = oController.getView();
                var oModel = oController.getView().getModel("oSelectionModel");
                var OrderStatus = oModel.getProperty("/OrderStatusSelected"); // oController._getTockens();
                var aOrderNo = oController._getTockens(oView.byId("idServiceOrder"));
                var OrdType = oController._getTockens(oView.byId("idOrderType"));
                var aFunLoc = [];
                var aMainWorkCenter = oController._getTockens(oView.byId("idMainWorkCenter"));
                var aPeriod = [];
                var aOpeWorkCenter = [];
                var aOpActivityType = [];
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
                return allFilters;
            },
            onOpActivSuggestionItemPress: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOpActivity");
                oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            },
            onMainWCSuggestionItemPress: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idMainWorkCenter");
                oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            },
            onOrderTypeSuggestionItemPress: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOrderType");
                oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            },
            onOrderSuggestionItemPress: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idServiceOrder");
                oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            },
            onOpWorkCenterPress: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOpWorkCenter");
                oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            },
            onSuggestionItemSelected: function (oSelectedItem, oMultiInput) {
                var oSelectedCells = oSelectedItem.getCells();
                var oToken = new Token({
                    key: oSelectedCells[1].getText(), //Key
                    text: oSelectedCells[0].getText() // Text
                });
                oMultiInput.addToken(oToken);
                oMultiInput.setValue("");
            }
        });


    });
