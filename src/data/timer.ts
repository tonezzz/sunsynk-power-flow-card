// Inverter charge-program ("timer") resolution extracted from build-data.ts.
// Returns the InverterSettings consumed by battery/inverter renderers.

import type { SunsynkPowerFlowCard } from '../index';
import type { CustomEntity } from '../inverters/dto/custom-entity';
import type { InverterSettings, sunsynkPowerFlowCardConfig } from '../types';

export function resolveInverterProg(
	card: SunsynkPowerFlowCard,
	config: sunsynkPowerFlowCardConfig,
	stateUseTimer: CustomEntity,
	enableTimer: string | boolean,
	batteryShutdown: number,
): InverterSettings {
	//Timer entities
	const prog1 = {
		time: card.getEntity('entities.prog1_time', {
			state: config.entities.prog1_time ?? '',
		}),
		capacity: card.getEntity('entities.prog1_capacity', {
			state: config.entities.prog1_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog1_charge', {
			state: config.entities.prog1_charge ?? '',
		}),
	};
	const prog2 = {
		time: card.getEntity('entities.prog2_time', {
			state: config.entities.prog2_time ?? '',
		}),
		capacity: card.getEntity('entities.prog2_capacity', {
			state: config.entities.prog2_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog2_charge', {
			state: config.entities.prog2_charge ?? '',
		}),
	};
	const prog3 = {
		time: card.getEntity('entities.prog3_time', {
			state: config.entities.prog3_time ?? '',
		}),
		capacity: card.getEntity('entities.prog3_capacity', {
			state: config.entities.prog3_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog3_charge', {
			state: config.entities.prog3_charge ?? '',
		}),
	};
	const prog4 = {
		time: card.getEntity('entities.prog4_time', {
			state: config.entities.prog4_time ?? '',
		}),
		capacity: card.getEntity('entities.prog4_capacity', {
			state: config.entities.prog4_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog4_charge', {
			state: config.entities.prog4_charge ?? '',
		}),
	};
	const prog5 = {
		time: card.getEntity('entities.prog5_time', {
			state: config.entities.prog5_time ?? '',
		}),
		capacity: card.getEntity('entities.prog5_capacity', {
			state: config.entities.prog5_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog5_charge', {
			state: config.entities.prog5_charge ?? '',
		}),
	};
	const prog6 = {
		time: card.getEntity('entities.prog6_time', {
			state: config.entities.prog6_time ?? '',
		}),
		capacity: card.getEntity('entities.prog6_capacity', {
			state: config.entities.prog6_capacity ?? '',
		}),
		charge: card.getEntity('entities.prog6_charge', {
			state: config.entities.prog6_charge ?? '',
		}),
	};

	const inverterProg: InverterSettings = {
		capacity: batteryShutdown,
		entityID: '',
	};

	switch (true) {
		case stateUseTimer.state === 'off':
		case !enableTimer:
		case !config.entities.prog1_time:
		case !config.entities.prog2_time:
		case !config.entities.prog3_time:
		case !config.entities.prog4_time:
		case !config.entities.prog5_time:
		case !config.entities.prog6_time:
			inverterProg.show = false;
			break;

		default: {
			inverterProg.show = true;

			const timer_now = new Date(); // Create a new Date object representing the current time
			//console.log(`Current date and time: ${timer_now.toLocaleString()}`);

			assignInverterProgramBasedOnTime(timer_now);

			function assignInverterProgramBasedOnTime(timer_now: Date) {
				const progTimes: { start: Date; end: Date }[] = [];

				// Populate the progTimes array with Date objects based on the current time
				[prog1, prog2, prog3, prog4, prog5, prog6].forEach((prog, index) => {
					if (!prog || !prog.time || !prog.time.state) {
						console.error(
							`Program ${index + 1} is not defined or has no valid time.`,
						);
						return; // Skip this program
					}

					const [hours, minutes] = prog.time.state
						.split(':')
						.map((item) => parseInt(item, 10));
					const progStartTime = new Date(timer_now.getTime());
					progStartTime.setHours(hours);
					progStartTime.setMinutes(minutes);

					// Determine the end time for each program (next program's start time)
					const nextIndex =
						(index + 1) % [prog1, prog2, prog3, prog4, prog5, prog6].length;
					const nextProg = [prog1, prog2, prog3, prog4, prog5, prog6][
						nextIndex
					];
					const progEndTime =
						nextProg && nextProg.time && nextProg.time.state
							? new Date(timer_now.getTime())
							: new Date(timer_now.getTime());

					if (nextProg && nextProg.time && nextProg.time.state) {
						const [nextHours, nextMinutes] = nextProg.time.state
							.split(':')
							.map((item) => parseInt(item, 10));
						progEndTime.setHours(nextHours);
						progEndTime.setMinutes(nextMinutes);
					} else {
						console.warn(
							`Next program ${nextIndex + 1} is not defined or has no valid time.`,
						);
					}

					//console.log(`Program ${index + 1} time (before adjustment): Start: ${progStartTime.toLocaleString()}, End: ${progEndTime.toLocaleString()}`);

					// Add to the progTimes array
					progTimes[index] = { start: progStartTime, end: progEndTime };
				});

				// Adjust times for the next day if necessary
				adjustProgramTimes(progTimes, timer_now);

				// Time comparison logic to determine the active program
				for (let i = 0; i < progTimes.length; i++) {
					const { start: currentProgStartTime, end: currentProgEndTime } =
						progTimes[i];

					// Check for normal case (start < end)
					if (
						currentProgStartTime <= timer_now &&
						timer_now < currentProgEndTime
					) {
						//console.log(`Assigning Program ${i + 1}`);
						assignInverterProgValues(
							[prog1, prog2, prog3, prog4, prog5, prog6][i],
							config.entities[`prog${i + 1}_charge`],
						);
						break; // Exit once the correct program is assigned
					}
					// Check for wrap-around case (start > end)
					else if (currentProgStartTime > currentProgEndTime) {
						if (
							timer_now >= currentProgStartTime ||
							timer_now < currentProgEndTime
						) {
							//console.log(`Assigning Program ${i + 1} (wrap-around)`);
							assignInverterProgValues(
								[prog1, prog2, prog3, prog4, prog5, prog6][i],
								config.entities[`prog${i + 1}_charge`],
							);
							break; // Exit once the correct program is assigned
						}
					}
				}
			}

			function adjustProgramTimes(
				progTimes: { start: Date; end: Date }[],
				timer_now: Date,
			) {
				const currentTime = timer_now.getTime();
				// Adjust for times that roll over into the next day
				progTimes.forEach((progTime) => {
					// If the start time is before current time and the end time is after the current time, adjust to the next day
					if (
						progTime.start.getTime() < currentTime &&
						progTime.end.getTime() < currentTime
					) {
						progTime.start.setDate(progTime.start.getDate() + 1);
						progTime.end.setDate(progTime.end.getDate() + 1);
						//console.log(`Adjusted Program ${index + 1} to next day: Start: ${progTime.start.toLocaleString()}, End: ${progTime.end.toLocaleString()}`);
					}
				});
				return progTimes;
			}

			function assignInverterProgValues(prog, entityID) {
				if (
					prog.charge.state === 'No Grid or Gen' ||
					prog.charge.state === '0' ||
					prog.charge.state === 'off'
				) {
					inverterProg.charge = 'none';
				} else {
					inverterProg.charge = 'both';
				}

				inverterProg.capacity = parseInt(prog.capacity.state);
				inverterProg.entityID = entityID;
			}

			break;
		}
	}

	return inverterProg;
}
