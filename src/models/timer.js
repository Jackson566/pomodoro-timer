class Timer {
  constructor(settings = {}) {
    this.workDuration = (settings.workDuration || 25) * 60;
    this.shortBreakDuration = (settings.shortBreakDuration || 5) * 60;
    this.longBreakDuration = (settings.longBreakDuration || 15) * 60;
    this.pomodorosBeforeLongBreak = settings.pomodorosBeforeLongBreak || 4;

    this.state = 'idle'; // idle | running | paused
    this.phase = 'work'; // work | shortBreak | longBreak
    this.pomodorosCompleted = 0;
    this.pomodorosInSet = 0;

    this.totalPhaseSeconds = this.workDuration;
    this.remainingSeconds = this.workDuration;
    this.elapsedAtPause = 0;
    this.startTime = null;
    this.intervalId = null;

    this.onTick = null;
    this.onComplete = null;
  }

  updateSettings(settings) {
    this.workDuration = (settings.workDuration || 25) * 60;
    this.shortBreakDuration = (settings.shortBreakDuration || 5) * 60;
    this.longBreakDuration = (settings.longBreakDuration || 15) * 60;
    this.pomodorosBeforeLongBreak = settings.pomodorosBeforeLongBreak || 4;
    if (this.state === 'idle') {
      this.totalPhaseSeconds = this._phaseDuration();
      this.remainingSeconds = this.totalPhaseSeconds;
    }
  }

  start() {
    if (this.state === 'running') return;
    this.startTime = Date.now();
    this.state = 'running';
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause() {
    if (this.state !== 'running') return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.elapsedAtPause += Math.floor((Date.now() - this.startTime) / 1000);
    this.state = 'paused';
  }

  reset() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = 'idle';
    this.phase = 'work';
    this.pomodorosInSet = 0;
    this.totalPhaseSeconds = this.workDuration;
    this.remainingSeconds = this.workDuration;
    this.elapsedAtPause = 0;
    this.startTime = null;
  }

  skipPhase() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this._transition();
    if (this.state === 'running') {
      this.startTime = Date.now();
      this.elapsedAtPause = 0;
      this.intervalId = setInterval(() => this.tick(), 1000);
    }
  }

  tick() {
    if (this.state !== 'running') return;
    const elapsed = this.elapsedAtPause + Math.floor((Date.now() - this.startTime) / 1000);
    this.remainingSeconds = Math.max(0, this.totalPhaseSeconds - elapsed);

    if (this.onTick) this.onTick(this.remainingSeconds, this.totalPhaseSeconds);

    if (this.remainingSeconds <= 0) {
      this.complete();
    }
  }

  complete() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.elapsedAtPause = 0;
    this.startTime = null;

    if (this.phase === 'work') {
      this.pomodorosCompleted++;
      this.pomodorosInSet++;
    }

    if (this.onComplete) this.onComplete(this.phase);

    this._transition();
  }

  _transition() {
    if (this.phase === 'work') {
      if (this.pomodorosInSet >= this.pomodorosBeforeLongBreak) {
        this.phase = 'longBreak';
        this.pomodorosInSet = 0;
      } else {
        this.phase = 'shortBreak';
      }
    } else {
      this.phase = 'work';
    }

    this.totalPhaseSeconds = this._phaseDuration();
    this.remainingSeconds = this.totalPhaseSeconds;
    this.state = 'idle';
  }

  _phaseDuration() {
    switch (this.phase) {
      case 'work': return this.workDuration;
      case 'shortBreak': return this.shortBreakDuration;
      case 'longBreak': return this.longBreakDuration;
      default: return this.workDuration;
    }
  }

  get phaseLabel() {
    const labels = { work: '专注', shortBreak: '短休息', longBreak: '长休息' };
    return labels[this.phase] || '专注';
  }
}

module.exports = Timer;
