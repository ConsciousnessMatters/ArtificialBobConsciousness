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
			forwardRegardlessOfSmellThreshold: 15,
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
		actualVelocity: {
			x: 0,
			y: 0,
		},
		desiredBearing: getNewCellDirection(),
		actualBearing: 0,
		timeOfLastMeal: 0,
		iGotFood: 0,
		smell: {
			currentIntensity: 0,
			previousIntensity: 0,
			lastsniff: 0,
		},
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
			chemodetectorLocation = getPointRotatedFromRadius(cell.location.x, cell.location.y, chemodetector.offset, (chemodetector.bearing + cell.actualBearing + 360) % 360);
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
		cell = worldFunctions(cell);

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
			applyVelocityChange(acceleration, cell.desiredBearing);
		}
		applySubstrateVelocityResistance();
		applyVelocitiesToLocations();
		preventOverflow();

		function turnCell() {
			let useClockwiseSolution,
				clockwiseSolution,
				counterclockwiseSolution;

			// Bug present here for spinning and locking.

			cell.actualBearing = cell.desiredBearing;

			if (cell.actualBearing === cell.desiredBearing) {
				return;
			}

			if (cell.desiredBearing < cell.actualBearing) {
				clockwiseSolution = cell.desiredBearing + 360 - cell.actualBearing;
			} else {
				clockwiseSolution = cell.desiredBearing - cell.actualBearing;
			}

			if (cell.desiredBearing > cell.actualBearing) {
				counterclockwiseSolution = cell.desiredBearing - cell.actualBearing + 360;
			} else {
				counterclockwiseSolution = cell.desiredBearing - cell.actualBearing;
			}

			useClockwiseSolution = clockwiseSolution <= Math.abs(counterclockwiseSolution);

			if (useClockwiseSolution) {
				cell.actualBearing = (cell.actualBearing + 5) % 360;
			} else {
				cell.actualBearing = (cell.actualBearing - 5 + 360) % 360;
			}
		}

		function getActualSpeed() {
			return getSpeedFromXY(cell.actualVelocity.x, cell.actualVelocity.y);
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

			cell.actualVelocity.x = cell.actualVelocity.x + vectorComponents.x;
			cell.actualVelocity.y = cell.actualVelocity.y + vectorComponents.y;
		}

		function applySubstrateVelocityResistance() {
			let speed = getActualSpeed(),
				bearing = getBearingFromXY(cell.actualVelocity.x, cell.actualVelocity.y),
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
			cell.location.x = cell.location.x + cell.actualVelocity.x;
			cell.location.y = cell.location.y + cell.actualVelocity.y;
		}

		function preventOverflow() {
			if (cell.location.x > mainCC.canvas.width - config.cell.radius) {
				cell.location.x = mainCC.canvas.width - config.cell.radius;
				if (cell.actualVelocity.x > 0) {
					cell.actualVelocity.x = 0;
				}
			} else if (cell.location.x < config.cell.radius) {
				cell.location.x = config.cell.radius;
				if (cell.actualVelocity.x < 0) {
					cell.actualVelocity.x = 0;
				}
			}

			if (cell.location.y > mainCC.canvas.height - config.cell.radius) {
				cell.location.y = mainCC.canvas.height - config.cell.radius;
				if (cell.actualVelocity.y > 0) {
					cell.actualVelocity.y = 0;
				}
			} else if (cell.location.y < config.cell.radius) {
				cell.location.y = config.cell.radius;
				if (cell.actualVelocity.y < 0) {
					cell.actualVelocity.y = 0;
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
				chemodetectorLocation = getPointRotatedFromRadius(cell.location.x, cell.location.y, chemodetector.offset, (cell.actualBearing + chemodetector.bearing + 360) % 360);

			state.food.forEach(function(food) {
				let distance = distanceFromPointToPoint(food.location.x, food.location.y, chemodetectorLocation.x, chemodetectorLocation.y);

				foodDistances.push(distance);
			});

			chemodetector.previousIntensity = chemodetector.currentIntensity;
			cell.smell.previousIntensity = cell.smell.currentIntensity;

			// console.debug(`Current Smell Intensity: ${cell.smell.currentIntensity}`);

			// // I don't know why the following in playing up:
			// let inverseSqaureReducer = (acculmulator, distance) => acculmulator + Math.sqrt(1 / distance);
			// cell.smell.currentIntensity = foodDistances.reduce(inverseSqaureReducer);

			foodInverseSquares = foodDistances.map(distance => 1 / Math.pow(distance, 2));
			chemodetector.currentIntensity = foodInverseSquares.reduce((acculmulator, inverseSquare) => acculmulator + inverseSquare, 0);
			cell.smell.currentIntensity = chemodetector.currentIntensity;

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
			if_I_Ate_Remember_Eating();
			maybe_Change_Direction_Randomly();
			go_Slow_If_Full__Normal_Speed_When_Sated__And_Fast_When_Hungry();

			function if_I_Ate_Remember_Eating() {
				if (cell.iGotFood > 0) {
					cell.iGotFood = 0;
					cell.timeOfLastMeal = worldTime;
				}
			}

			function go_Slow_If_Full__Normal_Speed_When_Sated__And_Fast_When_Hungry() {
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

			function maybe_Change_Direction_Randomly() {
				if (Math.random() > 0.999) {
					cell.desiredBearing = Math.random() * 360;
					// console.debug('Unconscious random movement occurred.');
				}
			}
		}

		function consciousMode() {
			let freewill = config.cell.freewill;
			let intention = cell.knowledge.intention;
			let sniffing = worldTime < cell.lastsniff + config.cell.speeds.speedSniff.timeThreshhold;

			if (cell.iGotFood > 0) {
				cell.iGotFood = 0;
				cell.timeOfLastMeal = worldTime;
				cell.smell.previousIntensity = 0;
			}


			if (freewill) {
				resumeActivity();
			} else {
				return null;
			}

			function resumeActivity() {
				console.debug(intention);
				switch (intention) {
					case 'stop':
						stop();
						break;
					case 'sniff-step1':
						sniff(1);
						break;
					case 'sniff-step2':
						sniff(2);
						break;
					case 'sniff-step3':
						sniff(3);
						break;
					case 'moveForward':
						moveForwards();
						break;
					default:
						cell.knowledge.forwardInitiatedAt = worldTime;
						moveForwards();
				}
			}

			function stop() {
				cell.knowledge.intention = 'stop';
				let velocity, 
					reverseDirection, 
					tolerance = 10;

				if (cell.knowledge.stopInitiatedAt === null) {
					cell.knowledge.stopInitiatedAt = worldTime;
				}

				velocity = {
					bearing: getBearingFromXY(cell.actualVelocity.x, cell.actualVelocity.y),
					speed: getHypotenuseFromXY(cell.actualVelocity.x, cell.actualVelocity.y),
				};

				reverseDirection = (velocity.bearing + 180) % 360;

				console.debug(velocity, cell);

				if (cell.actualBearing <= reverseDirection + tolerance && cell.actualBearing >= reverseDirection - tolerance) {
					if (velocity.speed > 3) {
						cell.speed = config.cell.speeds.speed3;
					} else if (velocity.speed > 0.5) {
						cell.speed = config.cell.speeds.speed1;
					} else {
						cell.speed = 0;
					}
				} else {
					absoluteTurn(reverseDirection);
				}

				if (cell.actualSpeed <= 0.3) {
					cell.knowledge.stopInitiatedAt = null;
					sniff();
				}
			}

			function sniff(stage) {
				switch (stage) {
					case 1:
					default:
						cell.knowledge.sniff.startingLevel = cell.smell.currentIntensity;
						turnLeftOrRightALittle();
						cell.knowledge.intention = 'sniff-step2';
						break;
					case 2:
						if (cell.desiredBearing == cell.actualBearing) {
							let otherWay;

							if (cell.knowledge.sniff.startingLevel < cell.smell.currentIntensity) {
								cell.knowledge.otherWay = true;
							} else {
								cell.knowledge.otherWay = false;
							}
						}
						cell.knowledge.intention = 'sniff-step3';
						break;
					case 3:
						let turnAngle;

						if (cell.smell.previousIntensity >= cell.smell.currentIntensity) {
							cell.knowledge.otherWay = true;
							cell.knowledge.intention = 'moveForward';
							cell.knowledge.forwardInitiatedAt = worldTime;
						}

						if (cell.knowledge.otherWay) {
							turnAngle = 1 * -1;
							cell.knowledge.otherWay = false;
						} else {
							turnAngle = 1;
						}

						relativeTurn(turnAngle);

						break;
				}

				function turnLeftOrRightALittle() {
					arbitraryDecision(function() {
						relativeTurn(10);
					}, function() {
						relativeTurn(-10);
					});
				}
			}

			function moveForwards() {
				cell.knowledge.intention = 'moveForward';

				if (cell.smell.previousIntensity >= cell.smell.currentIntensity &&
					config.cell.forwardRegardlessOfSmellThreshold < worldTime - cell.knowledge.forwardInitiatedAt
				) {
					stop();
				}

				cell.desiredSpeed = config.cell.speeds.speed2;
			}

			function relativeTurn(amount) {
				cell.knowledge.lastTurn = (amount + 360) % 360;
				cell.desiredBearing = (cell.desiredBearing + amount) % 360;
			}

			function absoluteTurn(amount) {
				cell.knowledge.lastTurn = (cell.desiredBearing - amount + 360) % 360;
				cell.desiredBearing = amount % 360;
			}

			function arbitraryDecision(functionA, functionB) {
				if (Math.random() >= 0.5) {
					functionA();
				} else {
					functionB();
				}
			}
		}

		return cell;
	}

	function worldFunctions(cell) {
		worldTime++;

		return cell;
	}
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