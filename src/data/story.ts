import type { DialogueLine, ObjectiveDefinition } from '../types/game';

export const OBJECTIVES: readonly ObjectiveDefinition[] = [
  { id: 'check_board', act: 0, title: 'Check the shift board', description: 'Sally wants the plan acknowledged before the plan can betray us.', hint: 'The shift board glows beside the Tea Room table.', location: 'teaRoom', targets: ['shift_board'], reward: { xp: 12, coins: 6 }, grantsFlags: ['boardChecked'] },
  { id: 'collect_cart', act: 0, title: 'Collect the feed cart', description: 'Retrieve the wheeled symbol of everybody being hungry at once.', hint: 'Take the east door from Main Hall to the Feed Store.', location: 'feedStore', targets: ['feed_cart'], reward: { xp: 14, coins: 7 }, grantsFlags: ['hasFeedCart'], kit: ['Feed cart'], checkpoint: true },
  { id: 'feed_pigs', act: 1, title: 'Feed each pig', description: 'Visit all three pens. The pigs have formed a committee.', hint: 'Pig Housing is the western animal door off Main Hall.', location: 'pigHousing', targets: ['pig_feed_1', 'pig_feed_2', 'pig_feed_3'], reward: { xp: 20, coins: 9 } },
  { id: 'feed_sheep', act: 1, title: 'Feed each sheep', description: 'Complete the pen-by-pen feed run before the wool becomes political.', hint: 'Sheep & Scales is north-east of Main Hall.', location: 'sheepScales', targets: ['sheep_feed_1', 'sheep_feed_2', 'sheep_feed_3'], reward: { xp: 18, coins: 9 } },
  { id: 'feed_baboons', act: 1, title: 'Feed each baboon', description: 'Calm pace, no sprinting at the cages, and absolutely no improvisational fruit juggling.', hint: 'The secured Baboon Wing is through the north hall door.', location: 'baboonWing', targets: ['baboon_feed_1', 'baboon_feed_2', 'baboon_feed_3'], reward: { xp: 20, coins: 10 } },
  { id: 'sample_baboons', act: 1, title: 'Collect three glucose samples', description: 'Three animals, three samples, one increasingly theatrical clipboard.', hint: 'Return to each marked baboon station and hold Use.', location: 'baboonWing', targets: ['baboon_sample_1', 'baboon_sample_2', 'baboon_sample_3'], reward: { xp: 28, coins: 13 }, grantsFlags: ['hasSamples'], kit: ['Sample kit'], checkpoint: true },
  { id: 'pig_prep', act: 2, title: 'Complete pig preparation', description: 'Alan has the station ready. “Ready” is being used aspirationally.', hint: 'The Procedure Prep door is south-west from Main Hall.', location: 'prepRoom', targets: ['pig_prep_station'], reward: { xp: 22, coins: 10 }, grantsFlags: ['pigPrepared'] },
  { id: 'anaesthetise_pig', act: 2, title: 'Assist Alan with anaesthesia', description: 'Keep the handoff calm and the timing clean.', hint: 'Use the anaesthesia console beside Alan.', location: 'prepRoom', targets: ['anaesthesia_console'], reward: { xp: 24, coins: 12 }, grantsFlags: ['pigReady'] },
  { id: 'load_trolley', act: 2, title: 'Load the pig trolley', description: 'The trolley has become a plot device. Treat it with respect.', hint: 'The trolley is waiting by the prep-room lower rail.', location: 'prepRoom', targets: ['pig_trolley'], reward: { xp: 22, coins: 11 }, grantsFlags: ['hasTrolley'], kit: ['Pig trolley'], checkpoint: true },
  { id: 'weigh_pig', act: 3, title: 'Weigh the pig', description: 'Take the same trolley to the livestock scale and record the result.', hint: 'The scale platform is in Sheep & Scales, east of Main Hall.', location: 'sheepScales', targets: ['livestock_scale'], reward: { xp: 20, coins: 10 }, grantsFlags: ['pigWeighed'] },
  { id: 'deliver_cath', act: 3, title: 'Deliver the trolley to cath', description: 'Juan, Xing, Sam and Mitch have achieved organised waiting.', hint: 'Procedure Prep connects directly to the Cath Lab.', location: 'cathLab', targets: ['cath_handover'], reward: { xp: 27, coins: 13 }, grantsFlags: ['pigDelivered'] },
  { id: 'support_cath', act: 3, title: 'Support the cardiac procedure', description: 'Follow the monitor rhythm and complete the equipment handoff.', hint: 'Operate the cyan-lit support console in Cath Lab.', location: 'cathLab', targets: ['cath_support'], reward: { xp: 30, coins: 15 }, grantsFlags: ['procedureComplete'], checkpoint: true },
  { id: 'shear_sheep', act: 4, title: 'Shear the afternoon sheep', description: 'Naturally this has become urgent now.', hint: 'Return to Sheep & Scales and use the shearing station.', location: 'sheepScales', targets: ['shearing_station'], reward: { xp: 22, coins: 11 }, grantsFlags: ['sheepSheared'] },
  { id: 'clear_carpark', act: 4, title: 'Clear the car park', description: 'Move the free cars. Ask Juan and Wayne to move their own. Avoid Thanh’s interpretation of lane discipline.', hint: 'Use all six glowing cars. The blue one requires diplomacy.', location: 'carPark', targets: ['car_sally', 'car_alan', 'car_vu', 'car_max', 'car_juan', 'car_wayne'], reward: { xp: 38, coins: 20 }, grantsFlags: ['carParkClear'], checkpoint: true },
  { id: 'coffee_finale', act: 5, title: 'Meet Juan for coffee', description: 'The promise made at 06:45 has somehow survived contact with the day.', hint: 'Use the upper-right car-park exit, then talk to Juan inside the coffee shop.', location: 'coffeeShop', targets: ['juan_coffee'], reward: { xp: 60, coins: 32 }, grantsFlags: ['coffeeEarned'] },
] as const;

