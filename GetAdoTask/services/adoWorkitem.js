/**
 *construct a ADO work item object from JSON object
 * 
 *param jsonObj		The json object contains one ADO bugs and/or user stories
 *param tools		The tools including restApi, moment
 *
 *return			The ADO work item collection
 */
function adoWorkItem(jsonObj, tools) {
	this.Id = ("id" in jsonObj) ? jsonObj["id"] : "";
	this.Link = tools.restApi.WitLink + this.Id;

	if (!jsonObj["fields"]) return;

	copyFields(this, jsonObj["fields"]);

	if (this.AssignedTo) {
		this.Owner = this.AssignedTo.displayName;
	} else {
		this.Owner = "Unassigned";
	}

	// System.IterationPath	string
	// Iteration			number
	if (this["IterationPath"]) {
		var sprint = this["IterationPath"].split(" ").pop();
		this.Iteration = parseInt(sprint, 10);
	} else {
		this.Iteration = -1;
	}

	//#region Conver UTC date to local date
	if (this["CreatedDate"]) {
		var startDate = tools.moment.utc(this["CreatedDate"], "YYYY-MM-DDTHH:mm:ss.SSS");
		if (startDate.isValid()) {
			startDate.local();
			this["CreatedDate"] = startDate.format("YYYY-MM-DD");
		}
	}

	if (this["ResolvedDate"]) {
		var resolvedDate = tools.moment.utc(this["ResolvedDate"], "YYYY-MM-DDTHH:mm:ss.SSS");
		if (resolvedDate.isValid()) {
			resolvedDate.local();
			this["ResolvedDate"] = resolvedDate.format("YYYY-MM-DD");
		}
	}

	if (this["ClosedDate"]) {
		var closedtDate = tools.moment.utc(this["ClosedDate"], "YYYY-MM-DDTHH:mm:ss.SSS");
		if (closedtDate.isValid()) {
			closedtDate.local();
			this["ClosedDate"] = closedtDate.format("YYYY-MM-DD");
		}
	}

	switch (this.State) {
		case "Resolved":
			this.CompletedDate = this.ResolvedDate;
			break;
		case "Closed":
			this.CompletedDate = this.ClosedDate;
			break;
		default:
	}
	//#endregion

	// Testable flag
	this.Testable = true;
	if (this["AcceptanceCriteria"]) {
		this["AcceptanceCriteria"] = this["AcceptanceCriteria"].trim()
											.replace(/&nbsp;/g, " ");
		if (/not?\W?test|non-test|Not?\W?need|not?\W?necessary|unnecessary|^na$/i.test(this["AcceptanceCriteria"])) {
			this.Testable = false;
		}
	};

	switch (this.State) {
		case "Rejected":
			this.Rejected = true;
			break;
		case "Duplicate":
			this.Duplicate = true;
			break;
		default:
	}

	if (!this["Blocked"] || this["Blocked"] !== "Yes") {
		this["Blocked"] = "No";
	}

	// Priority
	// Applicable for a bug only
	if (this["CSH_Priority"]) {
		switch (this["CSH_Priority"]) {
		case "Resolve Immediately":
			this.Priority = "1 - " + this["CSH_Priority"];
			break;
		case "High":
			this.Priority = "2 - " + this["CSH_Priority"];
			break;
		case "Medium":
			this.Priority = "3 - " + this["CSH_Priority"];
			break;
		case "Low":
			this.Priority = "4 - " + this["CSH_Priority"];
			break;
		default:
			this.Priority = "";
		}
	// Applicable for a user story only
	} else if (this["Priority"]) {
		switch (this["Priority"]) {
		case 1:
			this.Priority = "1 - Resolve Immediately";
			break;
		case 2:
			this.Priority = "2 - High";
			break;
		case 3:
			this.Priority = "3 - Medium";
			break;
		case 4:
			this.Priority = "4 - Low";
			break;
		default:
			this.Priority = "";
		}
	} else {
		this.Priority = "";
	}

	// Parent
	if (this.Parent) {
		this.ParentLink = tools.restApi.WitLink + this.Parent;
	}

	//#region Child data
	this._children = [];
	this.ChildrenSummary = {
		Count: 0,
		Estimate: 0,
		Completed: 0,
		OtherEstimate: 0,
		OtherCompleted: 0
	};

	if (jsonObj["relations"] && jsonObj["relations"].length > 0) {
		var relations = jsonObj["relations"];
		_.forEach(relations, function (rel) {
			if (rel.attributes.name.toLowerCase() === "child") {
				this._children.push({ Id: rel.url.split("/").pop() });
			}
		}, this);
	}

	function updateChildrenSummary() {
		if (this._children && this._children.length > 0) {
			var count = 0;
			var estimate = 0;
			var completed = 0;
			var otherEstimate = 0;
			var otherCompleted = 0;
			this._children.forEach(child => {
				count++;
				var val = child["Estimate"] ? child["Estimate"] : "";
				if ((val !== "") && !isNaN(val)) {
					if (child["Owner"] && child["Owner"] === this.Owner) {
						estimate += child["Estimate"];
					} else {
						otherEstimate += child["Estimate"];
					}

				}

				val = child["Completed"] ? child["Completed"] : "";
				if ((val !== "") && !isNaN(val)) {
					if (child["Owner"] && child["Owner"] === this.Owner) {
						completed += child["Completed"];
					} else {
						otherCompleted += child["Completed"];
					}
				}
			})

			this.ChildrenSummary = {
				Count: count,
				Estimate: estimate,
				Completed: completed,
				OtherEstimate: otherEstimate,
				OtherCompleted: otherCompleted
			}
		} else {
			this.ChildrenSummary = {
				Count: 0,
				Estimate: 0,
				Completed: 0,
				OtherEstimate: 0,
				OtherCompleted: 0
			}
		}
	}

	// Monitor on the children record change and calculate the children summary data
	tools.utility.monitorOnArrayChnage(this._children, updateChildrenSummary);
	// Monitor on the whole children array change and calculate the children summary data
	Object.defineProperty(this, "Children", {
		//writable: true,
		get() { return this._children; },
		set(newValue) {
			this._children = newValue;
			if (this._children && this._children.length > 0) {
				var count = 0;
				var estimate = 0;
				var completed = 0;
				var otherEstimate = 0;
				var otherCompleted = 0;
				this._children.forEach(child => {
					count++;
					var val = child["Estimate"] ? child["Estimate"] : "";
					if ((val !== "") && !isNaN(val)) {
						if (child["Owner"] && child["Owner"] === this.Owner) {
							estimate += child["Estimate"];
						} else {
							otherEstimate += child["Estimate"];
						}
						
					}

					val = child["Completed"] ? child["Completed"] : "";
					if ((val !== "") && !isNaN(val)) {
						if (child["Owner"] && child["Owner"] === this.Owner) {
							completed += child["Completed"];
						} else {
							otherCompleted += child["Completed"];
						}
					}
				})

				this.ChildrenSummary = {
					Count: count,
					Estimate: estimate,
					Completed: completed,
					OtherEstimate: otherEstimate,
					OtherCompleted: otherCompleted
				}
			} else {
				this.ChildrenSummary = {
					Count: 0,
					Estimate: 0,
					Completed: 0,
					OtherEstimate: 0,
					OtherCompleted: 0
				}
			}
		}
	})

	Object.defineProperty(this, "CompletedHours", {
		get() { return this.ChildrenSummary.Completed; }
	})

	Object.defineProperty(this, "EstimateHours", {
		get() { return this.ChildrenSummary.Estimate; }
	})
	//#endregion

	this.clone = function (exclude) {
		var excludes = [];
		if (Array.isArray(exclude)) {
			excludes = exclude;
		} else if (typeof exclude === "string") {
			excludes.push(exclude);
		}

		var newTask = {};
		for (var propertyName in this) {
			if (!excludes.includes(propertyName)) {
				newTask[propertyName] = this[propertyName];
			}
		}

		return newTask;
	};

	function getCpeInfo(wit) {
		//submit time="2022-01-13 16:03";first reply time="2022-01-20 15:20";complete time="";catalog="Techniques";close reason="";modality="EVO";
		if (wit.CPEInfo) {
			_.extend(wit.CPEInfo, { catalog: "<unspecified>", modality: "<unspecified>" });
		} else {
			wit.CPEInfo = { catalog: "<unspecified>", modality: "<unspecified>" };
		}

		// Gets escalation ID
		if (wit.Title) {
			var match = wit.Title.match(/(?<=\[).*?(?=\])/);
			if (match && match.length > 0) {
				wit.EscalationId = match[0];
			}
		}

		// Gets info dictionary from "Notes" field		
		if (wit.CSH_Notes && wit.CSH_Notes.trim() !== "") {

			var cpeInfo = html2PlainText(wit.CSH_Notes).trim().replaceAll(";;", ";");
			if (cpeInfo.indexOf("=") === -1) return;
			if (cpeInfo.toLowerCase().indexOf("catalog") === -1) return;

			if (cpeInfo.endsWith(";")) {
				// Remove last ";"
				cpeInfo = cpeInfo.substr(0, cpeInfo.length - 1);
			}

			var cpeInfoDict = {};

			var infoList = cpeInfo.split(";");
			for (var index in infoList) {
				if (infoList[index].length > 0) {
					var dict = infoList[index].split("=");
					var key = dict[0].replaceAll('"', '').replaceAll(' ', '').toLowerCase();
					var value = (dict[1] && dict[1].length > 0) ? dict[1].trimStart().trimEnd() : "<unspecified>";
					cpeInfoDict[key] = value.replaceAll('"', '');
				}
			}

			// Re-format the catalog display name
			if (cpeInfoDict["catalog"]) {
				if (cpeInfoDict["catalog"].length > 50) {
					// Means has not recognized the catalog, uses the default template which contains all catalog items
					cpeInfoDict["catalog"] = "<unspecified>";
				} else {
					// Gets the uique display name
					var pureCatalogName = tools.utility.getPureNameString(cpeInfoDict["catalog"], false, true);
					if (tools.catalogDefinition[pureCatalogName]) {
						cpeInfoDict["catalog"] = tools.catalogDefinition[pureCatalogName];
					}
				}
			}

			// Re-format the modality display name
			if (cpeInfoDict["modality"]) {
				if (cpeInfoDict["modality"].length === 0) {
					cpeInfoDict["modality"] = "<unspecified>";
				} else {
					// Gets the uique display name
					var pureModalityName = tools.utility.getPureNameString(cpeInfoDict["modality"], false, true);
					if (tools.modalityDefinition[pureModalityName]) {
						cpeInfoDict["modality"] = tools.modalityDefinition[pureModalityName];
					}
				}
			}

			_.extend(wit.CPEInfo, cpeInfoDict);
		}

		// Gets the submitted year/week (from CreatedDate or "Submit time")
		var startDate = tools.moment(wit["CreatedDate"], "YYYY-MM-DD");
		if (wit.CPEInfo["submittime"]) {
			var date = tools.moment(wit.CPEInfo["submittime"], "YYYY-MM-DD HH:mm:ss");
			if (date.isValid()) {
				startDate = date;
				wit["CreatedDate"] = date.format("YYYY-MM-DD");
			}
		}
		wit.Created = {
			Year: startDate.year(),
			Month: startDate.month() + 1,	// start from zero
			Week: startDate.week(),
			YearMonth: startDate.format("YYYY-MM"),
			YearWeek: startDate.year() + "-" + startDate.week()
		}

		var endDate = tools.moment();
		if (wit.State === "Closed") {
			var closeDate = tools.moment(wit["ClosedDate"], "YYYY-MM-DD");
			if (closeDate.isValid()) {
				endDate = closeDate;	// uses the ClosedDate as the last date
			}

			wit.Closed = {
				Year: endDate.year(),
				Month: endDate.month() + 1,
				Week: endDate.week(),
				YearMonth: endDate.format("YYYY-MM"),
				YearWeek: endDate.year() + "-" + endDate.week()
			}
		}

		if (startDate.isValid()) {
			// Calculates the open working days
			wit.CPEInfo.OpenDays = endDate.diff(startDate, "days") + 1;
			wit.CPEInfo.OpenWorkingDays = endDate.businessDiff(startDate);
		}

		// temp
		wit.CPEInfoHtml = "";
	}

	function copyFields(src, dest) {
		if (!src) return null;
		if (!dest) return src;

		for (var propertyName in dest) {
			var newProp = propertyName.split(".").pop();
			src[newProp] = dest[propertyName];
		}

		return src;
	}
	
	function checkRequiredFields(wit) {
		wit.RequiredFieldMissed = false;
		wit.RequiredFieldMissedReason = "";
		wit.CanDirectlyClose = false;

		var resolved = (wit["State"] === "Resolved");
		var closed = (wit["State"] === "Closed");

		// Story points and Release
		if (resolved || closed) {
			if (!wit["StoryPoints"] || wit["StoryPoints"] <= 0) {
				wit.RequiredFieldMissed = true;
				wit.RequiredFieldMissedReason += "story point is empty,";
			}

			if (wit["CSH_Release"] === "") {
				wit.RequiredFieldMissed = true;
				wit.RequiredFieldMissedReason += "Release is empty";
			}
		}

		// Block and Block Reason
		if (wit["Blocked"] === "Yes" && wit["CSH_BlockedReason"] === "") {
			wit.RequiredFieldMissed = true;
			wit.RequiredFieldMissedReason += "Blocked without reason,";
		}

		if (wit["WorkItemType"] === "Bug") {
			wit.AcMissed = false;
			if (resolved || closed) {
				if (wit["CSH_FixedInBuild"] && wit["CSH_FixedInBuild"] !== "") {
					var buildNumParts = wit["CSH_FixedInBuild"].split(".");
					if (buildNumParts.length > 2) {
						var buildNum = buildNumParts[2].trim();
						if (buildNum.length !== 5) {
							// The build number format is incorrect, must be 5 digital
							wit.RequiredFieldMissed = true;
							wit.RequiredFieldMissedReason += "FixedInBuild is invalid,";
						}
					}
				} else {
					wit.RequiredFieldMissed = true;
					wit.RequiredFieldMissedReason += "FixedInBuild is empty,";
				}

				if (!wit["CSH_RootCauseDescription"] || wit["CSH_RootCauseDescription"] === "") {
					wit.RequiredFieldMissed = true;
					wit.RequiredFieldMissedReason += "RootCause is empty,";
				}

				if (!wit["CSH_ResolutionInfo"] || wit["CSH_ResolutionInfo"] === "") {
					wit.RequiredFieldMissed = true;
					wit.RequiredFieldMissedReason += "ResolutionInfo is empty,";
				}
			}

		} else if (wit["WorkItemType"] === "User Story") {
			wit.AcMissed = false;

			// No neet to check the AC field since it is not testable
			if (wit.Testable) {
				if (resolved || closed) {
					if (!wit["AcceptanceCriteria"] ||
						wit["AcceptanceCriteria"].trim() === "") {
						wit.AcMissed = true;
						wit.RequiredFieldMissed = true;
						wit.RequiredFieldMissedReason += "AC missed,";
					}
				}
			} else {
				// Can directly close a Resolved US since it is not testable
				if (resolved) {
					wit.CanDirectlyClose = true;
				}
			}
		}
	}

	function html2PlainText(html) {
		if (!html) return "";

		var keywords = [['&quot;', '']
						,['\t', ' ']
						,['\r\n', ' ']
						,['\n', ' ']
						,['&nbsp;', ' ']
						,['&lt;', '<']
						,['&gt;', '>']
						];

		html = html.replace(/<[^>]*>/g, "");

		for (var index in keywords)
		{
			html = html.replaceAll(keywords[index][0], keywords[index][1]);
		}

		while (html.indexOf("  ") !== -1) {
			html = html.replaceAll("  ", " ");
		}

		return html;	
	}

	(function (that) {
		if (that.WorkItemType === "Task") return;
		
		if (that["AreaPath"] && that["AreaPath"].indexOf("CPE") !== -1) {
			getCpeInfo(that);
		}

		if (that["CSH_BlockedReason"]) {
			var reason = html2PlainText(that.CSH_BlockedReason);
			if (reason !== "") {
				var maxLen = 20;
				that.OmittedBlockedReason = (reason.length <= maxLen) ? reason : (reason.substr(0, maxLen) + "...");
			}
		}
		
		checkRequiredFields(that);
	})(this);
}