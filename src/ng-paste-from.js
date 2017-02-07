angular.module("ngPasteFrom", [])
	.constant("ngPasteFromErrors", {
		invalidColumnLength: "NGPASTEFROM_INVALID_COLUMN_LENGTH",
		failedValidation: "NGPASTEFROM_FAILED_VALIDATION"
	}).constant("ngPasteFromSeparators", {
		row: /\r\n|\n\r|\n|\r/g,
		column: "\t"
	}).directive("ngPasteFrom", () =>
		({
			restrict: "A",
			scope: { 
				ngPasteFrom: "=",
				ngPasteFromColumns: "=",
				ngPasteFromRowSeparator: "=",
				ngPasteFromColumnSeparator: "=",
				ngPasteFromPasteOnly: "=",
				ngPasteFromBeforeParse: "=",
				ngPasteFromOnValidate: "=",
				ngPasteFromOnError: "="
			},

			link($scope, element, attrs) {
				if ($scope.ngPasteFromColumns == null) {
					console.error("Missing required attribute ngPasteFromColumns.");
				}

				$scope.pasteEvent = function(event) {
					let data;
					if ((event.clipboardData != null) && (event.clipboardData.getData != null)) { // Standard
						data = event.clipboardData.getData("text/plain");
					} else if ((event.originalEvent != null) && (event.originalEvent.clipboardData != null) && (event.originalEvent.clipboardData.getData != null)) { // jQuery
						data = event.originalEvent.clipboardData.getData("text/plain");
					} else if ((window.clipboardData != null) && (window.clipboardData.getData != null)) { // Internet Explorer
						data = window.clipboardData.getData("Text");
					}

					if (typeof $scope.ngPasteFromBeforeParse === "function") {
						data = $scope.ngPasteFromBeforeParse(data);
					}
					$scope.processPasteData(data);
					if ($scope.ngPasteFromPasteOnly != null ? $scope.ngPasteFromPasteOnly : true) {
						return event.preventDefault();
					}
				};

				$scope.changeEvent = function() {
					if ($scope.ngPasteFromPasteOnly != null ? $scope.ngPasteFromPasteOnly : true) {
						return element.val("");
					} else {
						let data = element.val();
						if (typeof $scope.ngPasteFromBeforeParse === "function") {
							data = $scope.ngPasteFromBeforeParse(data);
						}
						return $scope.processPasteData(data);
					}
				};

				element.on("paste", $scope.pasteEvent);
				element.on("keyup", $scope.changeEvent);
				return element.on("change", $scope.changeEvent);
			},

			controller($scope, $filter, ngPasteFromErrors, ngPasteFromSeparators) {
				$scope.columnsToObject = function(columns) {
					let obj = {};
					let format = $scope.ngPasteFromColumns;
					for (let index = 0; index < columns.length; index++) {
						let column = columns[index];
						obj[format[index]] = column;
					}
					return obj;
				};

				$scope.getExpectedColumnsLength = function() {
					if (typeof $scope.ngPasteFromColumns === "number") {
						return $scope.ngPasteFromColumns;
					} else {
						return $scope.ngPasteFromColumns.length;
					}
				};

				return $scope.processPasteData = function(data) {
					if (!(data && data.length)) {
						return;
					}

					let rows = data.split($scope.ngPasteFromRowSeparator != null ? $scope.ngPasteFromRowSeparator : ngPasteFromSeparators.row);
					let result = [];
					let expectedColumnsLength = $scope.getExpectedColumnsLength();

					for (let index = 0; index < rows.length; index++) {
						var rowResult;
						let row = rows[index];
						if (row === "") {
							continue;
						}

						let columns = row.split($scope.ngPasteFromColumnSeparator != null ? $scope.ngPasteFromColumnSeparator : ngPasteFromSeparators.column);

						let rowData = {
							index,
							source: row,
							expectedLength: expectedColumnsLength,
							actualLength: columns.length
						};

						if (columns.length !== expectedColumnsLength) {
							if (typeof $scope.ngPasteFromOnError === "function") {
								$scope.ngPasteFromOnError(ngPasteFromErrors.invalidColumnLength, rowData);
							}
							continue;
						}

						if (typeof $scope.ngPasteFromColumns === "number") {
							rowResult = columns;
						} else {
							rowResult = $scope.columnsToObject(columns);
						}

						if ((typeof $scope.ngPasteFromOnValidate !== "function") || $scope.ngPasteFromOnValidate(rowResult, rowData)) {
							result.push(rowResult);
						} else if (typeof $scope.ngPasteFromOnError === "function") {
							$scope.ngPasteFromOnError(ngPasteFromErrors.failedValidation, rowData);
						}
					}

					return $scope.$apply(() => $scope.ngPasteFrom = result);
				};
			}
		})
);
