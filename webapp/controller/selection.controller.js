sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/Token",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/ushell/services/PersonalizationV2",
    "sap/ui/model/type/Date"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageToast, MessageBox, Filter, FilterOperator, JSONModel, Token, UIColumn, Label, PersonalizationV2, DateType) {
        "use strict";
        var oRouter, oController, oSelectionScreenModel, oOEBoDataModel, oResourceBundle, UIComponent;
        return Controller.extend("com.sap.lh.cs.zlhoebreport.controller.selection", {
            onInit: function () {
                oController = this;
                oOEBoDataModel = oController.getOwnerComponent().getModel();
                oRouter = oController.getOwnerComponent().getRouter();
                UIComponent = oController.getOwnerComponent();
                var oModel = new JSONModel({});
                let oMinDate = new Date();
                let dateType = new DateType({ pattern: "yyyy-MM-dd" });
                var oSelectionModel = new JSONModel({
                    bPageBusy: false,
                    OrderNo: [],
                    OrderStatusSelected: [],
                    OperationStatusSelected: [],
                    minDate: new Date(),//dateType.formatValue(oMinDate, "string"),
                    sActualFinishDate: "",
                    aSelOpWorkCenter: [],
                    aSelOpActivity: [],
                    aSelOrders: [],
                    aSelOrderType: ["MS01"],
                    aSelMainWC: [],
                    OrderStatus: [
                        { Key: "HOLD", description: "Hold" },
                        { Key: "SRDE", description: "Site Readiness Date entered" },
                        { Key: "RCC", description: "Ready for Customer Confirm" },
                        { Key: "TRFD", description: "Trenching Ready for Dispatch" },
                        { Key: "ASSN", description: "Assigned" },
                        { Key: "DISP", description: "Dispatched" },
                        { Key: "SINR", description: "Site Not Ready" },
                        { Key: "RSRD", description: "Request Site Readiness Date" },
                        { Key: "CNDI", description: "Cancel Dispatch" },
                        { Key: "TCOM", description: "Trenching Complete" },
                        { Key: "IRFD", description: "Install Ready for Dispatch" },
                        { Key: "MCOM", description: "Meter Install Complete" },
                        { Key: "RVWP", description: "Review Pending" },
                        { Key: "RVWC", description: "Review Complete" },
                        { Key: "OEBE", description: "OEB Exception" }
                    ],
                    OperationStatus: [
                        { Key: "CNCL", description: "Cancel/Closed" },
                        { Key: "ESAR", description: "ESA Required" },
                        { Key: "ASGD", description: "Assigned" },
                        { Key: "SCHD", description: "Scheduled" },
                        { Key: "RDFD", description: "Ready for Dispatch" },
                        { Key: "DISP", description: "Dispatched" },
                        { Key: "CNDI", description: "Cancel Dispatch" },
                        { Key: "TRKA", description: "Truck Assigned" },
                        { Key: "ONST", description: "On Site" },
                        { Key: "WKCO", description: "Work Completed" },
                        { Key: "FINC", description: "Field Incomplete" },
                        { Key: "ERRD", description: "Error In Dispatch" }
                    ]
                    // OrderStatus: [{ Key: 'OUTS', description: 'Outstanding' },
                    // { Key: 'INPR', description: 'In Process' },
                    // { Key: 'COMP', description: 'Completed' },
                    // { Key: 'Hist', description: 'Historical' },
                    // { Key: 'OEBE', description: 'OEB Exception' }],
                    // OperationStatus: [
                    //     {
                    //         Key: 'HOLD',
                    //         description: 'hold'
                    //     }, {
                    //         Key: 'RCC',
                    //         description: 'ready for customer confirm'
                    //     }, {
                    //         Key: 'DISP',
                    //         description: 'DISPATCHED'
                    //     }, {
                    //         Key: 'RDFD',
                    //         description: 'Ready for dispatch'
                    //     }, {
                    //         Key: 'COMP',
                    //         description: 'Completed'
                    //     }]
                });
                oController.getOwnerComponent().setModel(oModel, "GlobalOEBModel");
                oController.getView().setModel(oSelectionModel, "oSelectionModel");
                var oInput = oController.getView().byId("idOrderType");
                oInput.setTokens([
                    new Token({ text: "MS01", key: "MS01" }),
                ]);
                oController._initPersonalizationService();
            },
            _initPersonalizationService: function () {
                debugger;
                var oView = this.getView();
                var oVariantManagement = oView.byId("idOEBVariantManagement");
                sap.ushell.Container.getServiceAsync("Personalization").then(function (oPersonalizationService) {
                    var oPersId = {
                        container: "OEBInputFieldVariants",
                        item: "OEBInputFields"
                    };
                    oPersonalizationService.getContainer(oPersId.container).then(function (oContainer) {
                        this._oContainer = oContainer;
                        var oVariantSet = oContainer.getItemValue(oPersId.item) || { variants: [], defaultVariant: "" };
                        this._loadVariants(oVariantSet);

                        oVariantManagement.setModel(new JSONModel(oVariantSet.variants), "variantItems");
                        oVariantManagement.setDefaultVariantKey(oVariantSet.defaultVariant);

                        this._applyVariant(oVariantSet.defaultVariant, oController._defaultVariantName);
                    }.bind(this)).catch(function (oError) {
                        MessageToast.show("Error Loading Personalization Container:" + oError.message);
                    });
                }.bind(this)).catch(function (oError) {
                    MessageToast.show("Error accessing personalization service: " + oError.message);
                });
            },
            _loadVariants: function (oVariantSet) {
                debugger;
                var oVM = oController.getView().byId("idOEBVariantManagement");
                var defaultVariant = oController._fngetDefaultVariant(oVM);
                oController._defaultVariantKey = defaultVariant;
                oVariantSet.variants.forEach(function (oVariant) {
                    oVM.addVariantItem({
                        key: oVariant.key,
                        text: oVariant.text,
                        readOnly: false,
                        executeOnSelection: true
                    });
                });
                //oController.getView().getModel("FieldMonSelModel").setProperty("/Variants", aVariants);
            },
            _fngetDefaultVariant: function (VM) {
                var objVariant = {}, objVariantItems = [], defaultVariant = '';
                objVariant = VM.oContext.getModel().getData();
                defaultVariant = objVariant["selection--idOEBVariantManagement"].defaultVariant;
                objVariantItems = objVariant["selection--idOEBVariantManagement"].variants;
                for (var i = 0; i < objVariantItems.length; i++) {
                    if (defaultVariant === objVariantItems[i].key) {
                        oController._defaultVariantName = objVariantItems[i].title;
                    }
                }
                return defaultVariant;
            },
            _applyVariant: function (sVariantKey, sName) {
                debugger;
                var oVariantModel = oController.getView().getModel("oSelectionModel");
                var oVariantSet = this._oContainer.getItemValue("variantSet") || { "variants": [] };
                var oDefaultVariant = oVariantSet.defaultVariant;

                var oVariant = oVariantSet.variants.find(function (v) {
                    if (sName === '' && sVariantKey !== '') {
                        return v.key === sVariantKey;
                    }
                    else if (sName === '' && sVariantKey === '') {
                        return v.key === oDefaultVariant;
                    }
                    // else if (sName !== '' && sVariantKey !== '') {
                    //     return v.text === sName && v.key === sVariantKey;
                    // }
                    else {
                        return v.text === sName;
                    }
                });

                if (oVariant) {
                    var objServiceOrder = [], objSelMainWC = [], objSelOpWorkCenter = [];
                    var oData = oVariant.data;
                    oVariantModel.setData(oData, true);
                    objServiceOrder = oVariantModel.getProperty("/aSelOrders");
                    objSelMainWC = oVariantModel.getProperty("/aSelMainWC");
                    objSelOpWorkCenter = oVariantModel.getProperty("/aSelOpWorkCenter");


                    if (objServiceOrder.length > 0) oController._fnBindVariantSelectionFields(objServiceOrder, 'idServiceOrder');
                    if (objSelMainWC.length > 0) oController._fnBindVariantSelectionFields(objSelMainWC, 'idMainWorkCenter');
                    if (objSelOpWorkCenter.length > 0) oController._fnBindVariantSelectionFields(objSelOpWorkCenter, 'idOpWorkCenter');
                }
            },
            _fnBindVariantSelectionFields: function (objSelection, objId) {
                for (var i = 0; i < objSelection.length; i++) {
                    var oMultiInput = oController.getView().byId(objId);
                    var aToken = new Token({
                        key: objSelection[i].key,
                        text: objSelection[i].text,
                    });

                    oMultiInput.addToken(aToken);
                    oMultiInput.setValue("");
                }
            },
            onSaveVariant: function (oEvent) {
                debugger;
                var oParameters = oEvent.getParameters();
                var sVariantKey = oParameters.key || Date.now().toString();
                var sVariantText = oParameters.name;
                var bOverwrite = oParameters.overwrite;
                var bDefault = oParameters.def;
                var oVariantData = oController.getView().getModel("oSelectionModel").getData();

                var oVariantSet = this._oContainer.getItemValue("variantSet") || { "variants": [], defaultVariant: "" }

                var oVariantManagement = oController.getView().byId("idOEBVariantManagement");
                if (bOverwrite) {
                    var oExistingVariant = oVariantSet.variants.find(function (v) {
                        return v.key === sVariantKey;
                    });
                    if (oExistingVariant) {
                        oExistingVariant.text = sVariantText;
                        oExistingVariant.data = oVariantData;
                    }
                } else {
                    oVariantSet.variants.push({
                        key: sVariantKey,
                        text: sVariantText,
                        data: oVariantData,
                        visible: true
                    });
                }
                if (bDefault) {
                    oVariantSet.defaultVariant = sVariantKey;
                    oVariantManagement.setDefaultVariantKey(sVariantKey);
                }
                this._oContainer.setItemValue("variantSet", oVariantSet);
                this._oContainer.save().then(function () {
                    MessageToast.show("Variant saved successfully!");
                }).catch(function (oError) {
                    MessageToast.show("Error saving variant:" + oError.message);
                });


            },
            onSelectVariant: function (oEvent) {
                debugger;
                var sVariantKey = oEvent.getParameter("key");
                var objVariant = {}, objVariantItems = [], oName = '';
                objVariant = oEvent.getSource().oContext.getModel().getData();
                objVariantItems = objVariant["selection--idOEBVariantManagement"].variants;

                for (var i = 0; i < objVariantItems.length; i++) {
                    if (sVariantKey === objVariantItems[i].key) {
                        oName = objVariantItems[i].title;
                    }
                }
                if (sVariantKey === 'selection--idOEBVariantManagement') {
                    window.location.reload();
                }
                else {
                    //var objVariant = [];
                    var oVariantModel = oController.getView().getModel("oSelectionModel");
                    oVariantModel.setData({});
                    oController._fnSetEmptySelectedFields('idServiceOrder');
                    oController._fnSetEmptySelectedFields('idMainWorkCenter');
                    oController._fnSetEmptySelectedFields('idOpWorkCenter');
                }

                this._applyVariant(sVariantKey, oName);
            },
            _fnSetEmptySelectedFields: function (objId) {
                debugger;
                var oMultiInput = oController.getView().byId(objId);
                oMultiInput.removeAllTokens();
                oMultiInput.setValue("");
            },
            onManageVariant: function (oEvent) {
                debugger;
                var objVariant = {}, objVariantItems = [], oName = '';
                objVariant = oEvent.getSource().oContext.getModel().getData();
                objVariantItems = objVariant["selection--idOEBVariantManagement"].variants;

                var oParameters = oEvent.getParameters();
                var aRenamed = oEvent.getParameter("renamed");
                var aDeleted = oEvent.getParameter("deleted");
                var oVariantSet = this._oContainer.getItemValue("variantSet") || { variants: [] };
                if (aDeleted !== undefined) {
                    oParameters.deleted.forEach(function (sKey) {
                        debugger;
                        for (var i = 0; i < objVariantItems.length; i++) {
                            if (sKey !== objVariantItems[i].key) {
                                oName = objVariantItems[i].title;
                                oVariantSet.variants = oVariantSet.variants.filter(function (v) {
                                    return v.text === oName;
                                });
                            }
                        }
                    });
                }
                if (aRenamed !== undefined) {
                    oParameters.renamed.forEach(function (oRenamed) {
                        for (var i = 0; i < objVariantItems.length; i++) {
                            if (oRenamed.key === objVariantItems[i].key) {
                                oName = objVariantItems[i].title;
                                var oVariant = oVariantSet.variants.find(function (v) {
                                    return v.text === oName;
                                });
                                if (oVariant) {
                                    oVariant.text = oRenamed.name;
                                }
                            }
                        }
                    });
                }

                if (oParameters.def) {
                    oVariantSet.defaultVariant = oParameters.def;
                    oController.getView().byId("idOEBVariantManagement").setDefaultVariantKey(oParameters.def);
                }
                this._oContainer.setItemValue("variantSet", oVariantSet);
                this._oContainer.save().then(function () {
                    MessageToast.show("Variants managed successfully!");
                }).catch(function (oError) {
                    MessageToast.show("Error managing variants:" + oError.message);
                });

            },

            onPressNext: function () {
                debugger;
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
            // onOrderNumberOkPress: function (oEvent) {
            //     var oMultiInput = oController.getView().byId("idServiceOrder");
            //     var aTokens = oEvent.getParameter("tokens");
            //     oMultiInput.setTokens(aTokens);
            //     this._oValueHelpDialog.close();
            // },
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
                debugger;
                var oView = oController.getView();
                var oModel = oController.getView().getModel("oSelectionModel");
                var OrderStatus = oModel.getProperty("/OrderStatusSelected"); // oController._getTockens();
                var aOrderNo = oController._getTockens(oView.byId("idServiceOrder"));
                var OrdType = oController._getTockens(oView.byId("idOrderType"));
                var aFunLoc = [];
                var aMainWorkCenter = oController._getTockens(oView.byId("idMainWorkCenter"));
                var aPeriod = [];
                var aOpeWorkCenter = oController._getTockens(oView.byId("idOpWorkCenter"));
                var aOpActivityType = [];
                var ActualFinishDate = oView.byId("idActualFinishDate").getValue() ? [oView.byId("idActualFinishDate").getValue()] : '';
                //oModel.getProperty("/sActualFinishDate") ? [oModel.getProperty("/sActualFinishDate")]: '';
                //oView.byId("idActualFinishDate").getValue() ? [oView.byId("idActualFinishDate").getValue()] : '';//oModel.getProperty("/sActualFinishDate"); //need to correct
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
                var afilterActualFinishDate = createOrFilter(ActualFinishDate, "ActFinish"); // change Filed name 
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
            // onMainWCSuggestionItemPress: function (oEvent) {
            //     var oSelectedItem = oEvent.getParameter("selectedRow");
            //     var oMultiInput = oController.getView().byId("idMainWorkCenter");
            //     oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            // },
            // onOperationWCSuggestionItemPress: function (oEvent) {
            //     var oSelectedItem = oEvent.getParameter("selectedRow");
            //     var oMultiInput = oController.getView().byId("idOpWorkCenter");
            //     oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            // },
            onOrderTypeSuggestionItemPress: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oMultiInput = oController.getView().byId("idOrderType");
                oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            },
            // onOrderSuggestionItemPress: function (oEvent) {
            //     var oSelectedItem = oEvent.getParameter("selectedRow");
            //     var oMultiInput = oController.getView().byId("idServiceOrder");
            //     oController.onSuggestionItemSelected(oSelectedItem, oMultiInput);
            // },
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
            },
            onOrderNumberOkPress: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idServiceOrder");
                var aTokens = oEvent.getParameter("tokens");
                oMultiInput.setTokens(aTokens);
                oModel.setProperty("/aSelOrders", []);
                var aSelectedKeys = oModel.getProperty("/aSelOrders");
                aTokens.forEach(function (oToken) {
                    var sKey = oToken.getKey();
                    var sText = oToken.getText();
                    if (!aSelectedKeys.includes(sKey)) {
                        aSelectedKeys.push({ "key": sKey, "text": sText });
                        //aSelectedKeys.push(sKey);
                    }
                });
                oModel.setProperty("/aSelOrders", aSelectedKeys);
                this._oValueHelpDialog.close();
            },
            onOrderSuggestionItemPress: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idServiceOrder");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oSelectedCells = oSelectedItem.getCells();
                var aToken = new Token({
                    key: oSelectedCells[1].getText(),
                    text: oSelectedCells[0].getText()
                });

                oMultiInput.addToken(aToken);
                oMultiInput.setValue("");

                var aTokens = oMultiInput.getTokens();
                oModel.setProperty("/aSelOrders", []);
                var aSelectedKeys = oModel.getProperty("/aSelOrders");
                aTokens.forEach(function (oToken) {
                    var sKey = oToken.getKey();
                    var sText = oToken.getText();
                    if (!aSelectedKeys.includes(sKey)) {
                        aSelectedKeys.push({ "key": sKey, "text": sText });
                        //aSelectedKeys.push(sKey);
                    }
                });
                oModel.setProperty("/aSelOrders", aSelectedKeys);
            },

            onMainWCSuggestionItemPress: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idMainWorkCenter");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oSelectedCells = oSelectedItem.getCells();
                var aToken = new Token({
                    key: oSelectedCells[1].getText(),
                    text: oSelectedCells[0].getText()
                });

                oMultiInput.addToken(aToken);
                oMultiInput.setValue("");

                var aTokens = oMultiInput.getTokens();
                oModel.setProperty("/aSelMainWC", []);
                var aSelectedKeys = oModel.getProperty("/aSelMainWC");
                aTokens.forEach(function (oToken) {
                    var sKey = oToken.getKey();
                    var sText = oToken.getText();
                    if (!aSelectedKeys.includes(sKey)) {
                        aSelectedKeys.push({ "key": sKey, "text": sText });
                        //aSelectedKeys.push(sKey);
                    }
                });
                oModel.setProperty("/aSelMainWC", aSelectedKeys);

            },

            onOperationWCSuggestionItemPress: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idOpWorkCenter");
                var oSelectedItem = oEvent.getParameter("selectedRow");
                var oSelectedCells = oSelectedItem.getCells();
                var aToken = new Token({
                    key: oSelectedCells[1].getText(),
                    text: oSelectedCells[0].getText()
                });

                oMultiInput.addToken(aToken);
                oMultiInput.setValue("");

                var aTokens = oMultiInput.getTokens();
                oModel.setProperty("/aSelOpWorkCenter", []);
                var aSelectedKeys = oModel.getProperty("/aSelOpWorkCenter");
                aTokens.forEach(function (oToken) {
                    var sKey = oToken.getKey();
                    var sText = oToken.getText();
                    if (!aSelectedKeys.includes(sKey)) {
                        aSelectedKeys.push({ "key": sKey, "text": sText });
                        //aSelectedKeys.push(sKey);
                    }
                });
                oModel.setProperty("/aSelOpWorkCenter", aSelectedKeys);
            },

            onOrderNoTokenUpdate: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idServiceOrder");
                var sAction = oEvent.getParameter("type");
                var oToken = oEvent.getParameters().removedTokens[0].getKey();
                var aTokens = oMultiInput.getTokens();

                var aTokenData = [], aSelectedData = [];
                if (sAction === "removed") {
                    aTokenData = aTokens.filter(function (token) {
                        return token.getKey() !== oToken;
                    });
                }
                for (var i = 0; i < aTokenData.length; i++) {
                    aSelectedData.push({ "key": aTokenData[i].getKey(), "text": aTokenData[i].getText() });
                }

                oModel.setProperty("/aSelOrders", aSelectedData);
            },
            onMainWCTokenUpdate: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idMainWorkCenter");
                var sAction = oEvent.getParameter("type");
                var oToken = oEvent.getParameters().removedTokens[0].getKey();
                var aTokens = oMultiInput.getTokens();

                var aTokenData = [], aSelectedData = [];
                if (sAction === "removed") {
                    aTokenData = aTokens.filter(function (token) {
                        return token.getKey() !== oToken;
                    });
                }
                for (var i = 0; i < aTokenData.length; i++) {
                    aSelectedData.push({ "key": aTokenData[i].getKey(), "text": aTokenData[i].getText() });
                }

                oModel.setProperty("/aSelMainWC", aSelectedData);
            },
            onOperationWCTokenUpdate: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oMultiInput = oController.getView().byId("idOpWorkCenter");
                var sAction = oEvent.getParameter("type");
                var oToken = oEvent.getParameters().removedTokens[0].getKey();
                var aTokens = oMultiInput.getTokens();

                var aTokenData = [], aSelectedData = [];
                if (sAction === "removed") {
                    aTokenData = aTokens.filter(function (token) {
                        return token.getKey() !== oToken;
                    });
                }
                for (var i = 0; i < aTokenData.length; i++) {
                    aSelectedData.push({ "key": aTokenData[i].getKey(), "text": aTokenData[i].getText() });
                }

                oModel.setProperty("/aSelOpWorkCenter", aSelectedData);
            },

            onDateChange: function (oEvent) {
                debugger;
                var oModel = oController.getView().getModel("oSelectionModel");
                var oDatePicker = oEvent.getSource();
                var sNewValue = oEvent.getParameter("newValue");
                oModel.setProperty("/sActualFinishDate", sNewValue);
            }
        });


    });
