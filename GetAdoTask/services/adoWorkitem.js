/**
 *construct a ADO work item object from JSON object
 *
 *param restApi		The lib in which contains the REST APIs
 *param jsonObj		The json object contains one ADO bugs and/or user stories
 *
 *return			The ADO work item collection
 */
function adoWorkItem(restApi, jsonObj) {
	this.Id = ("id" in jsonObj) ? jsonObj["id"] : "";
	this.Link = restApi.WitLink + this.Id;

	if (!jsonObj["fields"]) return;

	copyFields(this, jsonObj["fields"]);

	if (this.AssignedTo) {
		this.Owner = this.AssignedTo.displayName;
	}

	// System.IterationPath	string
	// Iteration			number
	if (this["IterationPath"]) {
		var sprint = this["IterationPath"].split(" ").pop();
		this.Iteration = parseInt(sprint, 10);
	}

	// Testable flag
	this.Testable = true;
	if (this["AcceptanceCriteria"]) {
		var ac = this["AcceptanceCriteria"].trim()
											.replace(/&nbsp;/g, " ");
		if (/not?\W?test|non-test|Not?\W?need/i.test(ac)) {
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

	// TODO:
	this.EverFailed = false;
	this.FakeTask = false;

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

	// Child
	this.Children = [];
	if (jsonObj["relations"] && jsonObj["relations"].length > 0) {
		var relations = jsonObj["relations"];
		_.forEach(relations, function (rel) {
			if (rel.attributes.name.toLowerCase() === "child") {
				this.Children.push(rel.url.split("/").pop());
			}
		}, this);
	}

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
			if (resolved || closed) {
				if (!wit["AcceptanceCriteria"] ||
					wit["AcceptanceCriteria"].trim() === "") {
					wit.AcMissed = true;
					wit.RequiredFieldMissed = true;
					wit.RequiredFieldMissedReason += "AC missed,";
				}
			}
		}
	}

	(function (that) {
		checkRequiredFields(that);
	})(this);
}