'use strict';

let mainCC,
	foodCC,
	state,
	config, 
	entityId = 1,
	worldTime = 0;

function getEntityId() {
	return entityId++;
}

function radiansToDegrees(radians) {
	return radians * (180 / Math.PI);
}

function degreesToRadians(degrees) {
	return degrees * (Math.PI / 180);
}

function getHypotenuseFromXY(x, y) {
	let absoluteX = Math.abs(x),
		absoluteY = Math.abs(y);

	return Math.sqrt(Math.pow(absoluteX, 2) + Math.pow(absoluteY, 2));
}

function getBearingFromXY(x, y) {
	let radiansAngle = Math.atan2(x, y),
		angle = radiansToDegrees(radiansAngle);
	return (angle + 360) % 360;
}

function getPointRotatedFromRadius(ox, oy, r, bearing) {
	return {
		x: Math.sin(degreesToRadians(bearing)) * r + ox,
		y: Math.cos(degreesToRadians(bearing)) * r + oy,
	};
}

function setup() {
	mainCC = document.getElementById('ac').getContext('2d');
	foodCC = document.createElement('canvas').getContext('2d');

	state = {
		world: {
			sizeX: null,
			sizeY: null,
		},
		food: [],
		cells: [],
		smellIntensityCircles: [],
		renderFoodCanvas: true,
		renderSmellCircles: true,
	};
	config = {
		cell: {
			locomotion: true,
			smell: true,
			freewill: true, // Program behaviour changes if conscious output (self determination) is switched to false
			colour: 'rgba(204, 0, 204, 0.75)',
			radius: 50,
			mass: 5,
			speeds: {
				speed0: {
					speed: 0,
					force: 0,
				},
				speed1: {
					timeThreshhold: 0,
					speed: 0.25,
					force: 0.02,
				},
				speed2: {
					timeThreshhold: 100,
					speed: 1,
					force: 0.08,
				},
				speed3: {
					timeThreshhold: 300,
					speed: 3,
					force: 0.32,
				},
				speedSniff: {
					timeThreshhold: 3,
					speed: 24,
					force: 1,
				}
			},
			forwardOverrideThreshold: 15,
			chemodetectors: {
				colour: '#008',
				radius: 5,
			},
		},
		food: {
			colour: '#0c0',
			radius: 10,
			iSLScalingFactor: 1,
		},
		smellIntensityCircles: {
			visibilityFactor: 10,
			stepSize: 10,
			limitDistance: 0,
		},
	};

	mainCC.canvas.width = mainCC.canvas.scrollWidth;
	mainCC.canvas.height = mainCC.canvas.scrollHeight;
	foodCC.canvas.width = mainCC.canvas.scrollWidth;
	foodCC.canvas.height = mainCC.canvas.scrollHeight;

	calculateSmellCircles();

	function calculateSmellCircles() {
		let previousSmellValue = 0;

		for (let i = config.smellIntensityCircles.limitDistance; i > 0; i = i - config.smellIntensityCircles.stepSize) {
			let smellValueHere = 1 / i; // Logarithmically adjusted as actual smell is inverse square law, not just inverse

			state.smellIntensityCircles.push({
				radius: i,
				intensity: smellValueHere,
				intensityDelta: smellValueHere - previousSmellValue,
			});

			previousSmellValue = smellValueHere;
		}

		function generateNumbersBetween(start, end, increment) {
			let numbers = [];
			for (let i = start; i <= end; i = i + increment) {
				numbers.push(i);
			}
			return numbers;
		}
	}
}

function createFoods(quantity) {
	while (quantity > 0) {
		createFood();
		quantity--;
	}
}

function createFood() {
	state.food.push({
		entityId: getEntityId(),
		location: {
			x: getNewFoodLocationX(),
			y: getNewFoodLocationY(),
		},
		speed: 0,
		direction: 0,
	});

	function getNewFoodLocationX() {
		return Math.random() * (mainCC.canvas.width - config.food.radius * 2) + config.food.radius;
	}

	function getNewFoodLocationY() {
		return Math.random() * (mainCC.canvas.height - config.food.radius * 2) + config.food.radius;
	}
}

