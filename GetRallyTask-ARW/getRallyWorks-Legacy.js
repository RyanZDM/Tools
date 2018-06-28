// JavaScript source code
function getToken() {
	return btoa('dameng.zhang@carestream.com:1qaz2WSX');
}

function getTasksFromRally(owner, target, async, token) {
	// A GET request, which requires a HTTP Basic Authentication header, to the following endpoint provides the security token:
	// https://rally1.rallydev.com/slm/webservice/v2.0/security/authorize

	//var apiUrl = 'https://jsonplaceholder.typicode.com/posts'	// Fake link
	var apiUrl = 'https://rally1.rallydev.com/slm/webservice/v2.0/'
					+ target + '?'											// Must be either 'defect' or 'hierarchicalrequirement'
					+ 'query=((AcceptedDate >= "2017-01-01") and ('
						+ '(Owner.Name = ' + owner + ')'
						+ ' and ((ScheduleState = Accepted) OR (ScheduleState = Completed))'
						+ '))'
					+ '&order=Iteration,LastUpdateDate'
					+ '&fetch=FormattedID,Name,Owner,PlanEstimate,TaskEstimateTotal,Iteration'
					+ '&pagesize=1999';

	return jQueryGet(apiUrl, token, async);
}

function xhrGet(url, authToken, async) {
	var deferred = $.Deferred();
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, async);
	if (authToken) { xhr.setRequestHeader("Authorization", "Basic " + authToken); }

	xhr.onload = function (e) {
		if (xhr.readyState === 4) {
			//if (xhttp.status === 200) {
			console.log(xhr.responseText);
			var result = JSON.parse(xhr.responseText);
			var list = getTaskList(result);
			deferred.resolve(list);
			//} else {
			//	console.error(xhttp.statusText);
			//	deffered.reject(error);
			//}
		}
	};

	xhr.onerror = function (e) {
		console.error(xhr.statusText);
		deferred.reject(error);
	}

	xhr.send(null);

	return deffered.promise();
}

function jQueryGet(url, authToken, async) {
	var deferred = $.Deferred();
	if (!authToken) authToken = getToken();
	$.ajax({
		method: 'GET',
		url: url,
		async: async,
		headers: { "Authorization": "Basic " + authToken }
	})
		.done(function (data) {
			if (data.QueryResult.Errors.length > 0) {
				data.statusText = 'RallyInternalError';
				deferred.reject(data)
			} else {
				var list = getTaskList(data);
				deferred.resolve(list);
			}
		})
		.fail(function (error) {
			console.error(error.statusText);
			deferred.reject(error);
		});

	return deferred.promise();
}

function getTaskList(jsonObj) {
	if (!jsonObj || !jsonObj.QueryResult || !jsonObj.QueryResult.Results || jsonObj.QueryResult.Results.length < 1) return [];

	var taskList = [];
	for (var index in jsonObj.QueryResult.Results) {
		var task = new Task(jsonObj.QueryResult.Results[index]);
		taskList[taskList.length] = task;
	}

	return taskList;
}

function Task(jsonObj) {
	this.id = ('FormattedID' in jsonObj) ? jsonObj['FormattedID'] : '';
	this.Link = ('_ref' in jsonObj) ? jsonObj['_ref'].toLowerCase()
													.replace('slm/webservice/v2.0', '#/90211740268ud/detail')
													.replace('hierarchicalrequirement', 'userstory') : '';
	this.Description = ('Name' in jsonObj) ? jsonObj['Name'] : '';
	this.Estimate = (jsonObj['PlanEstimate']) ? jsonObj['PlanEstimate'] : 0;
	this.TimeSpent = (jsonObj['TaskEstimateTotal']) ? jsonObj['TaskEstimateTotal'] : 0;
	this.Owner = '';
	this.Iteration = '';

	(function (that) {
		if (jsonObj['Owner'] && jsonObj.Owner['_refObjectName']) {
			that.Owner = jsonObj.Owner._refObjectName;
		}

		if (jsonObj['Iteration'] && jsonObj.Iteration['_refObjectName']) {
			var sprint = jsonObj.Iteration._refObjectName.split(' ').pop();
			that.Iteration = parseInt(sprint, 10);
		}
	})(this);
}

// Legacy method for getting rally task
function refreshTask(btnId, userId, pwd) {
	$('#' + btnId)[0].disabled = true;
	var owner = $('#owner')[0].value;
	var token = btoa(userId + ":" + pwd);
	$("#typicalQueryResult").text(0);

	$.when(getTasksFromRally(owner, 'defect', true, token),
		   getTasksFromRally(owner, 'hierarchicalrequirement', true, token))
		.done(function (defects, userStories) {
			var tableHeader = "<table id='typicalTable' class='table table-hover' border='1'>"
										+ "<tr>"
											+ "<th>#</th>"
											+ "<th>ID</th>"
											+ "<th>Description</th>"
											+ "<th>Estimate<br />(Day)</th>"
											+ "<th>TimeSpent<br />(Hour)</th>"
											+ "<th>Owner</th>"
											+ "<th>Iteration</th>"
										+ "</tr>";
			var tableFooter = "</table>";

			var div = $("#TaskListTableDiv")[0];
			//var div = document.getElementById("TaskListTableDiv");

			var tableStr = "";
			var list = $.merge(defects, userStories).sort(function (a, b) { return a.Iteration - b.Iteration; });
			$("#typicalQueryResult").text(list.length);
			_.each(list, function (task, index) {
				tableStr += "<tr>";

				tableStr += "<td>" + (index + 1) + "</td>";
				tableStr += "<td>" + task.id + "</td>";
				tableStr += "<td><a href='" + task.Link + "'>" + task.Description + "</a></td>";
				tableStr += "<td>" + task.Estimate + "</td>";
				tableStr += "<td>" + task.TimeSpent + "</td>";
				tableStr += "<td>" + task.Owner + "</td>";
				tableStr += "<td>" + task.Iteration + "</td>";

				tableStr += "</tr>";
			});

			div.innerHTML = tableHeader + tableStr + tableFooter;
		})
		.fail(function (error) {
			console.error(error.statusText);
			window.alert(error.statusText);
		})
		.always(function () { $('#' + btnId)[0].disabled = false; });
}