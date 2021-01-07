'use strict';

let mainCC,
	foodCC,
	state,
	config, 
	entityId = 1,
	worldTime = 0,
	scaleFactor = window.devicePixelRatio || 1;

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
		creatures: [],
		smellIntensityCircles: [],
		renderFoodCanvas: true,
		renderSmellCircles: true,
	};
	config = {
		creature: {
			locomotion: true,
			smell: true,
			freewill: true, // Program behaviour changes if conscious output (self determination) is switched to false
			colour: 'rgba(204, 0, 204, 0.66)',
			radius: 50 * scaleFactor,
			mass: 5,
			speeds: {
				speed0: {
					speed: 0,
					force: 0,
				},
				speed1: {
					timeThreshhold: 0,
					speed: 0.25 * scaleFactor,
					force: 0.02 * scaleFactor,
				},
				speed2: {
					timeThreshhold: 100,
					speed: 1 * scaleFactor,
					force: 0.08 * scaleFactor,
				},
				speed3: {
					timeThreshhold: 300,
					speed: 3 * scaleFactor,
					force: 0.32 * scaleFactor,
				},
				speedSniff: {
					timeThreshhold: 3,
					speed: 24 * scaleFactor,
					force: 1 * scaleFactor,
				}
			},
			forwardOverrideThreshold: 60,
			chemoreceptors: {
				colour: '#008',
				radius: 5 * scaleFactor,
			},
		},
		food: {
			colour: '#0c0',
			radius: 10 * scaleFactor,
			iSLScalingFactor: 1,
		},
		meal: {
			swallowTime: 240,
		},
		smellIntensityCircles: {
			visibilityFactor: 10 * scaleFactor,
			stepSize: 10 * scaleFactor,
			limitDistance: 0 * scaleFactor,
		},
	};

	mainCC.canvas.width = mainCC.canvas.scrollWidth * scaleFactor;
	mainCC.canvas.height = mainCC.canvas.scrollHeight * scaleFactor;
	foodCC.canvas.width = mainCC.canvas.scrollWidth * scaleFactor;
	foodCC.canvas.height = mainCC.canvas.scrollHeight * scaleFactor;

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

function createCreatures(quantity) {
	while (quantity > 0) {
		createCreature();
		quantity--;
	}
}

function createCreature() {
	state.creatures.push({
		entityId: getEntityId(),
		location: {
			x: getNewCreatureLocationX(),
			y: getNewCreatureLocationY(),
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
		desiredbearing: getNewCreatureDirection(),
		bearing: 0,
		angularMomentum: 0,
		timeOfLastMeal: 0,
		iGotFood: 0,
		chemoreceptors: [
			{
				currentIntensity: 0,
				previousIntensity: 0,
				bearing: -45,
				offset: config.creature.radius,
			},
			{
				currentIntensity: 0,
				previousIntensity: 0,
				bearing: 45,
				offset: config.creature.radius,
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
		meals: [],
	});

	function getNewCreatureLocationX() {
		return Math.random() * (mainCC.canvas.width - config.creature.radius * 2) + config.creature.radius;
	}

	function getNewCreatureLocationY() {
		return Math.random() * (mainCC.canvas.height - config.creature.radius * 2) + config.creature.radius;
	}

	function getNewCreatureDirection() {
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
			});
			foodCC.globalAlpha = 1;
		});

		state.renderFoodCanvas = false;
	}

	mainCC.drawImage(foodCC.canvas, 0, 0);

	state.creatures.forEach(function(creature) {
		let chemoreceptorLocation;

		creature.meals = creature.meals.map(function(meal) {
			meal = getMealDrawingInformation(meal, creature);
			if (meal.scale > 0) {
				mainCC.beginPath();
				mainCC.fillStyle = config.food.colour;
				mainCC.arc(meal.location.x, meal.location.y, meal.radius * meal.scale, 0, Math.PI * 2, true);
				mainCC.fill();
			}
			return meal;
		});
	
		// mainCC.globalCompositeOperation = "screen";
		mainCC.beginPath();
		mainCC.fillStyle = config.creature.colour;
		mainCC.arc(creature.location.x, creature.location.y, config.creature.radius, 0, Math.PI * 2, true);
		mainCC.fill();

		// mainCC.globalCompositeOperation = "source-over";
		creature.chemoreceptors.forEach(function(chemoreceptor) {
			chemoreceptorLocation = getPointRotatedFromRadius(creature.location.x, creature.location.y, chemoreceptor.offset, (chemoreceptor.bearing + creature.bearing + 360) % 360);
			mainCC.beginPath();
			mainCC.fillStyle = config.creature.chemoreceptors.colour;
			mainCC.arc(chemoreceptorLocation.x, chemoreceptorLocation.y, config.creature.chemoreceptors.radius, 0, Math.PI * 2, true);
			mainCC.fill();
		});
	});

	function getMealDrawingInformation(meal, creature) {
		let max = config.creature.radius + config.food.radius;
		let min = 0;
		let timeSinceEaten = worldTime - meal.eatenAt;
		let swallowProgress = Math.min(timeSinceEaten / config.meal.swallowTime, 1);

		meal.radius = config.food.radius;
		meal.radialOffset = getMealDistanceFromCentre();
		meal.location = getMealLocation();
		meal.scale = getMealScalingFactor();

		function getMealDistanceFromCentre() {
			return max - (min + (max * swallowProgress));
		}

		function getMealLocation() {
			return getPointRotatedFromRadius(creature.location.x, creature.location.y, meal.radialOffset, meal.bearing + creature.bearing);
		}

		function getMealScalingFactor() {
			return Math.min((1 - swallowProgress) * 2, 1);
		}

		return meal;
	}
}


