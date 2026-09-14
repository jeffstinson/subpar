export const fuelVehicleGroups = [
  {
    group: "BMW 2 Series / M2",
    vehicles: [
      { id: "f22-m235i", label: "M235i (F22/F23)", chassis: "F22/F23", years: "2014–2016", engine: "N55", tank: 13.7 },
      { id: "f22-m240i", label: "M240i (F22/F23)", chassis: "F22/F23", years: "2017–2021", engine: "B58", tank: 13.7 },
      { id: "g42-m240i", label: "M240i (G42)", chassis: "G42", years: "2022+", engine: "B58", tank: 13.7 },
      { id: "f87-m2", label: "M2 (F87)", chassis: "F87", years: "2016–2018", engine: "N55", tank: 13.7 },
      { id: "f87-m2c", label: "M2 Competition / CS (F87)", chassis: "F87", years: "2019–2021", engine: "S55", tank: 13.7 },
      { id: "g87-m2", label: "M2 (G87)", chassis: "G87", years: "2023+", engine: "S58", tank: 13.7 },
    ],
  },
  {
    group: "BMW 3 Series / M3",
    vehicles: [
      { id: "e9x-335i", label: "335i / 335is (E9X)", chassis: "E90/E91/E92/E93", years: "2007–2013", engine: "N54 / N55", tank: 16.1 },
      { id: "f30-335i", label: "335i (F30/F31)", chassis: "F30/F31", years: "2012–2015", engine: "N55", tank: 15.8 },
      { id: "f30-340i", label: "340i (F30/F31)", chassis: "F30/F31", years: "2016–2019", engine: "B58", tank: 15.8 },
      { id: "g20-m340i", label: "M340i (G20/G21)", chassis: "G20/G21", years: "2020+", engine: "B58 / B58TU", tank: 15.6 },
      { id: "f80-m3", label: "M3 (F80)", chassis: "F80", years: "2015–2018", engine: "S55", tank: 15.8 },
      { id: "g80-m3", label: "M3 (G80/G81)", chassis: "G80/G81", years: "2021+", engine: "S58", tank: 15.6 },
    ],
  },
  {
    group: "BMW 4 Series / M4",
    vehicles: [
      { id: "f32-435i", label: "435i (F32/F33/F36)", chassis: "F32/F33/F36", years: "2014–2016", engine: "N55", tank: 15.8 },
      { id: "f32-440i", label: "440i (F32/F33/F36)", chassis: "F32/F33/F36", years: "2017–2020", engine: "B58", tank: 15.8 },
      { id: "g22-m440i", label: "M440i (G22/G23/G26)", chassis: "G22/G23/G26", years: "2021+", engine: "B58 / B58TU", tank: 15.6 },
      { id: "f82-m4", label: "M4 (F82/F83)", chassis: "F82/F83", years: "2015–2020", engine: "S55", tank: 15.8 },
      { id: "g82-m4", label: "M4 (G82/G83)", chassis: "G82/G83", years: "2021+", engine: "S58", tank: 15.6 },
    ],
  },
  {
    group: "BMW 5 Series / M5",
    vehicles: [
      { id: "g30-540i", label: "540i (G30/G31)", chassis: "G30/G31", years: "2017–2023", engine: "B58", tank: 18.0 },
      { id: "g30-m550i", label: "M550i xDrive (G30)", chassis: "G30", years: "2018–2023", engine: "N63TU", tank: 18.0 },
      { id: "f90-m5", label: "M5 / M5 Competition (F90)", chassis: "F90", years: "2018–2023", engine: "S63TU", tank: 20.1 },
    ],
  },
  {
    group: "BMW X3 / X4",
    vehicles: [
      { id: "g01-x3m40i", label: "X3 M40i (G01)", chassis: "G01", years: "2018–2024", engine: "B58 / B58TU", tank: 17.2 },
      { id: "g02-x4m40i", label: "X4 M40i (G02)", chassis: "G02", years: "2019–2024", engine: "B58 / B58TU", tank: 17.2 },
      { id: "f97-x3m", label: "X3 M / Competition (F97)", chassis: "F97", years: "2020–2024", engine: "S58", tank: 17.2 },
      { id: "f98-x4m", label: "X4 M / Competition (F98)", chassis: "F98", years: "2020–2024", engine: "S58", tank: 17.2 },
    ],
  },
  {
    group: "BMW X5 / X6",
    vehicles: [
      { id: "g05-x540i", label: "X5 xDrive40i (G05)", chassis: "G05", years: "2019+", engine: "B58 / B58TU", tank: 21.9 },
      { id: "g06-x640i", label: "X6 xDrive40i (G06)", chassis: "G06", years: "2020+", engine: "B58 / B58TU", tank: 21.9 },
      { id: "f95-x5m", label: "X5 M / Competition (F95)", chassis: "F95", years: "2020+", engine: "S63TU", tank: 21.9 },
      { id: "f96-x6m", label: "X6 M / Competition (F96)", chassis: "F96", years: "2020+", engine: "S63TU", tank: 21.9 },
    ],
  },
  {
    group: "BMW Z4 / Toyota GR Supra",
    vehicles: [
      { id: "g29-z4m40i", label: "Z4 M40i (G29)", chassis: "G29", years: "2020+", engine: "B58", tank: 13.7 },
      { id: "a90-supra", label: "GR Supra 3.0 (A90/A91)", chassis: "A90/A91", years: "2020+", engine: "B58 / B58TU", tank: 13.7 },
    ],
  },
];

