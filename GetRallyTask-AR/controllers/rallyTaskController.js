'use strict';

define(['app', 'underscore', 'jquery'],
    function (app, _, $) {
    	app.controller('rallyTaskController', [
            '$scope',
            '$rootScope',
            '$http',
            '$q',
            'rallyAuthService',
            'rallyQueryService',
            'rallyRestApi',
            'utility',

            function ($scope, $rootScope, $http, $q, rallyAuthService, rallyQueryService, rallyRestApi, utility) {
            	$scope.RALLY_INTERNAL_ERROR = 'RallyInternalError';
            	$scope.SAVED_PARAMETERS = 'RallyTaskQueryParameters';
            	$scope.SAVED_OTHERINFO = 'RallyTaskOtherInfo';
            	$scope.TaskList = [];
            	$scope.UserId = '';
            	$scope.UserPwd = '';
            	$scope.owner = '';
            	$scope.inQuerying = false;
            	$scope.ErrorMsg = '';
            	$scope.sprint = 0;
            	$scope.IgnoreScheduleState = true;
            	$scope.emailList = Object.values(rallyRestApi.OwnerEmailMapping);
            	$scope.OwnerNameList = Object.keys(rallyRestApi.OwnerEmailMapping);
            	$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;
            	$scope.IfSaveOtherInfo2Local = true;
            	$scope.OtherInfoLabel = 'Comments';
            	$scope.LastFilteredCount = 0;
            	$scope.LastRecordCount = 0;
            	$scope.SDCOnly = false;
            	$scope.TaijiOnly = true;
            	$scope.DEOnly = false;
            	$scope.ShowP1 = true;
            	$scope.ShowP2 = true;
            	$scope.ShowOthers = false;
            	$scope.ShowInDefine = true;
            	$scope.ShowDefined = true;
            	$scope.ShowWIP = true;
            	$scope.ShowCompleted = true;
            	$scope.ShowAccepted = true;
            	$scope.ShowFailedOnly = false;
            	$scope.ShowFakeTask = false;
            	$scope.ShowRejectedDefects = true;
            	$scope.QueryType = '';

            	$scope.OrderByOptions = [{ value: 0, name: 'Default' },
                { value: 1, name: 'Priority' },
                { value: 2, name: 'ScheduleState' }
            	];
            	$scope.OrderByValues = [['Owner', 'Iteration', '-ScheduleState', 'Rank', 'Priority'],
                ['Priority', '-ScheduleState'],
                ['-ScheduleState', 'Rank', 'Priority']];
            	$scope.OrderByOptionIndex = 0;
            	$scope.OrderByValue = $scope.OrderByValues[0];

				// Re-enable the Tooltip since the filtered the tasks changed
            	$scope.$watch('filteredRecords', function () {
            		$scope.enableHtmlFormatTooltip();
            	});

            	loadSavedParameters();

            	/**
				 * @name	saveCurrentParameters()
				 *
				 * @description	Saves the current parameters (owner, sprint, scope etc.) to browser local cache
				 *
				 */
            	function saveCurrentParameters() {
            		if (!$scope.CanUseLocalStorage) { return; }

            		localStorage.setItem($scope.SAVED_PARAMETERS, $scope.owner + ':' + $scope.sprint + ':' + $scope.ShowP1 + ':' + $scope.ShowP2 + ':' + $scope.ShowOthers + ':' + $scope.IfSaveOtherInfo2Local + ':' + $scope.OtherInfoLabel);
            	}

            	/**
				 * @name	loadSavedParameters()
				 *
				 * @description	Loads saved parameters from browser local cache
				 *
				 */
            	function loadSavedParameters() {
            		if (!$scope.CanUseLocalStorage) { return; }

            		var savedParameters = localStorage.getItem($scope.SAVED_PARAMETERS);
            		if (!savedParameters) { return; }

            		var parameters = savedParameters.split(':');
            		var paramLen = parameters.length;
            		if (paramLen > 0) { $scope.owner = parameters[0]; }
            		if (paramLen > 1) { $scope.sprint = parseInt(parameters[1]); }
            		if (paramLen > 2) { $scope.ShowP1 = parameters[2] == 'true'; }
            		if (paramLen > 3) { $scope.ShowP2 = parameters[3] == 'true'; }
            		if (paramLen > 4) { $scope.ShowOthers = parameters[4] == 'true'; }
            		if (paramLen > 5) { $scope.IfSaveOtherInfo2Local = parameters[5] == 'true'; }
            		if (paramLen > 6) { $scope.OtherInfoLabel = parameters[6]; }

            		if ($scope.IfSaveOtherInfo2Local && $scope.TaskList.length > 0) {
            			var otherInfoString = localStorage.getItem($scope.SAVED_OTHERINFO);
            			if (!otherInfoString) { return; }

            			var otherInfoList = otherInfoString.split('|');
            			var total = otherInfoList.length;
            			var remainCount = total;
            			while (remainCount > 1) {
            				var id = otherInfoList[total - remainCount];
            				var value = otherInfoList[total - remainCount + 1];
            				remainCount = remainCount - 2;

            				updateOtherInfo($scope.TaskList, id, value);
            			}
            		}
            	}

            	function updateOtherInfo(list, id, value) {
            		var index = _.findIndex(list, function (task) {
            			if (!id || !task['id']) return false;

            			return (id.substring(0, 6).toLowerCase() == task.id.substring(0, 6).toLowerCase());
            		});

            		if (index > -1) {
            			list[index].Other = value;
            		}
            	}

            	$scope.SaveOtherInfo2Local = function () {
            		if (!$scope.IfSaveOtherInfo2Local) { return; }

            		var otherInfo = '';
            		_.each($scope.TaskList, function (task) {
            			if (task['Other'] && task.Other != '') {
            				otherInfo = otherInfo + task.id + '|' + task.Other + '|';
            			}
            		});

            		if (otherInfo !== '') {
            			otherInfo = otherInfo.substring(0, otherInfo.length - 1);
            		}

            		localStorage.setItem($scope.SAVED_OTHERINFO, otherInfo);
            	}

            	$scope.clearError = function () {
            		$scope.ErrorMsg = '';
            	}

            	$scope.initBeforeQuery = function () {
            		// Record the last time record count so that we know if have changes between two query
            		$scope.LastRecordCount = $scope.TaskList.length;
            		$scope.LastFilteredCount = $scope.filteredRecords ? $scope.filteredRecords.length : 0;

            		saveCurrentParameters();
            		$scope.inQuerying = true;
            		$scope.clearError();
            		$scope.TaskList = [];
            		$scope.resetWorkloadStat();
            	};

            	/**
				 * @name	$scope.refreshTaskList = function ()
				 *
				 * @description	Get the task list of specified engineer from Rally, save to $scope.TaskList
				 *
				 */
            	$scope.refreshTaskList = function () {
            		$scope.initBeforeQuery();
            		$scope.QueryType = ' --- ' + $scope.owner + '\'s Rally task in sprint ' + $scope.sprint + ' @' + new Date().toLocaleTimeString();
            		$scope.refreshTaskByOwner({ 'Owner': $scope.owner, 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': true }, $q)
                        .then(function (result) {
                        	$scope.TaskList = result;

                        	// Load the other info from local storage
                        	loadSavedParameters();
                        })
            			.then(function () {
            				setTimeout(function () { $scope.enableHtmlFormatTooltip(); }, 100);
            			});
            	};

            	/**
				 * @name	refreshAll
				 *
				 * @description	Gets the task list of all engineers from Rally, save to $scope.TaskList
				 * 
				 */
            	$scope.refreshAll = function () {
            		$scope.initBeforeQuery();
            		$scope.QueryType = ' --- Rally task in sprint ' + $scope.sprint + ' for ALL person @' + new Date().toLocaleTimeString();
            		var promises = [];
            		promises.push($scope.refreshTaskByOwner({ 'Owner': '', 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': false }, $q));

            		$q.all(promises)
                        .then(function (result) {
                        	result = _.flatten(result);
                        	$scope.TaskList = result;

                        	// Load the other info from local storage
                        	loadSavedParameters();
                        })
                        .catch(function (error) {
                        	reportError(error);
                        })
                        .finally(function () {
                        	$scope.enableHtmlFormatTooltip();
                        });
            	};

            	/**
				 * @name	getOpenDefects
				 *
				 * @descriptions	Gets all open defects of Crossroads phase II
				 *
				 */
            	$scope.getOpenDefects = function () {
            		$scope.initBeforeQuery();
            		$scope.QueryType = ' --- ALL Crossroads Phase II open defect @' + new Date().toLocaleTimeString();

            		var token = rallyAuthService.getAuthenticationToken();
            		rallyQueryService.getOpenDefectCRP2(token).then(function (list) {
            														$scope.TaskList = list;

            														// Load the other info from local storage
            														loadSavedParameters();
            													},
																function (error) {
																	reportError(error);
																})
            													.then(function () { 
            														$scope.inQuerying = false;
            														$scope.$apply();
            														$scope.enableHtmlFormatTooltip();
            													});
            	}

            	/**
				 * @name	refreshTaskByOwner
				 *
				 * @description	Get the Rally task according to the specified parameters. Called by refreshTaskList() and refreshAll()
				 *
				 * @param	parameters	Options for querying the tasks from Rally.
				 * @param	q		  	$q object.
				 * @param	taskList  	Append the list to the query result if it is not empty.
				 *
				 * @returns	Promise to the task for querying task from Rally
				 */
            	$scope.refreshTaskByOwner = function (parameters, q, taskList) {
            		var token = rallyAuthService.getAuthenticationToken();
            		_.extend(parameters, { 'Token': token, 'Async': true });

            		var deferred = $q.defer();
            		var result = [];
            		if (taskList && taskList.length > 0) {
            			result.push(taskList);
            		}

            		q.all([
                        rallyQueryService.getTasksFromRally(parameters, 'hierarchicalrequirement'),
                        rallyQueryService.getTasksFromRally(parameters, 'defect')
            		])
                        .then(function (lists) {
                        	// If directly Complete the user story or defect under which still contains incompleted tasks
                        	// the SpentTime of those taks would not be counted any more. So need to accumulate all task hours
                        	var tasks = _.union(lists[0], lists[1]);

                        	result = _.union(result, tasks);
                        	q.all(rallyQueryService.reCalculateTaskSpentTime(tasks, token))
                                .then(function (updatedTasks) {
                                	// A user story or defect may contains some tasks assigned to different developer, need to filter out
                                	var otherOwnerTasks = _.flatten(_.filter(_.pluck(updatedTasks, "OtherOwnerTasks"), function (other) { return other !== undefined }));
                                	result = _.union(result, updatedTasks, otherOwnerTasks);

                                	deferred.resolve(result);
                                })
                                .catch(function (error) { reportError(error); })
                                .finally(function () { $scope.inQuerying = false; });
                        })
                        .catch(function (error) {
                        	reportError(error)
                        	deferred.reject(error);
                        });

            		return deferred.promise;
            	};

            	/**
				 * @name	scheduleStateFilter
				 *
				 * @description	Schedule state filter
				 *
				 * @param	task	The task record to be filtered.
				 *
				 * @returns	false if do not want to show
				 */
            	$scope.scheduleStateFilter = function (task) {
            		if (!$scope.ShowFakeTask && task.FakeTask) return false;

            		var isP1 = /\[Phase I]/i.test(task.Release);
            		var isP2 = /\[Phase II]/i.test(task.Release);
            		var isOthers = !(isP1 || isP2);

            		if (!$scope.ShowP1 && isP1) return false;

            		if (!$scope.ShowP2 && isP2) return false;

            		if (!$scope.ShowOthers && isOthers) return false;

            		if ($scope.DEOnly && task.id.indexOf("DE") === -1) return false;

            		if ($scope.TaijiOnly) {
            			if (task.Project != "Team Taiji") return false;
            		}

            		// #Configurable here#
            		// Change the condition for different project
            		if ($scope.SDCOnly) {
            			if (!task.Owner || task.Owner == '') return false;
            			var ower = task.Owner.toLowerCase();
            			var find = $scope.OwnerNameList.find(function (data) {
            				return ower == data.toLowerCase();
            			});

            			if (!find) return false;
            		}

            		if (!$scope.ShowRejectedDefects && task.Reject) return false;

            		if ($scope.ShowFailedOnly) {
            			return task.EverFailed;
            		}

            		if (!$scope.IgnoreScheduleState) return true;

            		switch (task.ScheduleState) {
            			case 'Completed':
            				return $scope.ShowCompleted;
            			case 'Accepted':
            				return $scope.ShowAccepted;
            			case 'In-Progress':
            				return $scope.ShowWIP;
            			case 'Defined':
            				return $scope.ShowDefined;
            			case 'In Definition':
            				return $scope.ShowInDefine;
            		}

            		return false;
            	}

            	/**
				 * @name	getWorkload
				 *
				 * @description	Accumulate the total estimation days and acutal working hours 
				 *
				 * @param	records	The records to accumlate.
				 *
				 * @returns	The accumlate result string.
				 */
            	$scope.getWorkload = function (records) {
            		var result = '';
            		if (records && records.length > 0) {
            			var totalDays = 0, actualHours = 0;
            			_.each(records, function (record) {
            				totalDays = totalDays + record.Estimate;
            				actualHours = actualHours + (record.Actuals ? record.Actuals : 0);
            			})

            			result = '-- Est. Days:' + totalDays + ' | Act. Hours:' + Math.round(actualHours);
            		}

            		return result;
            	}

            	$scope.workloadStat = {};

            	/**
				 * @name	collectWorkloadStatData
				 *
				 * @description	Summarize the totoal estimation days, working hours and task count by engineer
				 *
				 * @returns	Ture if the workload stat data is generated successfully. False if no data.
				 */
            	$scope.collectWorkloadStatData = function () {
            		if (!$scope.filteredRecords) {
            			$scope.workloadStat = {};
            			return false;
            		}

            		if ($scope.workloadStat['Collected'] && $scope.workloadStat.Collected) {
            			return true;
            		};

            		// -- For chart display
            		$scope.workloadStat.ChartSeries = ['Est. Days', 'Tasks Total'];
            		$scope.workloadStat.ChartOptions = [];

            		$scope.workloadStat.ChartLabels = [];
            		$scope.workloadStat.ChartData = [];
            		var count = [];
            		var days = [];
            		// --------------- End

            		if ($scope.filteredRecords.length > 0) {
            			var result = $scope.filteredRecords.reduce(function (total, task) {
            				var actuals = (task.Actuals) ? task.Actuals : 0;
            				if (!(task.Owner in total)) {
            					total[task.Owner] = { Days: task.Estimate, Hours: actuals, Count: 1 };
            				} else {
            					total[task.Owner].Days += task.Estimate;
            					total[task.Owner].Hours += actuals;
            					total[task.Owner].Count += 1;
            				}

            				return total;
            			}, {});

            			var orderedData = [];
            			for (var owner in result) {
            				var found = result[owner];
            				orderedData.push({ Owner: owner, Count: found.Count, Days: found.Days, Hours: found.Hours });
            			}

            			// Order by Days and Count desc
            			orderedData.sort(function (a, b) {
            				if (a.Days > b.Days) {
            					return -1;
            				} else if (a.Days == b.Days) {
            					return (a.Count - b.Count);
            				} else { return 1; }
            			});

            			$scope.workloadStat.WorkLoad = orderedData;

            			// For chart display
            			//$scope.workloadStat.ChartLabels = Object.keys(result);
            			_.each(orderedData, function (data) {
            				$scope.workloadStat.ChartLabels.push(data.Owner);
            				count.push(data.Count);
            				days.push(data.Days);
            			});

            			$scope.workloadStat.ChartData.push(days);
            			$scope.workloadStat.ChartData.push(count);
            			$scope.workloadStat.ChartHeight = $scope.workloadStat.ChartLabels.length * 10;
            		}

            		$scope.workloadStat.Collected = true;

            		return true;
            	};

            	$scope.resetWorkloadStat = function () {
            		$scope.workloadStat = {};
            	};

            	/**
				 * @name	checkStatPermision
				 *
				 * @description	Check stat permision
				 *
				 * @returns	If the current user has permission to see the data stat table/charter
				 */
            	$scope.checkStatPermision = function () {
            		if (document.getElementById('userId').value === 'dameng.zhang@carestream.com') {
            			return true;
            		} else {
            			return false;
            		}
            	};

            	$scope.orderChanged = function () {
            		$scope.OrderByValue = $scope.OrderByValues[$scope.OrderByOptionIndex];
            	};

            	$scope.enableHtmlFormatTooltip = function () {
            		setTimeout(function () {
            			$('[data-html="true"]').tooltip();
            		}, 100);
            	};

            	/**
				 * @name	export
				 *
				 * @description	Copy the current filtered data to clipboard
				 *
				 */
            	$scope.export = function () {
            		var data = 'ID\tTitle\tPriority\tOwner\tIteration\tState\tReject\t' + $scope.OtherInfoLabel;
            		_.each($scope.filteredRecords, function (record) {
            			data += '\r\n' + record.id + '\t' + record.Title + '\t' + record.Priority + '\t' + record.Owner + '\t' + record.Iteration + '\t' + record.ScheduleState + '\t' + record.Reject + '\t' + record.Other;
            		});

            		window.alert(utility.copyToClipboard(data) ? 'Data get copied to clipboard.' : 'Copy to clipboard failed.');
            	};

            	/**
				 * @name	getProjectSummaryReport
				 *
				 * @description	Accumulate the total estimation days, actual working hours, task count group by project and ScheduleState
				 *
				 * @param	token	The authorization token for querying the Rally tasks.
				 *
				 * @returns	Summary report is saved to $scope.projectcSummary.
				 */
            	$scope.getProjectSummaryReport = function (token) {
            		$scope.inQuerying = true;
            		$scope.projectSummary = {};
            		if (!token) {
            			token = rallyAuthService.getAuthenticationToken();
            		}

            		$scope.summaryByProject($scope.sprint, token)
                        .then(function (result) {
                        	for (var project in result) {
                        		if (!result[project]['Not Start']) {
                        			result[project]['Not Start'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
                        		}

                        		if (!result[project]['In-Progress']) {
                        			result[project]['In-Progress'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
                        		}

                        		if (!result[project]['Completed']) {
                        			result[project]['Completed'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
                        		}

                        		if (!result[project]['Accepted']) {
                        			result[project]['Accepted'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
                        		}

                        		result[project].Total = (result[project]['Not Start']._Count + result[project]['In-Progress']._Count + result[project]['Completed']._Count + result[project]['Accepted']._Count) + ' ('
                                    + (result[project]['Not Start'].Estimate + result[project]['In-Progress'].Estimate + result[project]['Completed'].Estimate + result[project]['Accepted'].Estimate)
                                    + 'D)';
                        	}

                        	$scope.projectSummary = result;
                        })
                        .finally(function () { $scope.inQuerying = false; });;
            	};

            	/**
				 * @name	summaryByProject
				 *
				 * @description	Gets the rally task summary group by Release/ScheduleState
				 *
				 * @param	sprint	The sprint.
				 * @param	token 	The authorization token for querying the Rally tasks.
				 *
				 * @returns	Promise to the summary result.
				 */
            	$scope.summaryByProject = function (sprint, token) {
            		var stateFunc = function (record) {
            			var state = 'Not Start';
            			if (record.ScheduleState == 'In-Progress' || record.ScheduleState == 'Completed' || record.ScheduleState == 'Accepted') {
            				state = record.ScheduleState;
            			};

            			return state;
            		};


            		var deferred = $q.defer();

            		$q.all([
                        rallyQueryService.getFromRally(rallyRestApi.getApiUrlTaskSummary(sprint, 'hierarchicalrequirement'), token),
                        rallyQueryService.getFromRally(rallyRestApi.getApiUrlTaskSummary(sprint, 'defect'), token)
            		])
                        .then(function (lists) {
                        	var result = _.union(lists[0], lists[1]);

                        	result = utility.groupByMultiple(result, ['Release', stateFunc], ['Estimate', 'TimeSpent']);

                        	deferred.resolve(result);
                        })
                        .catch(function (error) {
                        	reportError(error);
                        	deferred.reject(error);
                        });

            		return deferred.promise;
            	};

            	/**
				 * @name	getProjectSummaryReportPeriodically
				 *
				 * @description	After called this function, will gets project summary report periodically
				 *
				 * @returns	The project summary report periodically.
				 */
            	$scope.getProjectSummaryReportPeriodically = function () {
            		if (!$scope.sprint || $scope.sprint < 1) { return; }

            		var token = "ZGFtZW5nLnpoYW5nQGNhcmVzdHJlYW0uY29tOjFxYXoyV1NY";

            		$scope.getProjectSummaryReport(token);
            		$scope.LastUpdate = "Last update at " + new Date().toLocaleTimeString();
            		setTimeout($scope.getProjectSummaryReportPeriodically, 60000 * 10);
            	};

            	/**
				 * @name	reportError
				 *
				 * @description	Reports an error
				 *
				 * @param	error	The error object.
				 *
				 */
            	function reportError(error) {
            		console.error(error.statusText);
            		if (error.statusText === $scope.RALLY_INTERNAL_ERROR) {
            			$scope.ErrorMsg = error.QueryResult.Errors.join(' || ');
            		} else {
            			$scope.ErrorMsg = error.statusText;
            		}
            	};
            }]);
    });