function getPointRotatedFromRadius(ox, oy, r, bearing) {
	return {
		x: Math.sin(degreesToRadians(bearing)) * r + ox,
		y: Math.cos(degreesToRadians(bearing)) * r + oy,
	};
}


function progressWorld() {
	state.creatures = state.creatures.map(function(creature) {
		creature = moveCreature(creature);
		creature = collisionDetection(creature);
		creature = calculateSmellAtCreature(creature);
		creature = creatureFunctions(creature);

		return creature;
	});

	function moveCreature(creature) {
		let motiveForce,
			acceleration;

		turnCreature();
		creature.actualSpeed = getActualSpeed();
		motiveForce = getMotiveForce();
		acceleration = getAcceleration(motiveForce, config.creature.mass);

		if (config.creature.locomotion) {
			applyVelocityChange(acceleration, creature.desiredbearing);
		}
		applySubstrateVelocityResistance();
		applyVelocitiesToLocations();
		preventOverflow();

		function turnCreature() {
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

			if (creature.bearing === creature.desiredbearing) {
				return;
			}

			let previousAngularMomentum = creature.angularMomentum;

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
					angularAccelerationNeed = queryAngularAccelerationNeed(creature.angularMomentum);

				if (angularDeceleratioNeed === brake) {
					decelerateAngularVelocity();
				} else if (angularDeceleratioNeed === easeOff) {
					coast();
				} else if (angularAccelerationNeed) {
					accelerateAngularVelocity(clockwise);
				}
			}

			function decelerateAngularVelocity() {
				if (creature.angularMomentum > 0) {
					creature.angularMomentum = creature.angularMomentum - angularMomentumStepSize;
				} else {
					creature.angularMomentum = creature.angularMomentum + angularMomentumStepSize;
				}
			}

			function coast() {
				return null;
			}

			function accelerateAngularVelocity(clockwise) {
				if (clockwise) {
					creature.angularMomentum = creature.angularMomentum + angularMomentumStepSize;
				} else {
					creature.angularMomentum = creature.angularMomentum - angularMomentumStepSize;
				}
			}

			function queryAngularAccelerationNeed(angularMomentum) {
				return Math.abs(angularMomentum) < maxAngularMomentum;
			}

			function queryAngularDecelerationNeed(turnRemaining) {
				let angularMomentum = Math.abs(creature.angularMomentum),
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
				if (bearingWithinTolerance(creature.desiredbearing, creature.bearing, 1) && creature.angularMomentum <= 0.5) {
					creature.bearing = creature.desiredbearing;
					creature.angularMomentum = 0;
				}
				creature.bearing = (creature.bearing + creature.angularMomentum + 360) % 360;
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
					if (creature.desiredbearing < creature.bearing) {
						return (creature.desiredbearing + 360) - creature.bearing;
					} else {
						return creature.desiredbearing - creature.bearing;
					}
				} else {
					if (creature.desiredbearing > creature.bearing) {
						return creature.desiredbearing - (creature.bearing + 360);
					} else {
						return creature.desiredbearing - creature.bearing;
					}
				}
			}

			function relativeTurn(amount) {
				creature.knowledge.lastTurn = (amount + 360) % 360;
				creature.desiredbearing = (creature.desiredbearing + amount) % 360;
			}
		}

		function getActualSpeed() {
			return getSpeedFromXY(creature.velocity.x, creature.velocity.y);
		}

		function getSpeedFromXY(x, y) {
			return getHypotenuseFromXY(x, y);
		}

		function getMotiveForce() {
			if (creature.desiredSpeed.speed > creature.actualSpeed) {
				return creature.desiredSpeed.force;
			} else {
				return 0;
			}
		}

		function getAcceleration(force, mass) {
			return force / mass;
		}

		function applyVelocityChange(accelerationForFrame, bearing) {
			let vectorComponents = getPointRotatedFromRadius(0, 0, accelerationForFrame, bearing);

			creature.velocity.x = creature.velocity.x + vectorComponents.x;
			creature.velocity.y = creature.velocity.y + vectorComponents.y;
		}

		function applySubstrateVelocityResistance() {
			let speed = getActualSpeed(),
				bearing = getBearingFromXY(creature.velocity.x, creature.velocity.y),
				counterBearing = (bearing + 180) % 360,
				resistanceForce;

			resistanceForce = getResistanceDeceleration(speed);
			acceleration = getAcceleration(resistanceForce, config.creature.mass);
			applyVelocityChange(acceleration, counterBearing);

			function getResistanceDeceleration(speed) {
				return Math.pow(speed, 2.2) / 40;
			}
		}

		function applyVelocitiesToLocations() {
			creature.location.x = creature.location.x + creature.velocity.x;
			creature.location.y = creature.location.y + creature.velocity.y;
		}

		function preventOverflow() {
			if (creature.location.x > mainCC.canvas.width - config.creature.radius) {
				creature.location.x = mainCC.canvas.width - config.creature.radius;
				if (creature.velocity.x > 0) {
					creature.velocity.x = 0;
				}
			} else if (creature.location.x < config.creature.radius) {
				creature.location.x = config.creature.radius;
				if (creature.velocity.x < 0) {
					creature.velocity.x = 0;
				}
			}

			if (creature.location.y > mainCC.canvas.height - config.creature.radius) {
				creature.location.y = mainCC.canvas.height - config.creature.radius;
				if (creature.velocity.y > 0) {
					creature.velocity.y = 0;
				}
			} else if (creature.location.y < config.creature.radius) {
				creature.location.y = config.creature.radius;
				if (creature.velocity.y < 0) {
					creature.velocity.y = 0;
				}
			}
		}

		return creature;
	}

	function collisionDetection(creature) {
		let foodOfInterest, 
			foodOfCollisioniness, 
			collisionDistance, 
			collisionEntityIds = [];

		collisionDistance = config.creature.radius + config.food.radius;

		foodOfInterest = state.food.filter(function(food) {
			let distanceX = Math.abs(food.location.x - creature.location.x),
				distanceY = Math.abs(food.location.y - creature.location.y);

			return distanceX <= collisionDistance && distanceY <= collisionDistance;
		});

		foodOfCollisioniness = foodOfInterest.filter(function(food) {
			let distanceX = Math.abs(food.location.x - creature.location.x),
				distanceY = Math.abs(food.location.y - creature.location.y),
				distanceH = Math.sqrt(Math.pow(distanceX, 2) +  Math.pow(distanceY, 2));

			return distanceH <= collisionDistance;
		});

		foodOfCollisioniness.forEach(function(food) {
			let bearing = getBearingFromXY(food.location.x - creature.location.x, food.location.y - creature.location.y);

			collisionEntityIds.push(food.entityId);
			creature.meals.push({
				bearing: (bearing - creature.bearing + 360) % 360,
				entityId: food.entityId,
				eatenAt: worldTime,
			});
		});

		state.food = state.food.filter(function(food) {
			return !collisionEntityIds.includes(food.entityId);
		});

		// Cleanup required below

		if (foodOfCollisioniness.length > 0) {
			state.renderFoodCanvas = true;
		}
		creature.iGotFood = foodOfCollisioniness.length;
		creature.counsciousnessAchieved = config.creature.smell;
		creature.knowledge.whenILastAte = worldTime - creature.timeOfLastMeal;

		return creature;
	}

	function calculateSmellAtCreature(creature) {
		creature.chemoreceptors = creature.chemoreceptors.map(function(chemoreceptor) {
			let foodDistances = [],
				foodInverseSquares = [],
				chemoreceptorLocation = getPointRotatedFromRadius(creature.location.x, creature.location.y, chemoreceptor.offset, (creature.bearing + chemoreceptor.bearing + 360) % 360);

			state.food.forEach(function(food) {
				let distance = distanceFromPointToPoint(food.location.x, food.location.y, chemoreceptorLocation.x, chemoreceptorLocation.y);

				foodDistances.push(distance);
			});

			chemoreceptor.previousIntensity = chemoreceptor.currentIntensity;

			foodInverseSquares = foodDistances.map(distance => 1 / Math.pow(distance, 2));
			chemoreceptor.currentIntensity = foodInverseSquares.reduce((acculmulator, inverseSquare) => acculmulator + inverseSquare, 0);

			return chemoreceptor;
		});

		function distanceFromPointToPoint(x1, y1, x2, y2) {
			let diffX,
				diffY;

			diffX = x1 - x2;
			diffY = y1 - y2;

			return getHypotenuseFromXY(diffX, diffY);
		}

		return creature;
	}

	function creatureFunctions(creature) {
		if (creature.counsciousnessAchieved === false) {
			unconsciousMode();
		} else if (creature.counsciousnessAchieved === true) {
			consciousMode();
		}

		function unconsciousMode() {
			rememberEatingIfIDid();
			maybeChangeDirectionRandomly();
			setSpeedByTimeSinceFood();

			function rememberEatingIfIDid() {
				if (creature.iGotFood > 0) {
					creature.iGotFood = 0;
					creature.timeOfLastMeal = worldTime;
				}
			}

			function setSpeedByTimeSinceFood() {
				if (creature.knowledge.whenILastAte > config.creature.speeds.speed1.timeThreshhold) {
					creature.desiredSpeed = config.creature.speeds.speed1;
				}
				if (creature.knowledge.whenILastAte > config.creature.speeds.speed2.timeThreshhold) {
					creature.desiredSpeed = config.creature.speeds.speed2;
				}
				if (creature.knowledge.whenILastAte > config.creature.speeds.speed3.timeThreshhold) {
					creature.desiredSpeed = config.creature.speeds.speed3;
				}
			}

			function maybeChangeDirectionRandomly() {
				if (Math.random() > 0.999) {
					creature.desiredbearing = Math.random() * 360;
				}
			}
		}

		function consciousMode() {
			let activities = {
				moveForwards: function() {
					let diffTolerance = 0.00001,
						lungeTrigger = 0.00055,
						cd0 = creature.chemoreceptors[0],
						cd1 = creature.chemoreceptors[1],
						movingAwayFromFood = cd0.currentIntensity + cd1.currentIntensity < cd0.previousIntensity + cd1.previousIntensity,
						stuck = cd0.currentIntensity === cd0.previousIntensity && cd1.currentIntensity === cd1.previousIntensity,
						onTopOfFood = cd0.currentIntensity > lungeTrigger && cd1.currentIntensity > lungeTrigger,
						foodClockwise = cd0.currentIntensity + diffTolerance < cd1.currentIntensity,
						foodcounterclockwise = cd0.currentIntensity > cd1.currentIntensity + diffTolerance;

					let clockwiseFactor = (cd1.currentIntensity / cd0.currentIntensity) - 1;
					let counterclockwiseFactor = (cd0.currentIntensity / cd1.currentIntensity) - 1;
					let anglePerFactor = 8;

					if ((movingAwayFromFood || stuck) && creature.knowledge.inhibitReverseTill < worldTime) {
						if (Math.random() >= 0.95) {
							creature.knowledge.activity = 'reverseDirection';
						}
					} else if (onTopOfFood) {
						creature.desiredSpeed = config.creature.speeds.speed3;
					} else if (foodClockwise) {
						relativeTurn(clockwiseFactor * anglePerFactor);
						creature.desiredSpeed = config.creature.speeds.speed1;
					} else if (foodcounterclockwise) {
						relativeTurn(counterclockwiseFactor * anglePerFactor * -1);
						creature.desiredSpeed = config.creature.speeds.speed1;
					} else {
						creature.desiredSpeed = config.creature.speeds.speed2;
					}
				},
				reverseDirection: function() {
					let bearingTolerance = 10,
						cdMean = {
							previousIntensity: creature.chemoreceptors[0].previousIntensity + creature.chemoreceptors[1].previousIntensity / 2,
							currentIntensity: creature.chemoreceptors[0].currentIntensity + creature.chemoreceptors[1].currentIntensity / 2,
						},
						velocity = {
							bearing: getBearingFromXY(creature.velocity.x, creature.velocity.y),
							speed: getHypotenuseFromXY(creature.velocity.x, creature.velocity.y).toFixed(3),
						},
						notPresentlyTurning = creature.knowledge.reverseTo === null,
						turnedPastSmell = cdMean.currentIntensity < cdMean.previousIntensity;

					if (notPresentlyTurning) {
						if (velocity.speed > 0) {
							creature.knowledge.reverseTo = (velocity.bearing + 180) % 360;
						} else {
							creature.knowledge.reverseTo = (creature.bearing + 180) % 360;
						}

						creature.desiredbearing = creature.knowledge.reverseTo;
						creature.desiredSpeed = 0;
					} else {
						if (bearingWithinTolerance(creature.bearing, creature.knowledge.reverseTo, bearingTolerance)) {
							creature.desiredSpeed = config.creature.speeds.speed3;
							creature.knowledge.activity = 'moveForwards';
						} else {
							creature.desiredSpeed = 0;
							if (turnedPastSmell) {
								creature.knowledge.reverseTo = null;
								creature.knowledge.inhibitReverseTill = worldTime + config.creature.forwardOverrideThreshold;
								creature.desiredbearing = creature.bearing;
								creature.knowledge.activity = 'moveForwards';
							}
						}

						if (bearingWithinTolerance(velocity.bearing, creature.knowledge.reverseTo, bearingTolerance)) {
							creature.knowledge.reverseTo = null;
							creature.knowledge.activity = 'moveForwards';
						}
					}
				},
			};

			function rememberEatingIfIDid() {
				if (creature.iGotFood > 0) {
					creature.iGotFood = 0;
					creature.chemoreceptors[0].previousIntensity = 0;
					creature.chemoreceptors[1].previousIntensity = 0;
					creature.timeOfLastMeal = worldTime;
				}
			}

			function relativeTurn(amount) {
				creature.knowledge.lastTurn = (amount + 360) % 360;
				creature.desiredbearing = (creature.desiredbearing + amount) % 360;
			}

			rememberEatingIfIDid();
			if (config.creature.freewill) {
				activities[creature.knowledge.activity]();
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

		return creature;
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
createCreatures(1);
animateWorld();