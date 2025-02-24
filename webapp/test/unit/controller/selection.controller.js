/*global QUnit*/

sap.ui.define([
	"comsaplhcs/zlh_oeb_report/controller/selection.controller"
], function (Controller) {
	"use strict";

	QUnit.module("selection Controller");

	QUnit.test("I should test the selection controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