export const OPENING_DIALOGUE: readonly DialogueLine[] = [
  { speaker: 'Sally', text: 'You are up. Board first, cart second, panic only when professionally necessary.', expression: 'amused' },
  { speaker: 'Juan', text: 'Get the animals settled, get the pig to cath, and untangle the car park. Then coffee is on me. This is a binding clinical promise.', expression: 'neutral' },
];

export const OBJECTIVE_DIALOGUE: Readonly<Record<string, readonly DialogueLine[]>> = {
  feed_pigs: [{ speaker: 'Player', text: 'Feed cart acquired. Everybody is now hungry at the same time, exactly as forecast.', expression: 'amused' }],
  sample_baboons: [{ speaker: 'Dhanya', text: 'Three samples, please. Calm is faster than apologising to a baboon.', expression: 'concerned' }],
  pig_prep: [{ speaker: 'Alan', text: 'Prep first, then stay with me for the anaesthetic. Calm hands, steady pace, no mystery delays.', expression: 'neutral' }],
  weigh_pig: [{ speaker: 'Alan', text: 'Same trolley, all the way through scales and into cath. It has seniority now.', expression: 'amused' }],
  deliver_cath: [{ speaker: 'Juan', text: 'Cath is ready when the trolley arrives. Not earlier. Certainly not later.', expression: 'neutral' }],
  shear_sheep: [{ speaker: 'Sally', text: 'Excellent procedure work. Small update: a sheep has become an afternoon emergency.', expression: 'concerned' }],
  clear_carpark: [{ speaker: 'Wayne', text: 'If this procedure slips because of the car park, I will become a measurable environmental condition.', expression: 'annoyed' }],
  coffee_finale: [{ speaker: 'Juan', text: 'The lane is clear. I am at the coffee shop, guarding your reward from administrative reassignment.', expression: 'amused' }],
};

export const FINAL_DIALOGUE: readonly DialogueLine[] = [
  { speaker: 'Juan', text: 'You made it. I am buying the coffee. No debate. Take the win, take the caffeine, and enjoy the fact that the shift ended like a film.', expression: 'amused' },
  { speaker: 'Sally', text: 'Tomorrow’s board is already optimistic. We will not look at it tonight.', expression: 'amused' },
];

export function objectiveProgress(index: number, completedTargets: readonly string[]): { done: number; total: number } {
  const objective = OBJECTIVES[index];
  if (!objective) return { done: OBJECTIVES.length, total: OBJECTIVES.length };
  return { done: objective.targets.filter((target) => completedTargets.includes(target)).length, total: objective.targets.length };
}