function createCells(quantity) {
	while (quantity > 0) {
		createCell();
		quantity--;
	}
}

function createCell() {
	state.cells.push({
		entityId: getEntityId(),
		location: {
			x: getNewCellLocationX(),
			y: getNewCellLocationY(),
		},
		desiredSpeed: {
			timeThreshhold: 0,
			speed: 0,
			force: 0,
		},
		velocity: {
			x: 0,
			y: 0,
		},
		desiredOrientationBearing: getNewCellDirection(),
		orientationBearing: 0,
		angularMomentum: 0,
		timeOfLastMeal: 0,
		iGotFood: 0,
		chemodetectors: [
			{
				currentIntensity: 0,
				previousIntensity: 0,
				bearing: -45,
				offset: config.cell.radius,
			},
			{
				currentIntensity: 0,
				previousIntensity: 0,
				bearing: 45,
				offset: config.cell.radius,
			},
		],
		knowledge: {
			whenILastAte: null,
			stopInitiatedAt: null,
			sniff: {},
			lastTurn: null,
			activity: 'moveForwards',
			reverseTo: null,
			inhibitReverseTill: 0,
		},
	});

	function getNewCellLocationX() {
		return Math.random() * (mainCC.canvas.width - config.cell.radius * 2) + config.cell.radius;
	}

	function getNewCellLocationY() {
		return Math.random() * (mainCC.canvas.height - config.cell.radius * 2) + config.cell.radius;
	}

	function getNewCellDirection() {
		return Math.random() * 360;
	}
}

function renderWorld() {
	mainCC.clearRect(0, 0, mainCC.canvas.width, mainCC.canvas.height);

	if (state.renderFoodCanvas) {
		foodCC.clearRect(0, 0, foodCC.canvas.width, foodCC.canvas.height);
		state.food.forEach(function(food) {
			foodCC.beginPath();
			foodCC.fillStyle = config.food.colour;
			foodCC.arc(food.location.x, food.location.y, config.food.radius, 0, Math.PI * 2, true);
			foodCC.fill();
		});

		state.smellIntensityCircles.forEach(function(smellIntensityCircle) {
			state.food.forEach(function(food) {
				foodCC.beginPath();
				foodCC.fillStyle = config.food.color;
				foodCC.globalAlpha = smellIntensityCircle.intensityDelta * config.smellIntensityCircles.visibilityFactor;
				foodCC.arc(food.location.x, food.location.y, smellIntensityCircle.radius, 0, Math.PI * 2, true);
				foodCC.fill();
			});
			foodCC.globalAlpha = 1;
		});

		state.renderFoodCanvas = false;
	}

	mainCC.drawImage(foodCC.canvas, 0, 0);

	state.cells.forEach(function(cell) {
		let chemodetectorLocation;

		mainCC.beginPath();
		mainCC.fillStyle = config.cell.colour;
		mainCC.arc(cell.location.x, cell.location.y, config.cell.radius, 0, Math.PI * 2, true);
		mainCC.fill();

		cell.chemodetectors.forEach(function(chemodetector) {
			chemodetectorLocation = getPointRotatedFromRadius(cell.location.x, cell.location.y, chemodetector.offset, (chemodetector.bearing + cell.orientationBearing + 360) % 360);
			mainCC.beginPath();
			mainCC.fillStyle = config.cell.chemodetectors.colour;
			mainCC.arc(chemodetectorLocation.x, chemodetectorLocation.y, config.cell.chemodetectors.radius, 0, Math.PI * 2, true);
			mainCC.fill();
		});
	});
}

