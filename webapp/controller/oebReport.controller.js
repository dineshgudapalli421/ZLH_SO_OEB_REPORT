sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator',
    "sap/ui/model/json/JSONModel"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageToast, MessageBox, Filter, FilterOperator, JSONModel) {
        "use strict";
        var oController, UIComponent, oOEBoDataModel, oRouter, oResourceBundle;
        return Controller.extend("com.sap.lh.cs.zlhoebreport.controller.oebReport", {
            onInit: function () {
                oController = this;
                UIComponent = oController.getOwnerComponent();
                oOEBoDataModel = oController.getOwnerComponent().getModel();
                oRouter = UIComponent.getRouter();
                oResourceBundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
                oController._onRouteMatch();

            },
            _onRouteMatch: function () {
                var oGlobalModel = oController.getOwnerComponent().getModel("GlobalOEBModel");
                debugger;
                var oList = oGlobalModel.getProperty("/OEBReportList");
                var oModel = new JSONModel({
                    OEBReportList: [],
                    bPageBusy: false,
                    bDialogBusy: false,
                    oUpdateCustomerConfirm: {
                        sSiteReadiness: 'Y',
                    },
                    oMeterLoc: {
                        sSelectedLoc: "S",
                        sDesc: ""
                    },
                    SiteReadiness: {
                        sSiteReadinessDate: '',
                        SiteRedinessDateError: 'None'
                    },
                    oSelectedOEB: {}
                });
                oController.getView().setModel(oModel, "OEBReportModel");
                oController.getView().getModel("OEBReportModel").setProperty("/OEBReportList", oList);
            },
            onPressSiteReadiness: function () {
                var oModel = oController.getView().getModel("OEBReportModel")
                oModel.setProperty("/bPageBusy", true);
                oModel.setProperty("/SiteReadiness/sSiteReadinessDate", "");
                oModel.setProperty("/SiteReadiness/SiteRedinessDateError", 'None');
                oController._fnGetSelectedValue();
                if (!this.oSRDialog) {
                    this.oSRDialog = this.loadFragment({
                        name: "com.sap.lh.cs.zlhoebreport.fragment.siteReadinessDate"
                    });
                }
                this.oSRDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.open();
                    oModel.setProperty("/bPageBusy", false);
                }.bind(this));
            },
            onCloseSiteReadiness: function () {
                this.oSRDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.close();
                }.bind(this));
            },
            onSaveSiteReadiness: function () {
                var oModel = oController.getView().getModel("OEBReportModel")
                oModel.setProperty("/bDialogBusy", true);
                var oUrlParameters = oController._fnUrlParaSiteReadiness();
                var sPath = "/UpdateSiteReadinessDate";
                if (oUrlParameters.SITE_DATE.replace(/\'([^\']*)'/g, "$1")) {
                    oOEBoDataModel.read(sPath, {
                        urlParameters: oUrlParameters,
                        success: function (oData) {
                            oModel.setProperty("/bDialogBusy", false);
                            MessageBox.success("site readiness date updated for order");
                            oController.onCloseSiteReadiness();
                        }, error: function (oError) {
                            oModel.setProperty("/bDialogBusy", false);
                            var oMessage;
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
                } else {
                    oModel.setProperty("/bDialogBusy", false);
                    oModel.setProperty("/SiteReadiness/SiteRedinessDateError", 'Error');
                }
            },
            onChangeSiteRedinessDate: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/SiteReadiness/SiteRedinessDateError", 'None');
            },
            _fnUrlParaSiteReadiness: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oSelectedOEB = oModel.getProperty("/oSelectedOEB");
                var oSiteReadinessDate = oModel.getProperty("/SiteReadiness/sSiteReadinessDate");
                return {
                    "ORDER_NO": oController.fnConcatQuotes(oSelectedOEB.OrderNo),//oController.fnConcatQuotes('000001000020'), 
                    "Operation": oController.fnConcatQuotes(oSelectedOEB.Activity), //oController.fnConcatQuotes('0010'), 
                    "OPR_SHORT_TEXT": oController.fnConcatQuotes(oSelectedOEB.OprShortText), //oController.fnConcatQuotes('TRenching'),
                    "SITE_DATE": oController.fnConcatQuotes(oSiteReadinessDate) //oSelectedOEB.OrderNo
                }
            },

            onPressMeterLoc: function () {
                var oModel = oController.getView().getModel("OEBReportModel")

                oModel.setProperty("/bPageBusy", true);
                var oSelectedData = oController._fnGetSelectedValue();
                if (!this.oMLDialog) {
                    this.oMLDialog = this.loadFragment({
                        name: "com.sap.lh.cs.zlhoebreport.fragment.updMeterLoc"
                    });
                }
                this.oMLDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.open();
                    oModel.setProperty("/bPageBusy", false);
                }.bind(this));
            },
            onCloseUpdMeterLoc: function () {
                this.oMLDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.close();
                }.bind(this));
            },
            onSaveMeterLoc: function () {
                var oModel = oController.getView().getModel("OEBReportModel")
                oModel.setProperty("/bDialogBusy", true);
                var oUrlParameters = oController._fnUrlParaMeterLoc();
                var sPath = "/UpdateMeterLocation";
                oOEBoDataModel.read(sPath, {
                    urlParameters: oUrlParameters,
                    success: function (oData) {
                        oModel.setProperty("/bDialogBusy", false);
                        MessageBox.success("Meter Location updated");
                        oController.onCloseUpdMeterLoc();
                    }, error: function (oError) {
                        oModel.setProperty("/bDialogBusy", false);
                        var oMessage;
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
            _fnUrlParaMeterLoc: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oSelectedOEB = oModel.getProperty("/oSelectedOEB");
                var oMeterDetails = oModel.getProperty("/oMeterLoc");
                return {
                    "Order_ID": oController.fnConcatQuotes(oSelectedOEB.OrderNo),//oController.fnConcatQuotes('000001000020'),
                    "METER_LOCATION": oController.fnConcatQuotes(oMeterDetails.sSelectedLoc), //oSelectedOEB
                    "Operation": oController.fnConcatQuotes(oSelectedOEB.Activity),//oController.fnConcatQuotes('0010'),
                    "OPR_SHORT_TEXT": oController.fnConcatQuotes(oSelectedOEB.OprShortText),//oController.fnConcatQuotes('TRenching'),
                    "Loc_Desc": oController.fnConcatQuotes(oMeterDetails.sDesc)
                }
            },
            _fnGetSelectedValue: function () {
                var oModel = oController.getView().getModel("OEBReportModel")
                var aOEBReportList = oModel.getProperty("/OEBReportList")
                var oTable = oController.getView().byId("idOEBTable");
                var iSelectedIndex = oTable.getSelectedIndex();
                oModel.setProperty("/oSelectedOEB", aOEBReportList[iSelectedIndex]);
                // return aOEBReportList[iSelectedIndex];
            },

            onPressReqCustConfirm: function () {
                var oModel = oController.getView().getModel("OEBReportModel")
                oModel.setProperty("/bPageBusy", true);
                oController._fnGetSelectedValue();
                var sPath = "/RequestCustomerConfirmation";
                var sMessage = "Order is Dispatched"
                oController._fnDispatchOrReqCustConfirm(sPath,sMessage);
            },
            _fnFilterParaCustConfirm: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oSelectedOEB = oModel.getProperty("/oSelectedOEB")
                var oUpdCustConfirm = oModel.getProperty("/oUpdateCustomerConfirm");
                return {
                    "Order_ID": oController.fnConcatQuotes(oSelectedOEB.OrderNo),
                    "Site_Ready": oController.fnConcatQuotes(oUpdCustConfirm.sSiteReadiness),
                    "Operation": oController.fnConcatQuotes(oSelectedOEB.Activity),
                    "OPR_SHORT_TEXT": oController.fnConcatQuotes(oSelectedOEB.OprShortText)
                }
            },
            onSaveUpdateCustomerConfirm: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/bDialogBusy", true);
                var sPath = "/UpdateCustomerConfirmation";
                var oUrlParameters = oController._fnUrlParaUpdateCustConfirm();
                oOEBoDataModel.read(sPath, {
                    urlParameters: oUrlParameters,
                    success: function (oData) {
                        oModel.setProperty("/bDialogBusy", false);
                        MessageBox.success("Customer confirmation updated");
                        oController.onCloseUpdateCustConfirm();
                    }, error: function (oError) {
                        oModel.setProperty("/bDialogBusy", false);
                        var oMessage;
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
            _fnUrlParaUpdateCustConfirm: function () {
                var oSelectedData = oController._fnGetSelectedValue();
                var oModel = oController.getView().getModel("OEBReportModel");
                // OEBReportModel>/oUpdateCustomerConfirm/sSiteReadiness
                // var ;
                debugger;
                return {
                    "Order_ID": oController.fnConcatQuotes(oModel.getProperty("/oSelectedOEB/OrderNo")),
                    "Site_Ready": oController.fnConcatQuotes(oModel.getProperty("/oUpdateCustomerConfirm/sSiteReadiness")),
                    "Operation": oController.fnConcatQuotes(oModel.getProperty("/oSelectedOEB/Activity")),
                    "OPR_SHORT_TEXT": oController.fnConcatQuotes(oModel.getProperty("/oSelectedOEB/OprShortText"))
                }
            },
            onPressUpdateCustConfirm: function () {
                var oModel = oController.getView().getModel("OEBReportModel")
                oModel.setProperty("/bPageBusy", true);
                oController._fnGetSelectedValue();
                if (!this.oCCDialog) {
                    this.oCCDialog = this.loadFragment({
                        name: "com.sap.lh.cs.zlhoebreport.fragment.updCustConfirm"
                    });
                }
                this.oCCDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.open();
                    oModel.setProperty("/bPageBusy", false);
                }.bind(this));
            },
            onCloseUpdateCustConfirm: function () {
                this.oCCDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.close();
                }.bind(this));
            },

            fnConcatQuotes: function (sValue) {
                return "'" + sValue + "'"
            },
            onPressDispatchOperation: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/bPageBusy", true);
                oController._fnGetSelectedValue();
                var sPath = "/DispatchOperation";
                var sMessage = "Order is Dispatched"
                oController._fnDispatchOrReqCustConfirm(sPath, sMessage);
            },
            _fnDispatchOrReqCustConfirm: function (sPath, sMessage) {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oUrlParameters = oController._fnUrlParaDispatchOperation();
                oOEBoDataModel.read(sPath, {
                    urlParameters: oUrlParameters,
                    success: function (oData) {
                        oModel.setProperty("/bPageBusy", false);
                        MessageBox.success(sMessage);
                    }, error: function (oError) {
                        oModel.setProperty("/bPageBusy", false);
                        var oMessage;
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
            _fnUrlParaDispatchOperation: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oSelectedOEB = oModel.getProperty("/oSelectedOEB")
                return {
                    "Order_ID": oController.fnConcatQuotes(oSelectedOEB.OrderNo),
                    "Operation": oController.fnConcatQuotes(oSelectedOEB.Activity)
                }
            }
        });
    });
