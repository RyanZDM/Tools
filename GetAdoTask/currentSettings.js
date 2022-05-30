"use strict";

define(["app"], function(app) {
	// #Configurable here#
	app.service("currentSettings", function() {
		var LocalStorageKeyForCurrentSettings = "CSProjectSettings";

		// Change here if new developers added in ADO
		var ownerEmailMapping = {
			// Taiji
			"Ryan Zhang": "dameng.zhang@carestream.com",
			"Song Zhao": "song.zhao@carestream.com",
			"Wei Pi": "wei.pi@carestream.com",
			"Liang MA": "liang.ma@carestream.com",
			"Yusheng Liao": "yusheng.liao@carestream.com",
			"Xijiao Chen": "xijiao.chen@carestream.com",
			"Shuhua YANG": "shuhua.yang@carestream.com",
			// Dunhuang
			"Xianjun Z": "xianjun.zhan@carestream.com",
			"Sen Gao": "sen.gao@carestream.com",
			"Chunxu Shi": "chunxun.shi@carestream.com",
			// Wudang
			"Lei LIU": "lei.liu@carestream.com",
			"Jun Sun": "jun.sun@carestream.com",
			"Vivi Wang": "vivi.wang@carestream.com",
			"Nianshuang Li": "nianshuang.li@carestream.com",
			"Fuqin Zhang": "fuqin.zhang@carestream.com",
			"Yang LIHUI": "lihui.yang@carestream.com",
			// Team PengLai
			"Sail Feng": "liming.feng@carestream.com",
			"Donny Liu": "donny.liu@carestream.com",
			"Scott Wu": "scott.wu@carestream.com",
			// CPE
			"Kaliven Lee": "kaliven.li@carestream.com",
			"Deqing YANG": "deqing.yang@carestream.com",
			// Others
			"Jiandong GU": "jiandong.gu@carestream.com",
			"Qi Wang": "qi.wang@carestream.com",
			"Zhe S": "zhe.sun@carestream.com",
			"Jiaxin Yao": "yao.jiaxin@carestream.com",
			"Forrest Feng": "changzheng.feng@carestream.com",
			"Yijiong S": "yijiong.shi@carestream.com",
			"Terry Zhou": "jun.zhou@carestream.com",
			"Cheng Luo": "cheng.luo@carestream.com",
			"Iris J": "lili.jiang@carestream.com",
			// QA
			"Ben Tang": "xiaowei.tang@carestream.com",
			"Xueqing Wang": "xueqing.wang@carestream.com",
			"Annie H": "yanhong.he@carestream.com",
			"Sherry Hu": "yan.hu@carestream.com",
			"Yanjun Li": "yanjun.li@carestream.com",
			"Rita X": "bing.xiong@carestream.com",
			"Lina Cao": "lina.cao@carestream.com",
			"Yujie Shi": "yujie.shi@carestream.com",
			"Ivy Jiang": "ivy.jiang@carestream.com",
			"Wenbin Zhong": "wenbin.zhong@carestream.com",
			"AA Jasmine Tang": "jasmine.tang@carestream.com",
			"Linda Lun": "linda.lun@carestream.com",
			"James Fu": "james.fu@carestream.com"
		};

		var team = "Taiji";		// default project team
		var teamShortName = "Taiji";	// default project team

		function loadSettingsFromLocalStorage() {
			if ((typeof (Storage) === "undefined")) { return {}; }

			var savedSettings = localStorage.getItem(LocalStorageKeyForCurrentSettings);
			if (!savedSettings || savedSettings.trim() === "") { return {}; }

			savedSettings = JSON.parse(savedSettings);

			if (savedSettings["Team"] !== undefined) { team = savedSettings.Team; }
			if (savedSettings["TeamShortName"] !== undefined) { teamShortName = savedSettings.TeamShortName; }

			return savedSettings;
		};

		loadSettingsFromLocalStorage();
		
		return {
			OwnerEmailMapping: ownerEmailMapping,
			Release: "Jing-A",
			SecondRelease: "CPE",
			Team: team,
			TeamShortName: teamShortName,

			saveSettingsToLocalStorage: function (data) {
				if ((typeof (Storage) === "undefined")) { return false; }

				localStorage.setItem(LocalStorageKeyForCurrentSettings, JSON.stringify(data));
				team = data.Team;
				teamShortName = data.TeamShortName;

				return true;
			}
		};
	});
});
