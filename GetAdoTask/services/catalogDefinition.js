"use strict"

define(["app"], function (app) {
	app.service("catalogDefinition", function () {
		var definition = {
			autotracking: "Autotracking"
			, backuprestore: "Backup-Restore"
			, bsodcrash: "BSOD-Crash"
			, detector: "Detector"
			, exposuresequence: "Exposure Sequence"
			, generator: "Generator"
			, hisris: "HIS-RIS"
			, hwfw: "HW-FW"
			, imagedelivery: "Image Delivery"
			, imagepresentation: "Image Presentation"
			, imageprocessing: "Image Processing"
			, launchshutdown: "Launch-Shutdown"
			, layout: "Layout"
			, lli: "LLI"
			, option: "Option"
			, os: "OS"
			, otc: "OTC"
			, otherconfiguration: "Other Configuration"
			, performance: "Performance"
			, rms: "RMS"
			, smartgrid: "Smart Grid"
			, statistic: "Statistic"
			, storageservice: "Storage Service"
			, studysetup: "Study Setup"
			, thirdparty: "ThirdParty"
			, timing: "Timing"
			, worklist: "Worklist"
		};

		return definition;
	});
});