function progressWorld() {
	state.cells = state.cells.map(function(cell) {
		cell = moveCell(cell);
		cell = collisionDetection(cell);
		cell = calculateSmellAtCell(cell);
		cell = cellFunctions(cell);

		return cell;
	});

	function moveCell(cell) {
		let motiveForce,
			acceleration;

		turnCell();
		cell.actualSpeed = getActualSpeed();
		motiveForce = getMotiveForce();
		acceleration = getAcceleration(motiveForce, config.cell.mass);

		if (config.cell.locomotion) {
			applyVelocityChange(acceleration, cell.desiredOrientationBearing);
		}
		applySubstrateVelocityResistance();
		applyVelocitiesToLocations();
		preventOverflow();

		function turnCell() {
			let useClockwiseSolution,
				clockwiseSolution,
				counterclockwiseSolution,
				solution,
				clockwise = true,
				counterclockwise = false,
				maxAngularMomentum = 5,
				angularMomentumStepSize = 0.5,
				easeOff = 1,
				brake = 2;

			if (cell.orientationBearing === cell.desiredOrientationBearing) {
				return;
			}

			let previousAngularMomentum = cell.angularMomentum;

			clockwiseSolution = getTurningSolution(clockwise);
			counterclockwiseSolution = getTurningSolution(counterclockwise);
			useClockwiseSolution = clockwiseSolution <= Math.abs(counterclockwiseSolution);

			if (useClockwiseSolution) {
				turnProcessing(clockwiseSolution);
			} else {
				turnProcessing(counterclockwiseSolution);
			}

			applyAngularMomentum();

			function turnProcessing(turnSolution) {
				let clockwise = Math.abs(turnSolution) === turnSolution,
					angularDeceleratioNeed = queryAngularDecelerationNeed(turnSolution),
					angularAccelerationNeed = queryAngularAccelerationNeed(cell.angularMomentum);

				if (angularDeceleratioNeed === brake) {
					decelerateAngularVelocity();
				} else if (angularDeceleratioNeed === easeOff) {
					coast();
				} else if (angularAccelerationNeed) {
					accelerateAngularVelocity(clockwise);
				}
			}

			function decelerateAngularVelocity() {
				if (cell.angularMomentum > 0) {
					cell.angularMomentum = cell.angularMomentum - angularMomentumStepSize;
				} else {
					cell.angularMomentum = cell.angularMomentum + angularMomentumStepSize;
				}
			}

			function coast() {
				return null;
			}

			function accelerateAngularVelocity(clockwise) {
				if (clockwise) {
					cell.angularMomentum = cell.angularMomentum + angularMomentumStepSize;
				} else {
					cell.angularMomentum = cell.angularMomentum - angularMomentumStepSize;
				}
			}

			function queryAngularAccelerationNeed(angularMomentum) {
				return Math.abs(angularMomentum) < maxAngularMomentum;
			}

			function queryAngularDecelerationNeed(turnRemaining) {
				let angularMomentum = Math.abs(cell.angularMomentum),
					nextAngularMomentumCoasting = angularMomentum,
					nextAngularMomentumAccelerating = angularMomentum < maxAngularMomentum ? angularMomentum + angularMomentumStepSize : angularMomentum,
					angleTravelledBrakingNow = calculateBrakingAngle(turnRemaining, angularMomentum),
					angleTravelledBrakingNextTimeCoastingNow = calculateBrakingAngle(turnRemaining - nextAngularMomentumCoasting, angularMomentum),
					angleTravelledBrakingNextTimeAcceleratingNow = calculateBrakingAngle(turnRemaining - nextAngularMomentumAccelerating, angularMomentum);

				turnRemaining = Math.abs(turnRemaining);

				// if (angleTravelledBrakingNextTimeCoastingNow > turnRemaining) {
				// 	return easeOff;
				// }

				if (angleTravelledBrakingNextTimeAcceleratingNow > turnRemaining) {
					return brake;
				}

				function calculateBrakingAngle(turnRemaining, angularMomentum) {
					let angleTravelled = 0;

					while (angularMomentum > 0) {
						angularMomentum = angularMomentum - 0.5;
						angleTravelled = angleTravelled + angularMomentum;
					}

					return angleTravelled;
				}
			}

			function applyAngularMomentum() {
				if (bearingWithinTolerance(cell.desiredOrientationBearing, cell.orientationBearing, 1) && cell.angularMomentum <= 0.5) {
					cell.orientationBearing = cell.desiredOrientationBearing;
					cell.angularMomentum = 0;
				}
				cell.orientationBearing = (cell.orientationBearing + cell.angularMomentum + 360) % 360;
			}

			function bearingWithinTolerance(a, b, tolerance) {
				return withinTolerance((a + 360) % 360, (b + 360) % 360, tolerance) ||
					withinTolerance((a + 360) % 360 + 360, (b + 360) % 360, tolerance) ||
					withinTolerance((a + 360) % 360, (b + 360) % 360 + 360, tolerance);
			}

			function withinTolerance(a, b, tolerance) {
				let difference = a - b;
				difference = Math.abs(difference);
				return difference <= tolerance;
			}

			function getTurningSolution(clockwise = true) {
				if (clockwise) {
					if (cell.desiredOrientationBearing < cell.orientationBearing) {
						return (cell.desiredOrientationBearing + 360) - cell.orientationBearing;
					} else {
						return cell.desiredOrientationBearing - cell.orientationBearing;
					}
				} else {
					if (cell.desiredOrientationBearing > cell.orientationBearing) {
						return cell.desiredOrientationBearing - (cell.orientationBearing + 360);
					} else {
						return cell.desiredOrientationBearing - cell.orientationBearing;
					}
				}
			}

			function relativeTurn(amount) {
				cell.knowledge.lastTurn = (amount + 360) % 360;
				cell.desiredOrientationBearing = (cell.desiredOrientationBearing + amount) % 360;
			}
		}

		function getActualSpeed() {
			return getSpeedFromXY(cell.velocity.x, cell.velocity.y);
		}

		function getSpeedFromXY(x, y) {
			return getHypotenuseFromXY(x, y);
		}

		function getMotiveForce() {
			if (cell.desiredSpeed.speed > cell.actualSpeed) {
				return cell.desiredSpeed.force;
			} else {
				return 0;
			}
		}

		function getAcceleration(force, mass) {
			return force / mass;
		}

		function applyVelocityChange(accelerationForFrame, bearing) {
			let vectorComponents = getPointRotatedFromRadius(0, 0, accelerationForFrame, bearing);

			cell.velocity.x = cell.velocity.x + vectorComponents.x;
			cell.velocity.y = cell.velocity.y + vectorComponents.y;
		}

		function applySubstrateVelocityResistance() {
			let speed = getActualSpeed(),
				bearing = getBearingFromXY(cell.velocity.x, cell.velocity.y),
				counterBearing = (bearing + 180) % 360,
				resistanceForce;

			resistanceForce = getResistanceDeceleration(speed);
			acceleration = getAcceleration(resistanceForce, config.cell.mass);
			applyVelocityChange(acceleration, counterBearing);

			function getResistanceDeceleration(speed) {
				return Math.pow(speed, 2.2) / 40;
			}
		}

		function applyVelocitiesToLocations() {
			cell.location.x = cell.location.x + cell.velocity.x;
			cell.location.y = cell.location.y + cell.velocity.y;
		}

		function preventOverflow() {
			if (cell.location.x > mainCC.canvas.width - config.cell.radius) {
				cell.location.x = mainCC.canvas.width - config.cell.radius;
				if (cell.velocity.x > 0) {
					cell.velocity.x = 0;
				}
			} else if (cell.location.x < config.cell.radius) {
				cell.location.x = config.cell.radius;
				if (cell.velocity.x < 0) {
					cell.velocity.x = 0;
				}
			}

			if (cell.location.y > mainCC.canvas.height - config.cell.radius) {
				cell.location.y = mainCC.canvas.height - config.cell.radius;
				if (cell.velocity.y > 0) {
					cell.velocity.y = 0;
				}
			} else if (cell.location.y < config.cell.radius) {
				cell.location.y = config.cell.radius;
				if (cell.velocity.y < 0) {
					cell.velocity.y = 0;
				}
			}
		}

		return cell;
	}

	function collisionDetection(cell) {
		let foodOfInterest, 
			foodOfCollisioniness, 
			collisionDistance, 
			collisionEntityIds = [];

		collisionDistance = config.cell.radius + config.food.radius;

		foodOfInterest = state.food.filter(function(food) {
			let distanceX = Math.abs(food.location.x - cell.location.x),
				distanceY = Math.abs(food.location.y - cell.location.y);

			return distanceX <= collisionDistance && distanceY <= collisionDistance;
		});

		foodOfCollisioniness = foodOfInterest.filter(function(food) {
			let distanceX = Math.abs(food.location.x - cell.location.x),
				distanceY = Math.abs(food.location.y - cell.location.y),
				distanceH = Math.sqrt(Math.pow(distanceX, 2) +  Math.pow(distanceY, 2));

			return distanceH <= collisionDistance;
		});

		foodOfCollisioniness.forEach(function(food) {
			collisionEntityIds.push(food.entityId);
		});

		state.food = state.food.filter(function(food) {
			return !collisionEntityIds.includes(food.entityId);
		});

		// Cleanup required below

		if (foodOfCollisioniness.length > 0) {
			state.renderFoodCanvas = true;
		}
		cell.iGotFood = foodOfCollisioniness.length;
		cell.counsciousnessAchieved = config.cell.smell;
		cell.knowledge.whenILastAte = worldTime - cell.timeOfLastMeal;

		return cell;
	}

	function calculateSmellAtCell(cell) {
		cell.chemodetectors = cell.chemodetectors.map(function(chemodetector) {
			let foodDistances = [],
				foodInverseSquares = [],
				chemodetectorLocation = getPointRotatedFromRadius(cell.location.x, cell.location.y, chemodetector.offset, (cell.orientationBearing + chemodetector.bearing + 360) % 360);

			state.food.forEach(function(food) {
				let distance = distanceFromPointToPoint(food.location.x, food.location.y, chemodetectorLocation.x, chemodetectorLocation.y);

				foodDistances.push(distance);
			});

			chemodetector.previousIntensity = chemodetector.currentIntensity;

			// console.debug(`Current Smell Intensity: ${cell.smell.currentIntensity}`);

			// // I don't know why the following in playing up:
			// let inverseSqaureReducer = (acculmulator, distance) => acculmulator + Math.sqrt(1 / distance);
			// cell.smell.currentIntensity = foodDistances.reduce(inverseSqaureReducer);

			foodInverseSquares = foodDistances.map(distance => 1 / Math.pow(distance, 2));
			chemodetector.currentIntensity = foodInverseSquares.reduce((acculmulator, inverseSquare) => acculmulator + inverseSquare, 0);

			return chemodetector;
		});

		function distanceFromPointToPoint(x1, y1, x2, y2) {
			let diffX,
				diffY;

			diffX = x1 - x2;
			diffY = y1 - y2;

			return getHypotenuseFromXY(diffX, diffY);
		}

		return cell;
	}

	function cellFunctions(cell) {
		if (cell.counsciousnessAchieved === false) {
			unconsciousMode();
		} else if (cell.counsciousnessAchieved === true) {
			consciousMode();
		}

		function unconsciousMode() {
			rememberEatingIfIDid();
			maybeChangeDirectionRandomly();
			setSpeedByTimeSinceFood();

			function rememberEatingIfIDid() {
				if (cell.iGotFood > 0) {
					cell.iGotFood = 0;
					cell.timeOfLastMeal = worldTime;
				}
			}

			function setSpeedByTimeSinceFood() {
				if (cell.knowledge.whenILastAte > config.cell.speeds.speed1.timeThreshhold) {
					cell.desiredSpeed = config.cell.speeds.speed1;
				}
				if (cell.knowledge.whenILastAte > config.cell.speeds.speed2.timeThreshhold) {
					cell.desiredSpeed = config.cell.speeds.speed2;
				}
				if (cell.knowledge.whenILastAte > config.cell.speeds.speed3.timeThreshhold) {
					cell.desiredSpeed = config.cell.speeds.speed3;
				}
			}

			function maybeChangeDirectionRandomly() {
				if (Math.random() > 0.999) {
					cell.desiredOrientationBearing = Math.random() * 360;
				}
			}
		}

		function consciousMode() {
			let activities = {
				moveForwards: function() {
					let diffTolerance = 0.00001,
						lungeTrigger = 0.00055,
						cd0 = cell.chemodetectors[0],
						cd1 = cell.chemodetectors[1],
						movingAwayFromFood = cd0.currentIntensity < cd0.previousIntensity && cd1.currentIntensity < cd1.previousIntensity,
						stuck = cd0.currentIntensity === cd0.previousIntensity && cd1.currentIntensity === cd1.previousIntensity,
						onTopOfFood = cd0.currentIntensity > lungeTrigger && cd1.currentIntensity > lungeTrigger,
						foodClockwise = cd0.currentIntensity + diffTolerance < cd1.currentIntensity,
						foodcounterclockwise = cd0.currentIntensity > cd1.currentIntensity + diffTolerance;

					let clockwiseFactor = (cd1.currentIntensity / cd0.currentIntensity) - 1;
					let counterclockwiseFactor = (cd0.currentIntensity / cd1.currentIntensity) - 1;
					let anglePerFactor = 8;

					if ((movingAwayFromFood || stuck) && cell.knowledge.inhibitReverseTill < worldTime) {
						if (Math.random() >= 0.95) {
							cell.knowledge.activity = 'reverseDirection';
						}
					} else if (onTopOfFood) {
						cell.desiredSpeed = config.cell.speeds.speed3;
					} else if (foodClockwise) {
						// relativeTurn(2);
						relativeTurn(clockwiseFactor * anglePerFactor);
						cell.desiredSpeed = 0;
					} else if (foodcounterclockwise) {
						// relativeTurn(-2);
						relativeTurn(counterclockwiseFactor * anglePerFactor * -1);
						cell.desiredSpeed = 0;
					} else {
						cell.desiredSpeed = config.cell.speeds.speed2;
					}
				},
				reverseDirection: function() {
					let bearingTolerance = 5,
						cdMean = {
							previousIntensity: cell.chemodetectors[0].previousIntensity + cell.chemodetectors[1].previousIntensity / 2,
							currentIntensity: cell.chemodetectors[0].currentIntensity + cell.chemodetectors[1].currentIntensity / 2,
						},
						velocity = {
							bearing: getBearingFromXY(cell.velocity.x, cell.velocity.y),
							speed: getHypotenuseFromXY(cell.velocity.x, cell.velocity.y),
						},
						notPresentlyTurning = cell.knowledge.reverseTo === null,
						turnedPastSmell = cdMean.currentIntensity < cdMean.previousIntensity;

					if (notPresentlyTurning) {
						cell.knowledge.reverseTo = (velocity.bearing + 180) % 360;
						cell.desiredOrientationBearing = cell.knowledge.reverseTo;
						cell.desiredSpeed = 0;
					} else {
						if (bearingWithinTolerance(cell.orientationBearing, cell.knowledge.reverseTo, bearingTolerance)) {
							cell.desiredSpeed = config.cell.speeds.speed3;
						} else {
							cell.desiredSpeed = 0;
							if (turnedPastSmell) {
								cell.knowledge.reverseTo = null;
								cell.knowledge.inhibitReverseTill = worldTime + config.cell.forwardOverrideThreshold;
								cell.knowledge.activity = 'moveForwards';
							}
						}

						if (bearingWithinTolerance(velocity.bearing, cell.knowledge.reverseTo, bearingTolerance)) {
							cell.knowledge.reverseTo = null;
							cell.knowledge.activity = 'moveForwards';
						}
					}
				},
			};

			function relativeTurn(amount) {
				cell.knowledge.lastTurn = (amount + 360) % 360;
				cell.desiredOrientationBearing = (cell.desiredOrientationBearing + amount) % 360;
			}

			if (config.cell.freewill) {
				activities[cell.knowledge.activity]();
			}
		}

		function bearingWithinTolerance(a, b, tolerance) {
			return withinTolerance((a + 360) % 360, (b + 360) % 360, tolerance) ||
				withinTolerance((a + 360) % 360 + 360, (b + 360) % 360, tolerance) ||
				withinTolerance((a + 360) % 360, (b + 360) % 360 + 360, tolerance);
		}

		function withinTolerance(a, b, tolerance) {
			let difference = a - b;
			difference = Math.abs(difference);
			return difference <= tolerance;
		}

		return cell;
	}

	worldTime++;
}

function animateWorld() {
	renderWorld();
	progressWorld();
	window.requestAnimationFrame(animateWorld);
}

setup();
createFoods(100);
createCells(1);
animateWorld();