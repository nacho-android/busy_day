import type { LocationDefinition, LocationId, NpcAmbientDefinition, NpcPlacement, Point } from '../types/game';

const PERSPECTIVE = { farY: 120, nearY: 650, farScale: 0.78, nearScale: 1.15 } as const;
// The Tea Room is viewed from a notably higher camera than the facility rooms.
// Its steeper scale curve keeps the upper-right doorway compact while allowing
// the foreground social group to read at the same visual weight as other rooms.
const TEA_ROOM_PERSPECTIVE = { farY: 205, nearY: 620, farScale: 0.62, nearScale: 1.12 } as const;
const BOUNDS = { x: 55, y: 105, width: 1170, height: 565 } as const;

const idle = (reaction: NpcAmbientDefinition['reaction'] = 'wave'): NpcAmbientDefinition => ({ mode: 'idle', awarenessRadius: 104, reaction });
const patrol = (waypoints: readonly Point[], reaction: NpcAmbientDefinition['reaction'] = 'wave', speed = 34): NpcAmbientDefinition => ({
  mode: 'patrol', waypoints, speed, pauseMs: 1100, awarenessRadius: 112, reaction,
});
const npc = (
  id: string,
  name: string,
  role: string,
  x: number,
  y: number,
  line: string,
  visualId = id,
  ambient: NpcAmbientDefinition = idle(),
): NpcPlacement => ({ id, name, role, x, y, line, visualId, ambient });

