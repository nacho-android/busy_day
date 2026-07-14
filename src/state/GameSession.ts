import { CHARACTERS } from '../data/characters';
import { findInteraction, LOCATIONS } from '../data/locations';
import { OBJECTIVES, objectiveProgress } from '../data/story';
import { clearSave, loadSave, persistSave } from './saveStore';
import type { CharacterId, FailureKind, InteractionResult, LocationId, PlayerMeters, Rank, RunState, SaveEnvelope, SettingsState } from '../types/game';

type SessionEvent = 'change' | 'objective' | 'failure' | 'finish' | 'settings' | 'transition';
type Listener = () => void;

const ACT_SPAWNS: Record<number, { locationId: LocationId; spawnId: string }> = {
  0: { locationId: 'teaRoom', spawnId: 'start' },
  1: { locationId: 'mainHall', spawnId: 'fromTea' },
  2: { locationId: 'prepRoom', spawnId: 'fromHall' },
  3: { locationId: 'prepRoom', spawnId: 'fromHall' },
  4: { locationId: 'mainHall', spawnId: 'fromPrep' },
  5: { locationId: 'carPark', spawnId: 'fromHall' },
};

function runId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneRun(run: RunState): RunState {
  return structuredClone(run);
}

export class GameSession {
  private envelope: SaveEnvelope = loadSave();
  private readonly listeners = new Map<SessionEvent, Set<Listener>>();

  get run(): RunState | null { return this.envelope.activeRun; }
  get settings(): SettingsState { return this.envelope.settings; }
  get profile() { return this.envelope.profile; }
  get currentObjective() { return this.run ? OBJECTIVES[this.run.objectiveIndex] ?? null : null; }
  get hasContinue(): boolean { return Boolean(this.run && !this.run.finished); }

