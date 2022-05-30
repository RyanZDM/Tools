"use strict"

define(["app"], function (app) {
	app.service("modalityDefinition", function () {
		var definition = {
			acsend: "Acsend"
			, cbct: "CBCT"
			, compass: "Compass"
			, cr: "CR"
			, evo: "Evo"
			, innovation: "Innovation"
			, inroom: "Inroom"
			, mobile: "Mobile"
			, nano: "Nano"
			, odyssey: "Odyssey"
			, odysseyii: "Odyssey"
			, qrad: "QRAD"
			, qvision: "QVision"
			, revo: "Revo"
			, transportable: "Transportable"
			, unspecified: "<unspecified>"
		};

		return definition;
	});
});