export const LOCATIONS: Record<LocationId, LocationDefinition> = {
  teaRoom: {
    id: 'teaRoom', name: 'Tea Room', subtitle: 'Optimism on the board', theme: 'social', backgroundKey: 'teaRoom', bounds: BOUNDS, music: 'facility', perspective: TEA_ROOM_PERSPECTIVE,
    spawns: [
      { id: 'start', x: 260, y: 510, facing: 'away' },
      { id: 'fromHall', x: 1005, y: 385, facing: 'toward' },
    ],
    exits: [
      { id: 'tea_to_hall', label: 'Main Hallway', x: 975, y: 245, width: 65, height: 95, destination: 'mainHall', destinationSpawn: 'fromTea', facing: 'away', portal: { target: { x: 1005, y: 205 }, durationMs: 430, fadeFrom: .62 } },
    ],
    obstacles: [
      { id: 'tea_table', x: 390, y: 270, width: 370, height: 205 },
      { id: 'kitchen', x: 350, y: 135, width: 240, height: 145 },
      { id: 'left_service_shelf', x: 70, y: 315, width: 190, height: 155 },
      { id: 'right_service_shelf', x: 1105, y: 350, width: 120, height: 180 },
    ],
    interactions: [
      { id: 'shift_board', label: 'Shift board', verb: 'Use', x: 715, y: 245, radius: 88, holdMs: 700, prop: 'board' },
      { id: 'tea_kettle', label: 'Tea-room kettle', verb: 'Inspect', x: 230, y: 380, radius: 82, optionalLine: 'The kettle clicks off with the confidence of someone who has completed their only task.', prop: 'machine' },
      { id: 'early_coffee', label: 'Coffee machine', verb: 'Use', x: 230, y: 445, radius: 82, optionalLine: 'The machine displays: REWARD LOCKED UNTIL MORALE IMPROVES.', prop: 'coffee' },
    ],
    npcs: [
      npc('sally', 'Sally', 'Cardiologist', 820, 510, 'Morning. The board is already optimistic. Grab the cart and outrun reality.', 'sally', patrol([{ x: 820, y: 510 }, { x: 1030, y: 510 }])),
      npc('james', 'James', 'PI', 560, 520, 'Leadership update: I am observing with concern and excellent posture.'),
      npc('eddy', 'Eddy', 'PI', 670, 520, 'A smooth afternoon would be nice. Purely as a novelty.'),
      npc('pierre', 'Pierre', 'PI', 770, 520, 'The facility runs on precision, improvisation, and thinly veiled panic.'),
    ],
  },

  mainHall: {
    id: 'mainHall', name: 'Main Hallway', subtitle: 'Every route is urgent', theme: 'corridor', backgroundKey: 'facilityHub', bounds: BOUNDS, music: 'facility', perspective: PERSPECTIVE,
    spawns: [
      { id: 'fromTea', x: 200, y: 340, facing: 'toward' }, { id: 'fromFeed', x: 425, y: 275, facing: 'toward' },
      { id: 'fromBaboon', x: 640, y: 260, facing: 'toward' }, { id: 'fromSheep', x: 865, y: 280, facing: 'toward' },
      { id: 'fromPig', x: 1095, y: 350, facing: 'toward' }, { id: 'fromPrep', x: 350, y: 620, facing: 'away' },
      { id: 'fromCar', x: 925, y: 620, facing: 'away' },
    ],
    exits: [
      { id: 'hall_to_tea', label: 'Tea Room', x: 155, y: 245, width: 80, height: 75, destination: 'teaRoom', destinationSpawn: 'fromHall', facing: 'away', portal: { target: { x: 200, y: 205 }, fadeFrom: .56 } },
      { id: 'hall_to_feed', label: 'Feed Store', x: 385, y: 180, width: 75, height: 70, destination: 'feedStore', destinationSpawn: 'fromHall', facing: 'away', portal: { target: { x: 425, y: 145 }, fadeFrom: .56 } },
      { id: 'hall_to_baboon', label: 'Baboon Wing', x: 600, y: 155, width: 80, height: 75, destination: 'baboonWing', destinationSpawn: 'fromHall', facing: 'away', portal: { target: { x: 640, y: 115 }, fadeFrom: .56 } },
      { id: 'hall_to_sheep', label: 'Sheep & Scales', x: 825, y: 180, width: 75, height: 75, destination: 'sheepScales', destinationSpawn: 'fromHall', facing: 'away', portal: { target: { x: 865, y: 145 }, fadeFrom: .56 } },
      { id: 'hall_to_pig', label: 'Pig Housing', x: 1055, y: 245, width: 75, height: 80, destination: 'pigHousing', destinationSpawn: 'fromHall', facing: 'away', portal: { target: { x: 1095, y: 210 }, fadeFrom: .56 } },
      { id: 'hall_to_prep', label: 'Procedure Prep', x: 285, y: 650, width: 135, height: 20, destination: 'prepRoom', destinationSpawn: 'fromHall', facing: 'toward', portal: { target: { x: 350, y: 718 }, durationMs: 470, fadeFrom: .62 } },
      { id: 'hall_to_car', label: 'Car Park', x: 855, y: 650, width: 145, height: 20, destination: 'carPark', destinationSpawn: 'fromHall', facing: 'toward', portal: { target: { x: 925, y: 718 }, durationMs: 470, fadeFrom: .62 }, requiredFlag: 'procedureComplete', lockedLine: 'The loading gate stays locked until cath signs off the procedure.' },
    ],
    obstacles: [
      { id: 'hall_route_console', x: 515, y: 325, width: 105, height: 80 },
      { id: 'hall_hay_cart', x: 700, y: 465, width: 150, height: 95 },
    ],
    interactions: [
      { id: 'route_console', label: 'Route-control console', verb: 'Operate', x: 565, y: 400, radius: 82, holdMs: 900, requiresFlag: 'boardChecked', missingFlagLine: 'Read Sally’s board before rewriting the building’s idea of where anything lives.', prop: 'machine' },
      { id: 'hall_map', label: 'Facility map', verb: 'Inspect', x: 520, y: 300, radius: 78, optionalLine: 'The YOU ARE HERE arrow has been moved twice and is now expressing uncertainty.', prop: 'board' },
      { id: 'hay_cart', label: 'Hay obstruction', verb: 'Inspect', x: 775, y: 535, radius: 82, optionalLine: 'A mobile haystack is blocking exactly the amount of corridor required by policy.', prop: 'cart' },
    ],
    npcs: [
      npc('ross', 'Ross', 'Welfare', 650, 405, 'Quick question. Have you considered the full philosophical meaning of corridor etiquette?'),
      npc('dhanya', 'Dhanya', 'Researcher', 300, 405, 'Please tell me the car park situation is a rumour.', 'dhanya', patrol([{ x: 300, y: 405 }, { x: 400, y: 405 }], 'inspect', 29)),
      npc('poonam', 'Poonam', 'Researcher', 400, 470, 'I just need to leave on time. Which means I absolutely will not.'),
      npc('max', 'Max', 'Researcher', 970, 410, 'I was promised a normal day. I can only assume that was theoretical.'),
      npc('leila', 'Leila', 'Researcher', 1050, 470, 'Everyone is walking faster, which is somehow making the corridor slower.'),
      npc('erin', 'Erin', 'Researcher', 1090, 585, 'I can feel the schedule slipping through the walls.'),
    ],
  },

  feedStore: {
    id: 'feedStore', name: 'Feed Store', subtitle: 'Everybody is hungry at once', theme: 'storage', backgroundKey: 'feedStore', bounds: BOUNDS, music: 'facility', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromHall', x: 245, y: 390, facing: 'toward' }],
    exits: [{ id: 'feed_to_hall', label: 'Main Hallway', x: 210, y: 185, width: 75, height: 140, destination: 'mainHall', destinationSpawn: 'fromFeed', facing: 'away', portal: { target: { x: 245, y: 155 }, durationMs: 420, fadeFrom: .58 } }],
    obstacles: [
      { id: 'back_shelves', x: 315, y: 115, width: 335, height: 220 },
      { id: 'feed_mixer', x: 650, y: 125, width: 160, height: 230 },
      { id: 'prep_bench', x: 800, y: 190, width: 250, height: 190 },
      { id: 'left_sink', x: 55, y: 335, width: 130, height: 265 },
      { id: 'right_cages', x: 1060, y: 330, width: 165, height: 290 },
    ],
    interactions: [
      { id: 'feed_cart', label: 'Feed cart', verb: 'Pick up', x: 680, y: 370, radius: 95, holdMs: 850, requiresFlag: 'routesRestored', missingFlagLine: 'The route console still has the feed-store release on administrative lockdown.', prop: 'cart' },
      { id: 'mystery_bin', label: 'Unlabelled feed bin', verb: 'Inspect', x: 940, y: 430, radius: 78, optionalLine: 'The label says OMNIVORE, then appears to have lost confidence halfway through the spelling.', prop: 'misc' },
      { id: 'dinosaur_toy', label: 'Nubbed blue enrichment ball', verb: 'Inspect', x: 1010, y: 430, radius: 70, optionalLine: 'This toy seems wildly over-engineered for every animal on today’s official list.', prop: 'misc' },
    ],
    npcs: [npc('vu', 'Vu', 'Engineer', 970, 500, 'One cable is essential. Four cables are suspicious.', 'vu', patrol([{ x: 970, y: 500 }, { x: 850, y: 500 }], 'inspect', 27))],
    foregroundLayers: [{ id: 'feed-cage-foreground', x: 1060, y: 330, width: 165, height: 290, depth: 835 }],
  },

  pigHousing: {
    id: 'pigHousing', name: 'Pig Housing', subtitle: 'The committee is in session', theme: 'animal', backgroundKey: 'pigHousing', bounds: BOUNDS, music: 'animals', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromHall', x: 900, y: 390, facing: 'left' }],
    exits: [{ id: 'pig_to_hall', label: 'Main Hallway', x: 945, y: 285, width: 55, height: 145, destination: 'mainHall', destinationSpawn: 'fromPig', facing: 'right', portal: { target: { x: 1015, y: 355 }, durationMs: 420, fadeFrom: .55 } }],
    obstacles: [
      { id: 'pig_pens_left', x: 55, y: 150, width: 255, height: 470 },
      { id: 'pig_pens_right_north', x: 1005, y: 105, width: 160, height: 170 },
      { id: 'pig_pens_right_south', x: 1005, y: 440, width: 160, height: 180 },
      { id: 'pig_fan', x: 520, y: 350, width: 115, height: 150 },
    ],
    interactions: [
      { id: 'pig_feed_1', label: 'Pig pen one', verb: 'Give', x: 235, y: 425, radius: 116, holdMs: 900, requiresFlag: 'hasFeedCart', missingFlagLine: 'You need the feed cart. The pig has logged the omission.', prop: 'animal' },
      { id: 'pig_feed_2', label: 'Pig pen two', verb: 'Give', x: 300, y: 570, radius: 104, holdMs: 900, requiresFlag: 'hasFeedCart', missingFlagLine: 'The empty-handed approach has not impressed the second pig.', prop: 'animal' },
      { id: 'pig_feed_3', label: 'Pig pen three', verb: 'Give', x: 1005, y: 570, radius: 104, holdMs: 900, requiresFlag: 'hasFeedCart', missingFlagLine: 'Feed cart first. Pig diplomacy is materially based.', prop: 'animal' },
      { id: 'industrial_fan', label: 'Heroic industrial fan', verb: 'Inspect', x: 650, y: 460, radius: 88, optionalLine: 'The fan turns at one speed: retrospective safety concern.', prop: 'machine' },
    ],
    npcs: [npc('luther', 'Luther', 'Vet', 820, 500, 'This would all be easier if nobody needed anything at exactly the same minute.', 'luther', patrol([{ x: 820, y: 500 }, { x: 730, y: 540 }], 'inspect', 28))],
    foregroundLayers: [
      { id: 'pig-left-pens-foreground', x: 55, y: 150, width: 255, height: 470, depth: 835, alpha: .38 },
      { id: 'pig-right-south-foreground', x: 1005, y: 440, width: 160, height: 180, depth: 840, alpha: .38 },
    ],
  },

  sheepScales: {
    id: 'sheepScales', name: 'Sheep & Scales', subtitle: 'Wool, weight and timing', theme: 'animal', backgroundKey: 'sheepScales', bounds: BOUNDS, music: 'animals', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromHall', x: 300, y: 390, facing: 'right' }],
    exits: [{ id: 'sheep_to_hall', label: 'Main Hallway', x: 55, y: 170, width: 100, height: 160, destination: 'mainHall', destinationSpawn: 'fromSheep', facing: 'left', portal: { target: { x: 45, y: 245 }, durationMs: 420, fadeFrom: .56 } }],
    obstacles: [
      { id: 'left_foreground_rail', x: 55, y: 355, width: 180, height: 315 },
      { id: 'rear_pen', x: 335, y: 135, width: 185, height: 210 },
      { id: 'scale_platform', x: 370, y: 350, width: 430, height: 210 },
      { id: 'rear_bed', x: 680, y: 170, width: 270, height: 170 },
      { id: 'right_foreground_rail', x: 1030, y: 460, width: 195, height: 210 },
    ],
    interactions: [
      { id: 'sheep_feed_1', label: 'Sheep pen one', verb: 'Give', x: 320, y: 330, radius: 78, holdMs: 820, requiresFlag: 'hasFeedCart', missingFlagLine: 'The sheep looks past you for the feed cart.', prop: 'animal' },
      { id: 'sheep_feed_2', label: 'Sheep pen two', verb: 'Give', x: 610, y: 330, radius: 78, holdMs: 820, requiresFlag: 'hasFeedCart', missingFlagLine: 'No cart, no credibility.', prop: 'animal' },
      { id: 'sheep_feed_3', label: 'Sheep pen three', verb: 'Give', x: 900, y: 330, radius: 78, holdMs: 820, requiresFlag: 'hasFeedCart', missingFlagLine: 'The final sheep has standards.', prop: 'animal' },
      { id: 'livestock_scale', label: 'Livestock scale', verb: 'Operate', x: 800, y: 520, radius: 105, holdMs: 1000, requiresFlag: 'hasTrolley', missingFlagLine: 'A scale without a pig trolley is only expensive flooring.', prop: 'machine' },
      { id: 'shearing_station', label: 'Shearing station', verb: 'Operate', x: 500, y: 520, radius: 92, holdMs: 1200, requiresFlag: 'procedureComplete', missingFlagLine: 'The station is booked for the afternoon overflow, not the morning optimism.', prop: 'animal' },
      { id: 'scale_readout', label: 'Scale readout', verb: 'Inspect', x: 500, y: 315, radius: 70, optionalLine: 'The display currently reads: PATIENCE, LOW.', prop: 'machine' },
    ],
    npcs: [npc('shinya', 'Shinya', 'Researcher', 960, 590, 'I calibrated the scale. Emotionally, I am choosing confidence.', 'shinya')],
    foregroundLayers: [
      { id: 'sheep-left-rail-foreground', x: 55, y: 355, width: 210, height: 315, depth: 835 },
      { id: 'sheep-right-rail-foreground', x: 1030, y: 460, width: 195, height: 210, depth: 845 },
    ],
  },

  baboonWing: {
    id: 'baboonWing', name: 'Baboon Wing', subtitle: 'Calm is a control system', theme: 'animal', backgroundKey: 'baboonWing', bounds: BOUNDS, music: 'animals', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromHall', x: 640, y: 590, facing: 'away' }],
    exits: [{ id: 'baboon_to_hall', label: 'Main Hallway', x: 570, y: 660, width: 140, height: 10, destination: 'mainHall', destinationSpawn: 'fromBaboon', facing: 'toward', portal: { target: { x: 640, y: 718 }, durationMs: 450, fadeFrom: .6 } }],
    obstacles: [
      { id: 'baboon_cage_1', x: 110, y: 130, width: 280, height: 230 }, { id: 'baboon_cage_2', x: 500, y: 130, width: 280, height: 230 },
      { id: 'baboon_cage_3', x: 890, y: 130, width: 280, height: 230 },
      { id: 'right_enrichment_unit', x: 1060, y: 485, width: 165, height: 185 },
    ],
    interactions: [
      { id: 'baboon_feed_1', label: 'Baboon station one', verb: 'Give', x: 250, y: 385, radius: 80, holdMs: 950, requiresFlag: 'hasFeedCart', missingFlagLine: 'The baboon has noticed the absence of food and the presence of audacity.', prop: 'animal' },
      { id: 'baboon_feed_2', label: 'Baboon station two', verb: 'Give', x: 640, y: 385, radius: 80, holdMs: 950, requiresFlag: 'hasFeedCart', missingFlagLine: 'Return with the cart. Calmly.', prop: 'animal' },
      { id: 'baboon_feed_3', label: 'Baboon station three', verb: 'Give', x: 1030, y: 385, radius: 80, holdMs: 950, requiresFlag: 'hasFeedCart', missingFlagLine: 'No feed, no sample, no applause.', prop: 'animal' },
      { id: 'baboon_sample_1', label: 'Sample point one', verb: 'Use', x: 300, y: 470, radius: 75, holdMs: 1200, requiresFlag: 'wingSecured', missingFlagLine: 'Calibrate the security interlock before opening a sample point.', prop: 'animal' },
      { id: 'baboon_sample_2', label: 'Sample point two', verb: 'Use', x: 640, y: 470, radius: 75, holdMs: 1200, requiresFlag: 'wingSecured', missingFlagLine: 'The sample hatch is waiting for a green interlock.', prop: 'animal' },
      { id: 'baboon_sample_3', label: 'Sample point three', verb: 'Use', x: 980, y: 470, radius: 75, holdMs: 1200, requiresFlag: 'wingSecured', missingFlagLine: 'Secure the wing before completing the final sample.', prop: 'animal' },
      { id: 'security_panel', label: 'Security interlock', verb: 'Operate', x: 990, y: 530, radius: 90, holdMs: 1050, requiresFlag: 'baboonsFed', missingFlagLine: 'The interlock refuses calibration while the feeding stations are still active.', prop: 'machine' },
    ],
    npcs: [
      npc('dhanya_baboon', 'Dhanya', 'Researcher', 180, 560, 'Three separate samples. Stay calm or the room becomes theatrical.', 'dhanya', patrol([{ x: 180, y: 560 }, { x: 360, y: 560 }], 'startle', 26)),
      npc('anugra', 'Anugra', 'Cardiologist', 920, 580, 'Everything is fine until transport stalls. Then everyone discovers urgency.'),
    ],
  },

  prepRoom: {
    id: 'prepRoom', name: 'Procedure Prep', subtitle: 'The trolley becomes a plot device', theme: 'clinical', backgroundKey: 'prepRoom', bounds: BOUNDS, music: 'facility', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromHall', x: 260, y: 430, facing: 'right' }, { id: 'fromCath', x: 1020, y: 430, facing: 'left' }],
    exits: [
      { id: 'prep_to_hall', label: 'Main Hallway', x: 55, y: 205, width: 85, height: 175, destination: 'mainHall', destinationSpawn: 'fromPrep', facing: 'left', portal: { target: { x: 45, y: 290 }, durationMs: 420, fadeFrom: .55 } },
      { id: 'prep_to_cath', label: 'Cath Lab', x: 1165, y: 235, width: 60, height: 185, destination: 'cathLab', destinationSpawn: 'fromPrep', facing: 'right', portal: { target: { x: 1235, y: 330 }, durationMs: 420, fadeFrom: .55 }, requiredFlag: 'hasTrolley', lockedLine: 'Cath is not accepting conceptual trolleys. Load the pig first.' },
    ],
    obstacles: [
      { id: 'rear_counter', x: 390, y: 170, width: 570, height: 230 },
      { id: 'left_foreground_table', x: 55, y: 500, width: 180, height: 170 },
      { id: 'right_trolley', x: 1060, y: 460, width: 165, height: 210 },
    ],
    interactions: [
      { id: 'pig_prep_station', label: 'Pig prep station', verb: 'Operate', x: 350, y: 365, radius: 94, holdMs: 1200, prop: 'machine' },
      { id: 'anaesthesia_console', label: 'Anaesthesia console', verb: 'Operate', x: 760, y: 365, radius: 94, holdMs: 1400, requiresFlag: 'pigPrepared', missingFlagLine: 'Complete prep before operating the anaesthesia console.', prop: 'machine' },
      { id: 'pig_trolley', label: 'Loaded pig trolley', verb: 'Use', x: 570, y: 535, radius: 105, holdMs: 950, requiresFlag: 'pigReady', missingFlagLine: 'The trolley is ready. The pig, administratively, is not.', prop: 'trolley' },
      { id: 'spill_kit', label: 'PC-Definitely-Not-Two spill cabinet', verb: 'Inspect', x: 960, y: 370, radius: 75, optionalLine: 'The cabinet is labelled for every emergency except the one currently happening.', prop: 'misc' },
    ],
    npcs: [
      npc('alan', 'Alan', 'Vet', 470, 430, 'Prep first, then stay with me for the anaesthetic. Calm hands.', 'alan', patrol([{ x: 470, y: 430 }, { x: 630, y: 440 }], 'inspect', 26)),
      npc('luther_prep', 'Luther', 'Vet', 720, 460, 'I have checked the checklist against the other checklist.', 'luther'),
    ],
    foregroundLayers: [
      { id: 'prep-left-table-foreground', x: 55, y: 500, width: 180, height: 170, depth: 835 },
      { id: 'prep-right-trolley-foreground', x: 1060, y: 460, width: 165, height: 210, depth: 845 },
    ],
  },

  cathLab: {
    id: 'cathLab', name: 'Cath Lab', subtitle: 'Everything works unless observed', theme: 'clinical', backgroundKey: 'cathLab', bounds: BOUNDS, music: 'cath', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromPrep', x: 195, y: 350, facing: 'toward' }],
    exits: [{ id: 'cath_to_prep', label: 'Procedure Prep', x: 150, y: 165, width: 90, height: 110, destination: 'prepRoom', destinationSpawn: 'fromCath', facing: 'away', portal: { target: { x: 195, y: 115 }, durationMs: 430, fadeFrom: .58 } }],
    obstacles: [
      { id: 'cath_table', x: 390, y: 260, width: 430, height: 170 }, { id: 'c_arm', x: 530, y: 140, width: 190, height: 130 },
      { id: 'monitor_bank', x: 865, y: 130, width: 270, height: 160 }, { id: 'cath_cart', x: 860, y: 480, width: 230, height: 120 },
    ],
    interactions: [
      { id: 'cath_handover', label: 'Cath-lab handover', verb: 'Use', x: 320, y: 450, radius: 95, holdMs: 900, requiresFlag: 'pigWeighed', missingFlagLine: 'The team needs the recorded weight before accepting the trolley.', prop: 'trolley' },
      { id: 'cath_support', label: 'Cardiac support console', verb: 'Operate', x: 970, y: 345, radius: 105, holdMs: 1600, requiresFlag: 'monitorSynced', missingFlagLine: 'Synchronise the monitor bank before operating procedure support.', prop: 'machine' },
      { id: 'heart_monitor', label: 'Monitor bank', verb: 'Operate', x: 920, y: 315, radius: 82, holdMs: 1100, requiresFlag: 'pigDelivered', missingFlagLine: 'The monitor can only synchronise after the trolley handover.', prop: 'machine' },
    ],
    npcs: [
      npc('juan', 'Juan', 'Cardiologist', 340, 520, 'Cath is ready. The rest of the world apparently is not.', 'juan', patrol([{ x: 340, y: 520 }, { x: 470, y: 535 }], 'wave', 30)),
      npc('xing', 'Xing', 'Cardiologist', 440, 530, 'I need timing, not drama. Drama remains the backup plan.'),
      npc('sam', 'Sam', 'Physiologist', 780, 520, 'Measurements are ready. The rest of the world apparently is not.'),
      npc('mitch', 'Mitch', 'Physiologist', 860, 545, 'I can help. I can also worry productively, if useful.'),
      npc('tony', 'Tony', 'Engineer', 1080, 430, 'If the monitor flickers again, pretend it is intentional until I get there.'),
      npc('urja', 'Urja', 'Engineer', 1130, 520, 'Engineering update: the thing works, unless observed directly.'),
    ],
    foregroundLayers: [
      { id: 'cath-cart-foreground', x: 860, y: 480, width: 230, height: 120, depth: 840 },
    ],
  },

  carPark: {
    id: 'carPark', name: 'Car Park', subtitle: 'Diplomacy on wet asphalt', theme: 'exterior', backgroundKey: 'carPark', bounds: BOUNDS, music: 'carpark', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromHall', x: 480, y: 215, facing: 'toward' }, { id: 'fromCoffee', x: 1185, y: 235, facing: 'toward' }],
    exits: [
      { id: 'car_to_hall', label: 'Main Hallway', x: 445, y: 105, width: 70, height: 75, destination: 'mainHall', destinationSpawn: 'fromCar', facing: 'away', portal: { target: { x: 480, y: 75 }, durationMs: 420, fadeFrom: .55 } },
      { id: 'car_to_coffee', label: 'Coffee Shop', x: 1060, y: 105, width: 165, height: 50, destination: 'coffeeShop', destinationSpawn: 'fromCar', facing: 'away', portal: { target: { x: 1185, y: 70 }, durationMs: 460, fadeFrom: .58 }, requiredFlag: 'carParkClear', lockedLine: 'The coffee route is blocked until all six cars are sensibly placed.' },
    ],
    obstacles: [
      { id: 'guard_hut', x: 70, y: 200, width: 170, height: 130 },
      { id: 'island', x: 930, y: 500, width: 220, height: 110 },
      { id: 'car_sally', x: 310, y: 220, width: 100, height: 60 }, { id: 'car_alan', x: 450, y: 305, width: 100, height: 60 },
      { id: 'car_vu', x: 600, y: 390, width: 100, height: 60 }, { id: 'car_max', x: 470, y: 505, width: 100, height: 60 },
      { id: 'car_juan', x: 740, y: 470, width: 100, height: 60 }, { id: 'car_wayne', x: 805, y: 365, width: 110, height: 65 },
    ],
    interactions: [
      { id: 'car_sally', label: 'Sally’s compact', verb: 'Operate', x: 360, y: 250, radius: 82, holdMs: 650, prop: 'car' },
      { id: 'car_alan', label: 'Alan’s wagon', verb: 'Operate', x: 500, y: 335, radius: 82, holdMs: 650, prop: 'car' },
      { id: 'car_vu', label: 'Vu’s extremely practical vehicle', verb: 'Operate', x: 650, y: 420, radius: 82, holdMs: 650, prop: 'car' },
      { id: 'car_max', label: 'Max’s hatchback', verb: 'Operate', x: 520, y: 535, radius: 82, holdMs: 650, prop: 'car' },
      { id: 'car_juan', label: 'Juan’s locked car', verb: 'Talk', x: 790, y: 500, radius: 86, holdMs: 350, prop: 'car' },
      { id: 'car_wayne', label: 'Wayne’s blue car', verb: 'Talk', x: 860, y: 395, radius: 92, holdMs: 350, prop: 'car' },
      { id: 'park_cooler', label: 'Cooler on a sandstone throne', verb: 'Inspect', x: 280, y: 530, radius: 75, optionalLine: 'The cooler has been promoted to monument through the power of nobody moving it.', prop: 'misc' },
    ],
    npcs: [
      npc('wayne', 'Wayne', 'PI', 930, 390, 'Do not touch my car. Ask me and I will move it myself. Carefully.'),
      npc('juan_park', 'Juan', 'Cardiologist', 850, 560, 'I can move my car. I am choosing not to comment on the others.', 'juan'),
      npc('thanh', 'Thanh', 'Mobile hazard', 260, 440, 'HONK.', 'thanh'),
    ],
  },

  coffeeShop: {
    id: 'coffeeShop', name: 'Coffee Shop', subtitle: 'Caffeine in cinematic lighting', theme: 'coffee', backgroundKey: 'coffeeShop', bounds: BOUNDS, music: 'finale', perspective: PERSPECTIVE,
    spawns: [{ id: 'fromCar', x: 520, y: 430, facing: 'toward' }],
    exits: [{ id: 'coffee_to_car', label: 'Hospital Footpath', x: 485, y: 220, width: 70, height: 130, destination: 'carPark', destinationSpawn: 'fromCoffee', facing: 'away', portal: { target: { x: 520, y: 180 }, durationMs: 430, fadeFrom: .56 } }],
    obstacles: [
      { id: 'coffee_counter', x: 575, y: 200, width: 565, height: 185 },
      { id: 'window_bar', x: 55, y: 290, width: 300, height: 220 },
      { id: 'right_cabinet', x: 1120, y: 350, width: 105, height: 250 },
    ],
    interactions: [
      { id: 'juan_coffee', label: 'Juan and the promised coffee', verb: 'Talk', x: 900, y: 495, radius: 105, holdMs: 350, prop: 'coffee' },
      { id: 'coffee_menu', label: 'Handwritten menu', verb: 'Inspect', x: 960, y: 405, radius: 70, optionalLine: 'TODAY’S SPECIAL: closure, served with a small biscuit.', prop: 'board' },
      { id: 'coffee_steam', label: 'Heroic coffee steam', verb: 'Inspect', x: 780, y: 415, radius: 70, optionalLine: 'For once, the dramatic haze is helping.', prop: 'coffee' },
    ],
    npcs: [npc('juan_final', 'Juan', 'Coffee benefactor', 900, 495, 'You made it. Coffee. No debate.', 'juan')],
    foregroundLayers: [
      { id: 'coffee-window-bar-foreground', x: 55, y: 290, width: 300, height: 220, depth: 835 },
      { id: 'coffee-right-cabinet-foreground', x: 1120, y: 350, width: 105, height: 250, depth: 840 },
    ],
  },
};

export const LOCATION_LIST = Object.values(LOCATIONS);

export function getLocation(id: LocationId): LocationDefinition {
  return LOCATIONS[id];
}

export function findInteraction(id: string) {
  for (const location of LOCATION_LIST) {
    const interaction = location.interactions.find((candidate) => candidate.id === id);
    if (interaction) return { location, interaction };
  }
  return null;
}