export const fuelVehicles = fuelVehicleGroups.flatMap((group) => group.vehicles.map((vehicle) => ({ ...vehicle, group: group.group })));

export function findFuelVehicle(id) {
  return fuelVehicles.find((vehicle) => vehicle.id === id) || null;
}

export function calculateEthanolBlend({
  tankCapacity,
  currentFuel,
  currentEthanol,
  e85Ethanol,
  pumpEthanol,
  targetEthanol,
}) {
  const tank = Math.max(0, Number(tankCapacity) || 0);
  const current = Math.max(0, Math.min(tank, Number(currentFuel) || 0));
  const remaining = Math.max(0, tank - current);
  const currentFraction = Math.max(0, Math.min(1, (Number(currentEthanol) || 0) / 100));
  const e85Fraction = Math.max(0, Math.min(1, (Number(e85Ethanol) || 0) / 100));
  const pumpFraction = Math.max(0, Math.min(1, (Number(pumpEthanol) || 0) / 100));
  const targetFraction = Math.max(0, Math.min(1, (Number(targetEthanol) || 0) / 100));
  const existingEthanolGallons = current * currentFraction;

  if (!tank || e85Fraction === pumpFraction) {
    return { valid: false, reason: "Check tank capacity and fuel ethanol percentages.", remaining, e85Gallons: 0, pumpGallons: remaining, finalEthanol: currentFraction * 100 };
  }

  const rawE85 = (tank * targetFraction - existingEthanolGallons - remaining * pumpFraction) / (e85Fraction - pumpFraction);
  const minFinal = tank ? ((existingEthanolGallons + remaining * Math.min(e85Fraction, pumpFraction)) / tank) * 100 : 0;
  const maxFinal = tank ? ((existingEthanolGallons + remaining * Math.max(e85Fraction, pumpFraction)) / tank) * 100 : 0;
  const reachable = rawE85 >= -0.0001 && rawE85 <= remaining + 0.0001;
  const e85Gallons = Math.max(0, Math.min(remaining, rawE85));
  const pumpGallons = Math.max(0, remaining - e85Gallons);
  const finalEthanol = tank ? ((existingEthanolGallons + e85Gallons * e85Fraction + pumpGallons * pumpFraction) / tank) * 100 : 0;

  return {
    valid: true,
    reachable,
    reason: reachable ? "" : `Target is outside the achievable E${minFinal.toFixed(1)}–E${maxFinal.toFixed(1)} range when filling this tank to full.`,
    remaining,
    e85Gallons,
    pumpGallons,
    finalEthanol,
    minFinal,
    maxFinal,
  };
}
