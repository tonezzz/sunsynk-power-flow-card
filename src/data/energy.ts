// Autarky / production / consumption energy-balance math, extracted
// verbatim from build-data.ts.

import type { CustomEntity } from '../inverters/dto/custom-entity';
import type { sunsynkPowerFlowCardConfig } from '../types';

export interface EnergyBalanceIn {
	config: sunsynkPowerFlowCardConfig;
	stateDayPVEnergy: CustomEntity;
	totalDayBatteryDischarge: number;
	stateDayLoadEnergy: CustomEntity;
	totalDayBatteryCharge: number;
	totalPV: number;
	batteryPowerTotal: number;
	auxPower: number;
	essentialPower: number;
	nonessentialPower: number;
}

export function calcEnergyBalance(o: EnergyBalanceIn) {
	const { config } = o;
	const {
		stateDayPVEnergy,
		totalDayBatteryDischarge,
		stateDayLoadEnergy,
		totalDayBatteryCharge,
		totalPV,
		batteryPowerTotal,
		auxPower,
		essentialPower,
		nonessentialPower,
	} = o;
	//Autarky in Percent = Home Production / Home Consumption
	//Ratio in Percent = Home Consumption / Home Production
	const productionEnergy = stateDayPVEnergy.toNum() + totalDayBatteryDischarge;
	const consumptionEnergy = stateDayLoadEnergy.toNum() + totalDayBatteryCharge;
	const autarkyEnergy =
		consumptionEnergy != 0
			? Math.max(
					Math.min(
						Math.round((productionEnergy * 100) / consumptionEnergy),
						100,
					),
					0,
				)
			: 0;
	const ratioEnergy =
		productionEnergy != 0
			? Math.max(
					Math.min(
						Math.round((consumptionEnergy * 100) / productionEnergy),
						100,
					),
					0,
				)
			: 0;

	//const productionPower =
	//    totalPV +
	//    Utils.toNum(`${(config.battery.invert_flow === true ? batteryPowerTotal < 0 : batteryPowerTotal > 0) ? Math.abs(batteryPowerTotal) : 0}`) +
	//   Utils.toNum(`${auxPower < 0 ? auxPower * -1 : 0}`);

	const productionPower =
		totalPV +
		(config.battery.invert_flow === true
			? batteryPowerTotal < 0
				? Math.abs(batteryPowerTotal)
				: 0
			: batteryPowerTotal > 0
				? Math.abs(batteryPowerTotal)
				: 0) +
		(auxPower < 0 ? Math.abs(auxPower) : 0);

	//console.log(`Production Data`);
	//console.log(`P_Solar Power:${totalPV}`);
	//console.log(`P_Battery Power: ${(config.battery.invert_flow === true
	//        ? (batteryPowerTotal < 0 ? Math.abs(batteryPowerTotal) : 0)
	//        : (batteryPowerTotal > 0 ? Math.abs(batteryPowerTotal) : 0))}`);
	//console.log(`P_Aux Power:${(auxPower < 0 ? auxPower * -1 : 0)}`);
	//console.log(`Production Total:${productionPower}`);

	//const consumptionPower =
	//    essentialPower +
	//    Math.max(nonessentialPower, 0) +
	//    Utils.toNum(`${auxPower > 0 ? auxPower : 0}`) +
	//    Utils.toNum(`${(config.battery.invert_flow === true ? batteryPowerTotal > 0 : batteryPowerTotal < 0) ? Math.abs(batteryPowerTotal) : 0}`);

	const consumptionPower =
		essentialPower +
		Math.max(nonessentialPower, 0) +
		(auxPower > 0 ? auxPower : 0) +
		(config.battery.invert_flow === true
			? batteryPowerTotal > 0
				? Math.abs(batteryPowerTotal)
				: 0
			: batteryPowerTotal < 0
				? Math.abs(batteryPowerTotal)
				: 0);

	//console.log(`Consumption Data`);
	//console.log(`C_Essential Power:${essentialPower}`);
	//console.log(`C_NonEssential Power:${nonessentialPower}`);
	//console.log(`C_Battery Power:${(config.battery.invert_flow === true
	//    ? (batteryPowerTotal > 0 ? Math.abs(batteryPowerTotal) : 0)
	//    : (batteryPowerTotal < 0 ? Math.abs(batteryPowerTotal) : 0))}`);
	//console.log(`C_Aux Power:${(auxPower > 0 ? auxPower : 0)}`);
	//console.log(`Consumption Total:${consumptionPower}`);

	const autarkyPower =
		consumptionPower != 0
			? Math.max(
					Math.min(Math.round((productionPower * 100) / consumptionPower), 100),
					0,
				)
			: 0;
	const ratioPower =
		productionPower != 0
			? Math.max(
					Math.min(Math.round((consumptionPower * 100) / productionPower), 100),
					0,
				)
			: 0;

	//console.log(`Autarky: ${autarkyPower}`);
	//console.log(`Ratio: ${ratioPower}`);

	return {
		productionEnergy,
		consumptionEnergy,
		autarkyEnergy,
		ratioEnergy,
		autarkyPower,
		ratioPower,
		productionPower,
		consumptionPower,
	};
}
