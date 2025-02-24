/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comsaplhcs/zlh_oeb_report/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