  on(event: SessionEvent, listener: Listener): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return () => set.delete(listener);
  }

  private emit(event: SessionEvent): void {
    this.listeners.get(event)?.forEach((listener) => listener());
    if (event !== 'change') this.listeners.get('change')?.forEach((listener) => listener());
  }

  newGame(characterId: CharacterId, relaxed = this.settings.relaxed): RunState {
    const spawn = LOCATIONS.teaRoom.spawns.find((candidate) => candidate.id === 'start')!;
    const stats = CHARACTERS[characterId].stats;
    this.envelope.activeRun = {
      runId: runId(), characterId, relaxed, startedAt: new Date().toISOString(), locationId: 'teaRoom', spawnId: 'start',
      player: { x: spawn.x, y: spawn.y }, facing: spawn.facing, objectiveIndex: 0, completedTargets: [], completedObjectives: [],
      flags: [], meters: { health: 100, stamina: stats.maxStamina, stress: 0, wayne: 0 }, xp: 0, coins: 0, level: 1,
      startedAtMinutes: 6 * 60 + 45, elapsedSeconds: 0, checkpointObjectiveIndex: 0, failure: null, finished: false,
    };
    this.save();
    this.emit('change');
    return cloneRun(this.envelope.activeRun);
  }

  continueGame(): RunState | null {
    if (!this.run || this.run.finished) return null;
    if (this.run.failure) return this.retryCheckpoint();
    this.emit('change');
    return cloneRun(this.run);
  }

  hasFlag(flag: string): boolean { return this.run?.flags.includes(flag) ?? false; }

  transitionTo(locationId: LocationId, spawnId: string): void {
    if (!this.run) return;
    const spawn = LOCATIONS[locationId].spawns.find((candidate) => candidate.id === spawnId);
    if (!spawn) throw new Error(`Unknown spawn ${locationId}.${spawnId}`);
    Object.assign(this.run, { locationId, spawnId, player: { x: spawn.x, y: spawn.y }, facing: spawn.facing });
    this.save();
    this.emit('transition');
  }

  recordPosition(x: number, y: number, facing: RunState['facing']): void {
    if (!this.run) return;
    this.run.player = { x, y };
    this.run.facing = facing;
  }

  persist(): void { this.save(); }

  interact(interactionId: string): InteractionResult {
    const run = this.run;
    const found = findInteraction(interactionId);
    if (!run || !found) return { success: false, message: 'That interaction has been reassigned to another department.', objectiveCompleted: false, gameCompleted: false };
    if (found.location.id !== run.locationId) {
      return { success: false, message: `${found.interaction.label} is in ${found.location.name}. Even excellent reach has limits.`, objectiveCompleted: false, gameCompleted: false };
    }
    const { interaction } = found;
    if (interaction.requiresFlag && !this.hasFlag(interaction.requiresFlag)) {
      return { success: false, message: interaction.missingFlagLine ?? 'You are missing something important and probably wheeled.', objectiveCompleted: false, gameCompleted: false };
    }

    const objective = this.currentObjective;
    if (!objective || !objective.targets.includes(interactionId)) {
      if (interaction.optionalLine) return { success: true, message: interaction.optionalLine, objectiveCompleted: false, gameCompleted: false };
      const alreadyDone = run.completedTargets.includes(interactionId);
      return { success: false, message: alreadyDone ? 'Already handled. Repetition would make it a meeting.' : 'Useful, but not the useful thing the board currently demands.', objectiveCompleted: false, gameCompleted: false };
    }

    if (!run.completedTargets.includes(interactionId)) run.completedTargets.push(interactionId);
    const progress = objectiveProgress(run.objectiveIndex, run.completedTargets);
    let objectiveCompleted = false;
    let gameCompleted = false;
    let dialogueKey: string | undefined;

    if (interactionId === 'car_wayne') dialogueKey = 'wayne_choice';
    else if (interactionId === 'car_juan') dialogueKey = 'juan_car';

    if (progress.done === progress.total) {
      objectiveCompleted = true;
      run.completedObjectives.push(objective.id);
      run.xp += objective.reward.xp;
      run.coins += objective.reward.coins;
      objective.grantsFlags?.forEach((flag) => { if (!run.flags.includes(flag)) run.flags.push(flag); });
      if (objective.checkpoint) run.checkpointObjectiveIndex = run.objectiveIndex + 1;
      run.objectiveIndex += 1;
      const thresholds = [0, 40, 95, 165];
      run.level = Math.min(4, thresholds.filter((threshold) => run.xp >= threshold).length);
      if (run.objectiveIndex >= OBJECTIVES.length) {
        run.finished = true;
        gameCompleted = true;
        this.completeProfile();
      }
      this.emit(gameCompleted ? 'finish' : 'objective');
    }

    this.save();
    const result: InteractionResult = {
      success: true,
      message: objectiveCompleted ? `Objective complete · +${objective.reward.xp} XP · +${objective.reward.coins} coins` : `${interaction.label} complete · ${progress.done}/${progress.total}`,
      objectiveCompleted,
      gameCompleted,
    };
    if (dialogueKey) result.dialogueKey = dialogueKey;
    return result;
  }

  updateMeters(partial: Partial<PlayerMeters>, emit = true): void {
    const run = this.run;
    if (!run || run.finished) return;
    const meter = run.meters;
    if (partial.health !== undefined) meter.health = Math.max(0, Math.min(100, partial.health));
    if (partial.stamina !== undefined) meter.stamina = Math.max(0, Math.min(CHARACTERS[run.characterId].stats.maxStamina, partial.stamina));
    if (partial.stress !== undefined) meter.stress = Math.max(0, Math.min(100, partial.stress));
    if (partial.wayne !== undefined) meter.wayne = Math.max(0, Math.min(100, partial.wayne));
    if (meter.health <= 0) this.fail('health');
    else if (meter.wayne >= 100) this.fail('wayne');
    else if (emit) this.emit('change');
  }

  adjustMeters(delta: Partial<PlayerMeters>): void {
    const meters = this.run?.meters;
    if (!meters) return;
    this.updateMeters({
      health: meters.health + (delta.health ?? 0), stamina: meters.stamina + (delta.stamina ?? 0),
      stress: meters.stress + (delta.stress ?? 0), wayne: meters.wayne + (delta.wayne ?? 0),
    });
  }

  tick(deltaSeconds: number): void {
    const run = this.run;
    if (!run || run.finished || run.failure) return;
    run.elapsedSeconds += deltaSeconds;
  }

  fail(kind: FailureKind): void {
    if (!this.run || this.run.failure) return;
    this.run.failure = kind;
    this.save();
    this.emit('failure');
  }

  retryCheckpoint(): RunState | null {
    const run = this.run;
    if (!run) return null;
    const checkpointIndex = Math.max(0, Math.min(run.checkpointObjectiveIndex, OBJECTIVES.length - 1));
    const retainedObjectives = OBJECTIVES.slice(0, checkpointIndex);
    const retainedTargetIds = new Set(retainedObjectives.flatMap((objective) => [...objective.targets]));
    const retainedObjectiveIds = new Set(retainedObjectives.map((objective) => objective.id));
    const retainedFlags = new Set(retainedObjectives.flatMap((objective) => [...(objective.grantsFlags ?? [])]));
    run.completedTargets = run.completedTargets.filter((target) => retainedTargetIds.has(target));
    run.completedObjectives = run.completedObjectives.filter((objective) => retainedObjectiveIds.has(objective));
    run.flags = run.flags.filter((flag) => retainedFlags.has(flag));
    run.xp = retainedObjectives.reduce((total, objective) => total + objective.reward.xp, 0);
    run.coins = retainedObjectives.reduce((total, objective) => total + objective.reward.coins, 0);
    run.level = Math.min(4, [0, 40, 95, 165].filter((threshold) => run.xp >= threshold).length);
    const objective = OBJECTIVES[checkpointIndex] ?? OBJECTIVES[0]!;
    const actSpawn = ACT_SPAWNS[objective.act] ?? ACT_SPAWNS[0]!;
    const spawn = LOCATIONS[actSpawn.locationId].spawns.find((candidate) => candidate.id === actSpawn.spawnId) ?? LOCATIONS.teaRoom.spawns[0]!;
    run.objectiveIndex = checkpointIndex;
    run.locationId = actSpawn.locationId;
    run.spawnId = actSpawn.spawnId;
    run.player = { x: spawn.x, y: spawn.y };
    run.facing = spawn.facing;
    run.failure = null;
    run.meters.health = 100;
    run.meters.stamina = CHARACTERS[run.characterId].stats.maxStamina;
    run.meters.stress = Math.min(run.meters.stress, 30);
    run.meters.wayne = Math.min(run.meters.wayne, 55);
    this.save();
    this.emit('change');
    return cloneRun(run);
  }

  restartShift(): RunState | null { return this.run ? this.newGame(this.run.characterId, this.run.relaxed) : null; }

  updateSettings(patch: Partial<SettingsState>): void {
    this.envelope.settings = { ...this.envelope.settings, ...patch };
    if (this.run && !this.run.finished && patch.relaxed !== undefined) this.run.relaxed = patch.relaxed;
    this.save();
    this.emit('settings');
  }

  resetAll(): void {
    this.envelope = clearSave();
    this.emit('change');
  }

  rank(): Rank {
    const run = this.run;
    if (!run) return 'D';
    const completion = Math.min(1, run.completedObjectives.length / OBJECTIVES.length);
    const score = completion * 55 + run.meters.health * .16 + (100 - run.meters.stress) * .1 + (100 - run.meters.wayne) * .08 + Math.min(11, run.coins / 18);
    return score >= 86 ? 'S' : score >= 74 ? 'A' : score >= 60 ? 'B' : score >= 48 ? 'C' : 'D';
  }

  private completeProfile(): void {
    const run = this.run;
    if (!run) return;
    const order: Rank[] = ['D', 'C', 'B', 'A', 'S'];
    const rank = this.rank();
    const current = this.envelope.profile.bestRank;
    if (!current || order.indexOf(rank) > order.indexOf(current)) this.envelope.profile.bestRank = rank;
    this.envelope.profile.bestCoins = Math.max(this.envelope.profile.bestCoins, run.coins);
    this.envelope.profile.completedRuns += 1;
  }

  private save(): void { persistSave(this.envelope); }
}

export const session = new GameSession();
