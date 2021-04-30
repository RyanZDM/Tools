/**
 *construct a Rally task object from JSON object
 *
 *param jsonObj		The json object contains one Rally defects and/or user stories
 *
 *return			The Rally task collection
 */
function RallyTask(jsonObj) {
	this.id = ("FormattedID" in jsonObj) ? jsonObj["FormattedID"] : "";
	this.isDefect = (this.id.indexOf("DE") !== -1);
	// The id 88538884208ud means ImageView Software project
	// The id 278792303760ud means Software project in new workspace
	this.Link = ("_ref" in jsonObj) ? jsonObj["_ref"].toLowerCase()
													.replace("slm/webservice/v2.0", "#/278792303760ud/detail")
													.replace("hierarchicalrequirement", "userstory") : "";
	this.Title = ("Name" in jsonObj) ? jsonObj["Name"] : "";
	this.Description = (jsonObj["Description"]) ? jsonObj["Description"] : "";
	this.Estimate = (jsonObj["PlanEstimate"]) ? jsonObj["PlanEstimate"] : 0;
	this.Actuals = (jsonObj["TaskEstimateTotal"]) ? jsonObj["TaskEstimateTotal"] : 0;
	this.ScheduleState = jsonObj["ScheduleState"];
	this.State = (jsonObj["State"]) ? jsonObj["State"] : "";
	this.Owner = (jsonObj["Owner"] && jsonObj.Owner["_refObjectName"]) ? jsonObj.Owner._refObjectName : "";
	this.Release = (jsonObj["Release"]) ? (jsonObj.Release["Name"] ? jsonObj.Release.Name : jsonObj.Release._refObjectName) : "";
	this.TaskLink = (jsonObj["Tasks"] && jsonObj.Tasks.Count > 0) ? this.TaskLink = jsonObj.Tasks._ref : "";
	this.Reject = ((jsonObj["State"]) && (/rejected|reject requested/i.test(jsonObj["State"]))) ? true : false;
	this.Postpone = ((jsonObj["State"]) && (/postponed|postpone requested/i.test(jsonObj["State"]))) ? true : false;
	this.Duplicate = ((jsonObj["State"]) && (/duplicate/i.test(jsonObj["State"]))) ? true : false;
	this.EverFailed = (jsonObj["Description"]) ? (jsonObj["Description"].toLowerCase().indexOf("[eetfail") !== -1) : false;	// [EETFailed] or [EETFail]
	this.Blocked = jsonObj.Blocked;
	this.BlockedReason = (this.Blocked && jsonObj["BlockedReason"]) ? jsonObj.BlockedReason : "";
	this.Priority = (jsonObj["Priority"]) ? jsonObj["Priority"] : "";
	this.Iteration = "";
	this.AC = "";
	this.Testable = true;
	this.UTNeed = "Missed";
	this.Rank = (jsonObj["DragAndDropRank"]) ? jsonObj.DragAndDropRank : "ZZ";		// ZZ means the priority is lowest
	this.FlowStateChangedDate = (jsonObj["FlowStateChangedDate"]) ? jsonObj["FlowStateChangedDate"] : "";
	this.Project = (jsonObj["Project"]) ? jsonObj["Project"]._refObjectName : "";
	this.Product = (jsonObj["c_FoundInProduct"]) ? jsonObj["c_FoundInProduct"] : "";
	this.Feature = (jsonObj["Feature"]) ? jsonObj["Feature"]._refObjectName : "";
	this.Requirement = (jsonObj["Requirement"]) ? jsonObj["Requirement"]._refObjectName : "";
	this.Tags = (jsonObj["Tags"]) ? jsonObj["Tags"] : null;
	this.RootCauseDesc = (jsonObj["c_RootCauseDescription"]) ? jsonObj["c_RootCauseDescription"].trim() : "";
	this.ResolutionReason = (jsonObj["c_ResolutionReason"]) ? jsonObj["c_ResolutionReason"].trim() : "";
	this.FixedInBuild = (jsonObj["FixedInBuild"]) ? jsonObj["FixedInBuild"].trim() : "";
	this.SubTasks = "";
	this.Other = "";

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

	if (jsonObj["c_PLIEventCRNumber"]) {
		this.id = this.id + "/" + jsonObj.c_PLIEventCRNumber;
	}

	if (jsonObj["Feature"]) {
		this.id = this.id + "/" + jsonObj.Feature.FormattedID;
	}

	if (jsonObj["Iteration"] && jsonObj.Iteration["_refObjectName"]) {
		var sprint = jsonObj.Iteration._refObjectName.split(" ").pop();
		this.Iteration = parseInt(sprint, 10);
	}

	if (jsonObj["c_AcceptanceCriteria"]) {
		this.AC = jsonObj["c_AcceptanceCriteria"].trim()
												.replace(/&nbsp;/g, " ");
		if (/not?\W?test|non-test|Not?\W?need/i.test(this.AC)) {
			this.Testable = false;
		}
	} else {
		if (jsonObj["Notes"]) {
			this.AC = jsonObj["Notes"].trim();
		}
	}

	// Gets the product on which issue occurred
	function getProduct(desc) {
		if (!desc) return "";

		var newString = desc.replace(/</g, "<\n")					// Convert html marker <xxx> to \n for easy regex matching
							.replace(/(3. Test Case:)/i, "\n");		// Search ends when find the keywords "3. Test Case:"
		var firstMatch = /Test Hardware:(.+)\n/i.exec(newString);
		if (firstMatch && firstMatch.length > 1) {
			// The second one is what we need, and may contains the HTML marker <xxx> at the end
			var secondMatch = firstMatch[1].split("<")[0];

			// Sometimes there is no product specified
			if (/evo|ascend|drx|nano|q-?vision|compass|transportable|q-?rad|in-?room|mobile/i.test(secondMatch)) {
				return secondMatch.replace(/&nbsp;/g, "")
									.replace(/&lt;/g, "<")
									.replace(/&gt;/g, ">");
			}
		}

		return "";
	}

	switch (this.Priority) {
		case "Resolve Immediately":
			this.Priority = "1 - " + this.Priority;
			break;
		case "High":
			this.Priority = "2 - " + this.Priority;
			break;
		case "Medium":
			this.Priority = "3 - " + this.Priority;
			break;
		case "Low":
			this.Priority = "4 - " + this.Priority;
			break;
		default:
			// do nothing
	}

	(function (that) {
		if (that.isDefect && (that.Product === "")) {
			that.Product = that.Description ? getProduct(that.Description) : "";
		}

		if (that.Reject || !that.isDefect) {
			// NA for user story or a reject defect
			that.UTNeed = "NA";
			that.Product = "";
		}

		if (that.ScheduleState !== "Completed" && that.ScheduleState !== "Accepted") {
			// Leave as empty since not complete yet
			that.UTNeed = "";
		}

		if (that.RootCauseDesc !== "") {
			var rootCause = that.RootCauseDesc.toLowerCase();
			if (rootCause.indexOf("[utyes]") !== -1) {
				that.UTNeed = "Y";
			} else if (rootCause.indexOf("[utno]") !== -1) {
				that.UTNeed = "N";
			}
		}
		
		if (that.FixedInBuild !== "") {
			var buildNumParts = that.FixedInBuild.split(".");
			if (buildNumParts.length > 2) {
				var buildNum = buildNumParts[2].trim();
				if (buildNum.length !== 5) {
					// The build number format is incorrect, must be 5 digital
					that.FixedInBuild = "";
				}
			} else {
				that.FixedInBuild = "";		// The build number contains at least 3 part, e.g. 1.9.07500
			}
		}

		if (!that.isDefect && that.ScheduleState === "Completed" && that.AC === "") {
			that.AcMissed = true;
		} else {
			that.AcMissed = false;
		}

		if (that.isDefect && that.State === "Reject Requested" && that.BlockedReason !== "Reject Requested") {
			that.RequiredFieldMissed = true;
		}

		if (!that.RequiredFieldMissed) {	// Check another required fields
			if (that.isDefect &&
				(that.ScheduleState === "Completed" || that.ScheduleState === "Accepted") &&
				(that.State !== "Rejected") &&
				(that.RootCauseDesc === "" ||
				(that.State !== "Reject Requested" &&
					(that.ResolutionReason === "" || that.FixedInBuild === "")))) {
				that.RequiredFieldMissed = true;
			} else {
				that.RequiredFieldMissed = false;
			}
		}

		var qaList = ["Ben Tang", "Yufang X", "Annie H"
			, "Sherry Hu", "Yanjun L", "Jun P", "Rita X"
			, "Yujie S", "Lina C", "Ivy Jiang", "Wenbin Zhong"
			, "Joe Maron", "Preeti Sharma"];

		var assignedToQa = qaList.includes(that.Owner);
		if (that.isDefect) {
			// Should assign it back to developer after a defect get Accepted
			that.WrongOwner = ( that.State !== "Reject Requested" &&						// Not check if is in reject request state
								((assignedToQa && that.ScheduleState === "Accepted")		// Should assign it back to developer after a defect get Accepted
								|| (assignedToQa && that.State === "Rejected")				// Should assign it back to developer after a defect get rejected
								|| (!assignedToQa && that.ScheduleState === "Completed")));	// Should assign it to QA for verification after mark a defect as Completed			
		} else {
			// Should not assign it to QA before completing a US
			that.WrongOwner = (assignedToQa && (that.ScheduleState === "Completed" || that.ScheduleState === "Accepted"));
		}

		if (that.ScheduleState === "Completed" || that.ScheduleState === "Accepted") {
			that.WorkingHoursMissed = (that.Actuals === 0);
		}
	})(this);
}