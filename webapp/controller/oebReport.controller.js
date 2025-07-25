/**
 * @fileOverview This file contains the controller for the OEB Report page.
 */

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator',
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    'sap/ui/core/Fragment',
    'sap/ui/model/Sorter'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller - The SAP UI5 Controller module
     * @param {typeof sap.m.MessageToast} MessageToast - The SAP UI5 MessageToast module
     * @param {typeof sap.m.MessageBox} MessageBox - The SAP UI5 MessageBox module
     * @param {typeof sap.ui.model.Filter} Filter - The SAP UI5 Filter module
     * @param {typeof sap.ui.model.FilterOperator} FilterOperator - The SAP UI5 FilterOperator module
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel - The SAP UI5 JSONModel module
     * @param {typeof sap.ui.core.routing.History} History - The SAP UI5 History module
     */
    function (Controller, MessageToast, MessageBox, Filter, FilterOperator, JSONModel, History, Fragment, Sorter) {
        "use strict";
        var oController, UIComponent, oOEBoDataModel, oRouter, oResourceBundle, aSelParameters;

        return Controller.extend("com.sap.lh.cs.zlhoebreport.controller.oebReport", {
            /**
             * Called when the controller is instantiated.
             * @public
             */
            onInit: function () {
                oController = this;
                UIComponent = oController.getOwnerComponent();
                oOEBoDataModel = oController.getOwnerComponent().getModel();
                oRouter = UIComponent.getRouter();
                oResourceBundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
                oRouter.getRoute("OEBReport").attachPatternMatched(oController._onRouteMatch, oController);
                oController._mViewSettingsDialogs = {};
            },

            /**
             * Handles the route match event.
             * @private
             */
            _onRouteMatch: function () {
                var bDirectionFromExtApp = Boolean(History.getInstance().getDirection() === "Backwards");
                if (!bDirectionFromExtApp) {
                    var oGlobalModel = oController.getOwnerComponent().getModel("GlobalOEBModel");
                    var oList = oGlobalModel ? oGlobalModel.getProperty("/OEBReportList") : [];
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
                            sSiteReadinessDate: new Date(),
                            SiteRedinessDateError: 'None'
                        },
                        oSelectedOEB: {}
                    });
                    oController.getView().setModel(oModel, "OEBReportModel");
                    oController.getView().getModel("OEBReportModel").setProperty("/OEBReportList", oList);
                }
            },

            /**
             * Handles the press event of the Site Readiness button.
             * @public
             */
            onPressSiteReadiness: function () {
                var oTable = oController.getView().byId("idOEBTable");
                var iSelectedIndex = oTable.getSelectedIndex();
                if (iSelectedIndex === -1) {
                    MessageToast.show('Please Select Line Item');
                    return;
                }
                var oModel = oController.getView().getModel("OEBReportModel");
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

            /**
             * Handles the close event of the Site Readiness dialog.
             * @public
             */
            onCloseSiteReadiness: function () {
                this.oSRDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.close();
                }.bind(this));
            },

            /**
             * Handles the save event of the Site Readiness dialog.
             * @public
             */
            onSaveSiteReadiness: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/bDialogBusy", true);
                var oUrlParameters = oController._fnUrlParaSiteReadiness();
                var sPath = "/UpdateSiteReadinessDate";
                if (oUrlParameters.SITE_DATE.replace(/\'([^\']*)'/g, "$1")) {
                    oOEBoDataModel.read(sPath, {
                        urlParameters: oUrlParameters,
                        success: function (oData) {
                            oModel.setProperty("/bDialogBusy", false);
                            MessageBox.success("Site Readiness date has been updated");
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
                                oMessage = sParsedResponse.error.message.value;
                            }
                            MessageBox.error(oMessage);
                        }
                    });
                } else {
                    oModel.setProperty("/bDialogBusy", false);
                    oModel.setProperty("/SiteReadiness/SiteRedinessDateError", 'Error');
                }
            },

            /**
             * Handles the change event of the Site Readiness date.
             * @public
             */
            onChangeSiteRedinessDate: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/SiteReadiness/SiteRedinessDateError", 'None');
            },

            /**
             * Constructs the URL parameters for the Site Readiness.
             * @private
             * @returns {object} The URL parameters for the Site Readiness.
             */
            _fnUrlParaSiteReadiness: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oSelectedOEB = oModel.getProperty("/oSelectedOEB");
                var oSiteReadinessDate = oModel.getProperty("/SiteReadiness/sSiteReadinessDate");
                return {
                    "ORDER_NO": oController.fnConcatQuotes(oSelectedOEB.OrderNo),
                    "Operation": oController.fnConcatQuotes(oSelectedOEB.Activity),
                    "OPR_SHORT_TEXT": oController.fnConcatQuotes(oSelectedOEB.OprShortText),
                    "SITE_DATE": oController.fnConcatQuotes(oSiteReadinessDate)
                };
            },

            /**
             * Handles the press event of the Meter Location button.
             * @public
             */
            onPressMeterLoc: function () {
                var oTable = oController.getView().byId("idOEBTable");
                var iSelectedIndex = oTable.getSelectedIndex();
                if (iSelectedIndex === -1) {
                    MessageToast.show('Please Select Line Item');
                    return;
                }
                var oModel = oController.getView().getModel("OEBReportModel");
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

            /**
             * Handles the close event of the Meter Location dialog.
             * @public
             */
            onCloseUpdMeterLoc: function () {
                this.oMLDialog.then(function (oDialog) {
                    this.oDialog = oDialog;
                    this.oDialog.close();
                }.bind(this));
            },

            /**
             * Handles the save event of the Meter Location dialog.
             * @public
             */
            onSaveMeterLoc: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/bDialogBusy", true);
                var oUrlParameters = oController._fnUrlParaMeterLoc();
                var sPath = "/UpdateMeterLocation";
                oOEBoDataModel.read(sPath, {
                    urlParameters: oUrlParameters,
                    success: function (oData) {
                        oModel.setProperty("/bDialogBusy", false);
                        MessageBox.success("Meter Location has been updated");
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
                            oMessage = sParsedResponse.error.message.value;
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
            },

            onPressReqCustConfirm: function () {
                var oTable = oController.getView().byId("idOEBTable");
                var iSelectedIndex = oTable.getSelectedIndex();
                if (iSelectedIndex === -1) {
                    MessageToast.show('Please Select Line Item');
                    return;
                }
                var oModel = oController.getView().getModel("OEBReportModel")
                oModel.setProperty("/bPageBusy", true);
                oController._fnGetSelectedValue();
                var sPath = "/RequestCustomerConfirmation";
                var sMessage = "Updated"
                oController._fnDispatchOrReqCustConfirm(sPath, sMessage);
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
                        MessageBox.success("Confirmation has been requested");
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
                return {
                    "Order_ID": oController.fnConcatQuotes(oModel.getProperty("/oSelectedOEB/OrderNo")),
                    "Site_Ready": oController.fnConcatQuotes(oModel.getProperty("/oUpdateCustomerConfirm/sSiteReadiness")),
                    "Operation": oController.fnConcatQuotes(oModel.getProperty("/oSelectedOEB/Activity")),
                    "OPR_SHORT_TEXT": oController.fnConcatQuotes(oModel.getProperty("/oSelectedOEB/OprShortText"))
                }
            },
            onPressUpdateCustConfirm: function () {
                var oTable = oController.getView().byId("idOEBTable");
                var iSelectedIndex = oTable.getSelectedIndex();
                if (iSelectedIndex === -1) {
                    MessageToast.show('Please Select Line Item');
                    return;
                }
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
            onPressRefreshOEBList: function () {
                var oModel = oController.getView().getModel("OEBReportModel");
                var oGlobalModel = UIComponent.getModel("GlobalOEBModel");
                var aFilter = oGlobalModel.getProperty("/SelParameters");
                var sPath = "/OEB_OPSSet";
                oModel.setProperty("/bPageBusy", true);
                oOEBoDataModel = oController.getOwnerComponent().getModel();
                oOEBoDataModel.read(sPath, {
                    filters: aFilter,
                    success: function (oData) {
                        oModel.setProperty("/OEBReportList", oData.results);
                        oModel.setProperty("/bPageBusy", false);
                    },
                    error: function (oError) {
                        var oMessage;
                        oModel.setProperty("/bPageBusy", false);
                        if (oError.responseText.startsWith("<")) {
                            var parser = new DOMParser();
                            var xmlDoc = parser.parseFromString(oError.responseText, "text/xml");
                            oMessage = xmlDoc.getElementsByTagName("message")[0].childNodes[0].nodeValue;
                        } else {
                            var oResponseText = oError.responseText;
                            var sParsedResponse = JSON.parse(oResponseText);
                            oMessage = sParsedResponse.error.message.value;
                        }
                        MessageBox.error(oMessage);
                    }
                });
            },
            onPressDispatchOperation: function () {
                var oTable = oController.getView().byId("idOEBTable");
                var iSelectedIndex = oTable.getSelectedIndex();
                if (iSelectedIndex === -1) {
                    MessageToast.show('Please Select Line Item');
                    return;
                }
                var oModel = oController.getView().getModel("OEBReportModel");
                oModel.setProperty("/bPageBusy", true);
                oController._fnGetSelectedValue();
                var sPath = "/DispatchOperation";
                var sMessage = "Operation Dispatched"
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
            },
            onPressOrderNo: function (oEvent) {
                let oSource = oEvent.getSource();
                let oOrderNo = oSource.getText();
                if (oOrderNo) {
                    var navigationService = sap.ushell.Container.getService("CrossApplicationNavigation");
                    var hash = (navigationService && navigationService.hrefForExternal({
                        target: { semanticObject: "MaintenanceOrder", action: "change" },
                        params: {
                            "AUFNR": oOrderNo,
                            "sap-app-origin-hint": '',
                            "sap-ui-tech-hint": "GUI",
                            "sap-ushell-navmode": "inplace"
                        }
                    })) || "";

                    var url = window.location.href.split('#')[0] + hash;
                    sap.m.URLHelper.redirect(url, true);
                }

                // var oCrossAppNav = sap.ushell.Container.getService("Navigation");
                // var oSource = oEvent.getSource();
                // var oTarget = {
                //     target: { semanticObject: "MaintenanceOrder", action: "change" },
                //     params: {
                //         "AUFNR": oSource.getText(),
                //         "sap-app-origin-hint": '',
                //         "sap-ui-tech-hint": "GUI",
                //         "sap-ushell-navmode": "inplace"
                //     }
                // }
                // oCrossAppNav.navigate(oTarget, oController.getOwnerComponent());
            },

            onPressNotification: function (oEvent) {
                let oSource = oEvent.getSource();
                const oNotification = oSource.getText();
                if (oNotification) {
                    var navigationService = sap.ushell.Container.getService("CrossApplicationNavigation");
                    var hash = (navigationService && navigationService.hrefForExternal({
                        target: { semanticObject: "MaintenanceNotification", action: "change" },
                        params: {
                            "QMNUM": oNotification,
                            "sap-app-origin-hint": '',
                            "sap-ui-tech-hint": "GUI",
                            "sap-ushell-navmode": "inplace"
                        }
                    })) || "";

                    var url = window.location.href.split('#')[0] + hash;
                    sap.m.URLHelper.redirect(url, true);
                }
                // var oCrossAppNav = sap.ushell.Container.getService("Navigation");
                // var oSource = oEvent.getSource();
                // var oTarget = {
                //     target: { semanticObject: "MaintenanceNotification", action: "change" },
                //     params: {
                //         "QMNUM": oSource.getText(),
                //         "sap-app-origin-hint": '',
                //         "sap-ui-tech-hint": "GUI",
                //         "sap-ushell-navmode": "inplace"
                //     }
                // }
                // oCrossAppNav.navigate(oTarget, oController.getOwnerComponent());
            },
            getViewSettingsDialog: function (sDialogFragmentName) {
                var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

                if (!pDialog) {
                    pDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: sDialogFragmentName,
                        controller: this
                    }).then(function (oDialog) {
                        // if (Device.system.desktop) {
                        //   oDialog.addStyleClass("sapUiSizeCompact");
                        // }
                        return oDialog;
                    });
                    oController._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
                }
                return pDialog;
            },
            handleSortDialogConfirm: function (oEvent) {
                var oTable = oController.getView().byId("idOEBTable"),
                    mParams = oEvent.getParameters(),
                    oBinding = oTable.getBinding("rows"),
                    sPath,
                    bDescending,
                    aSorters = [];

                sPath = mParams.sortItem.getKey();
                bDescending = mParams.sortDescending;
                aSorters.push(new Sorter(sPath, bDescending));
                oBinding.sort(aSorters);
            },
            handleSortButtonPressed: function () {
                this.getViewSettingsDialog("com.sap.lh.cs.zlhoebreport.fragment.SortDialog")
                    .then(function (oViewSettingsDialog) {
                        oViewSettingsDialog.open();
                    });
            }
        });
    });
