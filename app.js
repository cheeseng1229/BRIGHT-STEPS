// ============================================================================
// BrightSteps — Interactive Learning Hub for Kids (Ages 6–8)
// Supports Dyslexia (Reading/Phonics), Dyscalculia (Visual 10-Frame Math),
// ADHD (Bite-sized Working Memory), and Autism/Exec Function (Routines/Feelings)
// ============================================================================

const STORAGE_KEY = 'brightsteps_state_v1';

const DEFAULT_WORDS = [
  { word: 'CAT', emoji: '🐱', hint: 'A furry pet that says meow' },
  { word: 'DOG', emoji: '🐶', hint: 'A friendly pet that barks and wags its tail' },
  { word: 'SUN', emoji: '☀️', hint: 'Shines bright in the daytime sky' },
  { word: 'FROG', emoji: '🐸', hint: 'Green animal that hops and says ribbit' },
  { word: 'STAR', emoji: '⭐', hint: 'Twinkles in the night sky' },
  { word: 'SHIP', emoji: '🚢', hint: 'Sails across the big blue ocean' },
  { word: 'TREE', emoji: '🌳', hint: 'Tall plant with green leaves and a trunk' },
  { word: 'BOOK', emoji: '📖', hint: 'Open it up to read fun stories' },
  { word: 'FISH', emoji: '🐠', hint: 'Swims underwater with fins' },
  { word: 'JUMP', emoji: '🦘', hint: 'Hop up high with both feet' }
];

const DEFAULT_ROUTINES = [
  { id: 'r1', emoji: '🪥', text: 'Brush my teeth and wash my face', done: false },
  { id: 'r2', emoji: '👕', text: 'Put on my comfy clothes for the day', done: false },
  { id: 'r3', emoji: '🥞', text: 'Eat a healthy meal and drink water', done: false },
  { id: 'r4', emoji: '📖', text: 'Play 2 learning games on BrightSteps', done: false },
  { id: 'r5', emoji: '🧸', text: 'Put away my toys and tidy my space', done: false }
];

const STICKERS = [
  { id: 's1', name: 'Friendly Dino', emoji: '🦕', starsNeeded: 5 },
  { id: 's2', name: 'Super Rocket', emoji: '🚀', starsNeeded: 10 },
  { id: 's3', name: 'Rainbow Unicorn', emoji: '🦄', starsNeeded: 15 },
  { id: 's4', name: 'Ocean Dolphin', emoji: '🐬', starsNeeded: 20 },
  { id: 's5', name: 'Golden Trophy', emoji: '🏆', starsNeeded: 25 },
  { id: 's6', name: 'Clever Owl', emoji: '🦉', starsNeeded: 30 },
  { id: 's7', name: 'Speedy Train', emoji: '🚂', starsNeeded: 35 },
  { id: 's8', name: 'Magic Castle', emoji: '🏰', starsNeeded: 40 },
  { id: 's9', name: 'Space Astronaut', emoji: '🧑‍🚀', starsNeeded: 45 },
  { id: 's10', name: 'Super Crown', emoji: '👑', starsNeeded: 50 }
];

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

// App State
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        childName: parsed.childName || 'Explorer',
        stars: Number(parsed.stars) || 0,
        streak: Number(parsed.streak) || 1,
        voiceEnabled: parsed.voiceEnabled !== undefined ? parsed.voiceEnabled : true,
        dyslexiaSpacing: parsed.dyslexiaSpacing !== undefined ? parsed.dyslexiaSpacing : true,
        stats: {
          wordsBuilt: parsed.stats?.wordsBuilt || 0,
          lettersFound: parsed.stats?.lettersFound || 0,
          mathSolved: parsed.stats?.mathSolved || 0,
          focusWon: parsed.stats?.focusWon || 0,
          routinesDone: parsed.stats?.routinesDone || 0
        },
        words: Array.isArray(parsed.words) && parsed.words.length > 0 ? parsed.words : [...DEFAULT_WORDS],
        routines: Array.isArray(parsed.routines) && parsed.routines.length > 0 ? parsed.routines : [...DEFAULT_ROUTINES]
      };
    }
  } catch (e) {
    console.warn('Could not load saved state:', e);
  }
  return {
    childName: 'Explorer',
    stars: 0,
    streak: 1,
    voiceEnabled: true,
    dyslexiaSpacing: true,
    stats: {
      wordsBuilt: 0,
      lettersFound: 0,
      mathSolved: 0,
      focusWon: 0,
      routinesDone: 0
    },
    words: [...DEFAULT_WORDS],
    routines: [...DEFAULT_ROUTINES]
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save state:', e);
  }
  updateGlobalUI();
}

// ============================================================================
// AUDIO & TEXT-TO-SPEECH (TTS) HELPERS
// ============================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq = 440, duration = 0.15, type = 'sine') {
  if (!state.voiceEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio context restrictions
  }
}

function playSuccessChime() {
  if (!state.voiceEnabled) return;
  playTone(523.25, 0.14, 'triangle'); // C5
  setTimeout(() => playTone(659.25, 0.14, 'triangle'), 110); // E5
  setTimeout(() => playTone(783.99, 0.28, 'triangle'), 220); // G5
}

function playGentleHintTone() {
  if (!state.voiceEnabled) return;
  playTone(330, 0.18, 'sine');
}

function speakText(text, force = false) {
  if (!state.voiceEnabled && !force) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9; // Slightly slower & clearer for 6-8 year olds
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

// ============================================================================
// REWARD SYSTEM (+1 STAR & TOAST)
// ============================================================================
let toastTimeout = null;

function awardStar(reasonText = 'Great job!') {
  state.stars += 1;
  saveState();
  playSuccessChime();

  const toast = document.getElementById('starToast');
  const unlockedSticker = STICKERS.find(s => s.starsNeeded === state.stars);
  if (unlockedSticker) {
    toast.textContent = `🎉 NEW STICKER UNLOCKED: ${unlockedSticker.emoji} ${unlockedSticker.name}!`;
  } else {
    toast.textContent = `⭐ +1 Star! ${reasonText}`;
  }
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

// ============================================================================
// GLOBAL UI & VIEW NAVIGATION
// ============================================================================
function updateGlobalUI() {
  document.getElementById('childGreeting').textContent = `Hi ${state.childName}! Let's learn together`;
  document.getElementById('welcomeHeading').textContent = `What would you like to play today, ${state.childName}?`;
  document.getElementById('starCountDisplay').textContent = state.stars;
  document.getElementById('streakCountDisplay').textContent = state.streak;

  // Activity card stat tags
  document.getElementById('readingStatTag').textContent = `${state.stats.wordsBuilt + state.stats.lettersFound} words & letters`;
  document.getElementById('mathStatTag').textContent = `${state.stats.mathSolved} puzzles solved`;
  document.getElementById('focusStatTag').textContent = `${state.stats.focusWon} games won`;
  const doneCount = state.routines.filter(r => r.done).length;
  document.getElementById('routineStatTag').textContent = `${doneCount} / ${state.routines.length} steps today`;

  // Voice button state
  const voiceBtn = document.getElementById('toggleVoiceBtn');
  const voiceIcon = document.getElementById('voiceIcon');
  voiceBtn.classList.toggle('active', state.voiceEnabled);
  voiceBtn.setAttribute('aria-pressed', String(state.voiceEnabled));
  voiceIcon.textContent = state.voiceEnabled ? '🔊' : '🔇';

  // Dyslexia spacing state
  const dysBtn = document.getElementById('toggleDyslexiaBtn');
  dysBtn.classList.toggle('active', state.dyslexiaSpacing);
  dysBtn.setAttribute('aria-pressed', String(state.dyslexiaSpacing));
  document.body.classList.toggle('dyslexia-friendly', state.dyslexiaSpacing);
}

function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === viewId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewId === 'view-reading') {
    loadCurrentWord();
  } else if (viewId === 'view-math') {
    loadAdditionPuzzle();
  } else if (viewId === 'view-focus') {
    initMemoryGame();
  } else if (viewId === 'view-routine') {
    renderRoutineChecklist();
  }
}

// ============================================================================
// ACTIVITY 1: READING & PHONICS (WORD BUILDER + b/d/p/q DETECTIVE)
// ============================================================================
let currentWordIndex = 0;
let currentBuiltLetters = [];

function loadCurrentWord() {
  if (state.words.length === 0) {
    state.words = [...DEFAULT_WORDS];
  }
  currentWordIndex = currentWordIndex % state.words.length;
  const item = state.words[currentWordIndex];
  const targetWord = item.word.toUpperCase();
  currentBuiltLetters = [];

  document.getElementById('readingProgressText').textContent = `Word ${currentWordIndex + 1} of ${state.words.length}`;
  document.getElementById('wordEmoji').textContent = item.emoji || '📘';
  document.getElementById('wordHint').textContent = item.hint || 'Spell the word shown above';
  document.getElementById('readingFeedback').textContent = '';
  document.getElementById('readingFeedback').className = 'feedback-banner';
  document.getElementById('nextWordBtn').classList.add('hidden');

  // Render target slots
  const slotsContainer = document.getElementById('letterSlotsContainer');
  slotsContainer.innerHTML = '';
  for (let i = 0; i < targetWord.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'letter-slot';
    slot.dataset.index = i;
    slot.textContent = '';
    slotsContainer.appendChild(slot);
  }

  // Create scrambled letter tiles (plus 1 distractor letter for gentle challenge)
  const letters = targetWord.split('');
  const alphabet = 'ABCDEFGHJKLMNPQRSTVWXYZ';
  let distractor = alphabet[Math.floor(Math.random() * alphabet.length)];
  while (letters.includes(distractor)) {
    distractor = alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const pool = [...letters, distractor].map((char, idx) => ({ char, id: idx }));
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const choicesContainer = document.getElementById('letterChoicesContainer');
  choicesContainer.innerHTML = '';
  pool.forEach(tileObj => {
    const btn = document.createElement('button');
    const isVowel = VOWELS.has(tileObj.char);
    btn.className = `letter-tile ${isVowel ? 'vowel-tile' : 'consonant-tile'}`;
    btn.textContent = tileObj.char;
    btn.addEventListener('click', () => handleLetterTileTap(tileObj.char, btn, targetWord));
    choicesContainer.appendChild(btn);
  });
}

function handleLetterTileTap(char, btnElement, targetWord) {
  const nextIndex = currentBuiltLetters.length;
  if (nextIndex >= targetWord.length) return;

  const expectedChar = targetWord[nextIndex];
  const feedbackEl = document.getElementById('readingFeedback');

  if (char === expectedChar) {
    playTone(500 + nextIndex * 60, 0.12, 'sine');
    speakText(char.toLowerCase());
    currentBuiltLetters.push(char);
    btnElement.disabled = true;

    const slots = document.querySelectorAll('#letterSlotsContainer .letter-slot');
    if (slots[nextIndex]) {
      slots[nextIndex].textContent = char;
      slots[nextIndex].classList.add('filled');
    }

    if (currentBuiltLetters.length === targetWord.length) {
      // Completed the word!
      state.stats.wordsBuilt += 1;
      awardStar(`You spelled ${targetWord}!`);
      feedbackEl.textContent = `🎉 Awesome! You spelled ${targetWord}!`;
      feedbackEl.className = 'feedback-banner success';
      document.getElementById('nextWordBtn').classList.remove('hidden');
      setTimeout(() => speakText(`Fantastic! ${targetWord}!`), 450);
    } else {
      feedbackEl.textContent = `Great! Keep going...`;
      feedbackEl.className = 'feedback-banner';
    }
  } else {
    playGentleHintTone();
    feedbackEl.textContent = `💡 Almost! Try looking for the letter "${expectedChar}" next.`;
    feedbackEl.className = 'feedback-banner hint';
    speakText(`Try looking for the letter ${expectedChar.toLowerCase()}`);
  }
}

// Mode B: b / d / p / q Letter Reversal Detective
const DETECTIVE_TARGETS = [
  { letter: 'b', trick: '💡 Trick: "b" has a tall bat first, then a ball on the right (like bed)!' },
  { letter: 'd', trick: '💡 Trick: "d" starts with a round doorknob on the left!' },
  { letter: 'p', trick: '💡 Trick: "p" hangs down low and faces right (like puppy)!' },
  { letter: 'q', trick: '💡 Trick: "q" hangs down and faces left (like queen)!' }
];
let detectiveTargetObj = DETECTIVE_TARGETS[0];
let detectiveRemaining = 0;

function initDetectiveRound() {
  detectiveTargetObj = DETECTIVE_TARGETS[Math.floor(Math.random() * DETECTIVE_TARGETS.length)];
  const target = detectiveTargetObj.letter;

  document.getElementById('targetDetectiveLetter').textContent = target;
  document.getElementById('detectiveMemoryTrick').textContent = detectiveTargetObj.trick;
  document.getElementById('detectiveFeedback').textContent = '';
  document.getElementById('detectiveFeedback').className = 'feedback-banner';

  const distractors = ['b', 'd', 'p', 'q'].filter(l => l !== target);
  const cells = [];
  const targetCount = 4;
  detectiveRemaining = targetCount;

  for (let i = 0; i < targetCount; i++) cells.push(target);
  for (let i = 0; i < 8; i++) {
    cells.push(distractors[Math.floor(Math.random() * distractors.length)]);
  }
  // Shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const grid = document.getElementById('detectiveGrid');
  grid.innerHTML = '';
  cells.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'detective-cell';
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('found')) return;
      if (letter === target) {
        btn.classList.add('found');
        detectiveRemaining -= 1;
        playTone(620, 0.12, 'triangle');
        if (detectiveRemaining === 0) {
          state.stats.lettersFound += 1;
          awardStar(`You found every "${target}"!`);
          const fb = document.getElementById('detectiveFeedback');
          fb.textContent = `🌟 Super Detective! You found all the "${target}" letters!`;
          fb.className = 'feedback-banner success';
          speakText(`Super Detective! You found all of the letter ${target}!`);
        } else {
          document.getElementById('detectiveFeedback').textContent = `Nice! ${detectiveRemaining} more "${target}" left to find!`;
        }
      } else {
        btn.classList.add('wrong-shake');
        playGentleHintTone();
        const fb = document.getElementById('detectiveFeedback');
        fb.textContent = `That one is "${letter}". Look carefully for "${target}"!`;
        fb.className = 'feedback-banner hint';
        speakText(`That is ${letter}. Look for ${target}.`);
      }
    });
    grid.appendChild(btn);
  });
}

// ============================================================================
// ACTIVITY 2: VISUAL MATH & INTERACTIVE 10-FRAME (DYSCALCULIA SUPPORT)
// ============================================================================
let mathA = 3;
let mathB = 2;
let mathPuzzleCount = 1;

function loadAdditionPuzzle() {
  // Generate two numbers whose sum is between 2 and 10 (fits cleanly in a 10-frame)
  mathA = Math.floor(Math.random() * 5) + 1; // 1..5
  mathB = Math.floor(Math.random() * 5) + 1; // 1..5
  const total = mathA + mathB;

  document.getElementById('mathProgressText').textContent = `Puzzle ${mathPuzzleCount}`;
  document.getElementById('mathNumA').textContent = mathA;
  document.getElementById('mathNumB').textContent = mathB;
  document.getElementById('mathAnswerSlot').textContent = '?';
  document.getElementById('mathFeedback').textContent = '';
  document.getElementById('mathFeedback').className = 'feedback-banner';
  document.getElementById('nextMathBtn').classList.add('hidden');

  // Render 10-frame cells
  const frame = document.getElementById('additionTenFrame');
  frame.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const cell = document.createElement('div');
    cell.className = 'ten-frame-cell';
    let itemNumber = i + 1;
    if (i < mathA) {
      cell.textContent = '🔵';
      cell.title = `Tap to count: ${itemNumber}`;
    } else if (i < total) {
      cell.textContent = '⭐';
      cell.title = `Tap to count: ${itemNumber}`;
    } else {
      cell.textContent = '';
    }

    if (i < total) {
      cell.addEventListener('click', () => {
        cell.classList.add('counted-pulse');
        playTone(400 + itemNumber * 35, 0.1, 'sine');
        speakText(String(itemNumber));
      });
    }
    frame.appendChild(cell);
  }

  // Render 4 number choices
  const choicesSet = new Set([total]);
  while (choicesSet.size < 4) {
    const candidate = Math.max(1, Math.min(10, total + (Math.floor(Math.random() * 5) - 2)));
    choicesSet.add(candidate);
  }
  const choices = Array.from(choicesSet).sort((a, b) => a - b);

  const choicesContainer = document.getElementById('mathChoicesContainer');
  choicesContainer.innerHTML = '';
  choices.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'num-choice-btn';
    btn.textContent = num;
    btn.addEventListener('click', () => {
      const fb = document.getElementById('mathFeedback');
      if (num === total) {
        document.getElementById('mathAnswerSlot').textContent = total;
        state.stats.mathSolved += 1;
        mathPuzzleCount += 1;
        awardStar(`${mathA} + ${mathB} = ${total}!`);
        fb.textContent = `🎉 Yes! ${mathA} plus ${mathB} equals ${total}!`;
        fb.className = 'feedback-banner success';
        document.getElementById('nextMathBtn').classList.remove('hidden');
        speakText(`Yes! ${mathA} plus ${mathB} equals ${total}!`);
      } else {
        playGentleHintTone();
        fb.textContent = `💡 Let's count each dot in the 10-frame box! Tap "Count Together Out Loud" below.`;
        fb.className = 'feedback-banner hint';
        speakText(`Not quite ${num}. Let's tap and count the dots in the box together!`);
      }
    });
    choicesContainer.appendChild(btn);
  });
}

function countAdditionTenFrameAloud() {
  const total = mathA + mathB;
  const cells = document.querySelectorAll('#additionTenFrame .ten-frame-cell');
  cells.forEach(c => c.classList.remove('counted-pulse'));

  for (let i = 0; i < total; i++) {
    setTimeout(() => {
      if (cells[i]) {
        cells[i].classList.add('counted-pulse');
        playTone(400 + (i + 1) * 35, 0.1, 'sine');
        speakText(String(i + 1));
      }
    }, i * 650);
  }
}

// Mode B: Interactive Fill the 10-Frame
let tenFrameTarget = 6;
let tenFrameFilled = Array(10).fill(false);

function initInteractiveTenFrame() {
  tenFrameTarget = Math.floor(Math.random() * 9) + 2; // 2..10
  tenFrameFilled = Array(10).fill(false);
  document.getElementById('tenFrameTargetNum').textContent = tenFrameTarget;
  document.getElementById('tenFrameGoalCount').textContent = tenFrameTarget;
  document.getElementById('tenFrameFeedback').textContent = '';
  document.getElementById('tenFrameFeedback').className = 'feedback-banner';
  renderInteractiveTenFrameCells();
}

function renderInteractiveTenFrameCells() {
  const currentCount = tenFrameFilled.filter(Boolean).length;
  document.getElementById('tenFrameCurrentCount').textContent = currentCount;

  const container = document.getElementById('interactiveTenFrame');
  container.innerHTML = '';
  tenFrameFilled.forEach((isFilled, idx) => {
    const cell = document.createElement('div');
    cell.className = `ten-frame-cell ${isFilled ? 'counted-pulse' : ''}`;
    cell.textContent = isFilled ? '🍎' : '';
    cell.addEventListener('click', () => {
      tenFrameFilled[idx] = !tenFrameFilled[idx];
      const newCount = tenFrameFilled.filter(Boolean).length;
      playTone(380 + newCount * 40, 0.1, 'sine');
      speakText(String(newCount));
      renderInteractiveTenFrameCells();
    });
    container.appendChild(cell);
  });
}

// ============================================================================
// ACTIVITY 3: FOCUS & WORKING MEMORY (ADHD SUPPORT)
// ============================================================================
const MEMORY_ITEMS = [
  { emoji: '🐶', word: 'Dog' },
  { emoji: '🦖', word: 'Dino' },
  { emoji: '🚀', word: 'Rocket' },
  { emoji: '🌈', word: 'Rainbow' },
  { emoji: '🐢', word: 'Turtle' },
  { emoji: '🍕', word: 'Pizza' }
];

let memoryFlipped = [];
let memoryMatchedCount = 0;
let memoryLock = false;

function initMemoryGame() {
  memoryFlipped = [];
  memoryMatchedCount = 0;
  memoryLock = false;
  document.getElementById('focusProgressText').textContent = `Pairs: 0 / 4`;
  document.getElementById('memoryFeedback').textContent = '';
  document.getElementById('memoryFeedback').className = 'feedback-banner';

  // Pick 4 pairs (8 cards total — ideal bite-sized load for 6-8yo ADHD focus)
  const chosen = MEMORY_ITEMS.slice(0, 4);
  const deck = [...chosen, ...chosen].map((item, index) => ({
    ...item,
    id: index,
    matched: false
  }));

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const board = document.getElementById('memoryBoard');
  board.innerHTML = '';

  deck.forEach(cardData => {
    const cardBtn = document.createElement('button');
    cardBtn.className = 'memory-card';
    cardBtn.innerHTML = `<span>❓</span>`;
    cardBtn.addEventListener('click', () => handleMemoryCardClick(cardBtn, cardData));
    board.appendChild(cardBtn);
  });
}

function handleMemoryCardClick(cardBtn, cardData) {
  if (memoryLock || cardData.matched || memoryFlipped.some(f => f.cardData.id === cardData.id)) {
    return;
  }

  cardBtn.classList.add('flipped');
  cardBtn.innerHTML = `<span>${cardData.emoji}</span><span class="card-word">${cardData.word}</span>`;
  playTone(520, 0.1, 'sine');
  speakText(cardData.word);

  memoryFlipped.push({ cardBtn, cardData });

  if (memoryFlipped.length === 2) {
    memoryLock = true;
    const [first, second] = memoryFlipped;
    if (first.cardData.word === second.cardData.word) {
      first.cardData.matched = true;
      second.cardData.matched = true;
      first.cardBtn.classList.add('matched');
      second.cardBtn.classList.add('matched');
      memoryMatchedCount += 1;
      memoryFlipped = [];
      memoryLock = false;

      document.getElementById('focusProgressText').textContent = `Pairs: ${memoryMatchedCount} / 4`;

      if (memoryMatchedCount === 4) {
        state.stats.focusWon += 1;
        awardStar('You matched all the pairs!');
        const fb = document.getElementById('memoryFeedback');
        fb.textContent = '🎉 Amazing focus! You found all 4 pairs!';
        fb.className = 'feedback-banner success';
        speakText('Amazing focus! You found all four pairs!');
      } else {
        document.getElementById('memoryFeedback').textContent = `✨ Match found: ${first.cardData.word}!`;
      }
    } else {
      setTimeout(() => {
        first.cardBtn.classList.remove('flipped');
        first.cardBtn.innerHTML = `<span>❓</span>`;
        second.cardBtn.classList.remove('flipped');
        second.cardBtn.innerHTML = `<span>❓</span>`;
        memoryFlipped = [];
        memoryLock = false;
      }, 950);
    }
  }
}

// Mode B: Sound & Color Pattern Sequence
const PAD_TONES = [329.63, 392.0, 440.0, 523.25];
const PAD_NAMES = ['Red', 'Blue', 'Green', 'Yellow'];
let patternSequence = [];
let playerPatternIndex = 0;
let patternPlaying = false;

function startPatternRound() {
  if (patternPlaying) return;
  patternSequence = [];
  const length = 3; // Calm 3-step sequence
  for (let i = 0; i < length; i++) {
    patternSequence.push(Math.floor(Math.random() * 4));
  }
  playerPatternIndex = 0;
  document.getElementById('patternFeedback').textContent = '';
  document.getElementById('patternStatus').textContent = '👀 Watch carefully...';
  playPatternSequence();
}

function playPatternSequence() {
  patternPlaying = true;
  patternSequence.forEach((padIdx, step) => {
    setTimeout(() => {
      flashPad(padIdx);
      if (step === patternSequence.length - 1) {
        setTimeout(() => {
          patternPlaying = false;
          document.getElementById('patternStatus').textContent = '👆 Now your turn! Tap the pads in the same order!';
        }, 600);
      }
    }, (step + 1) * 750);
  });
}

function flashPad(padIdx) {
  const pad = document.querySelector(`.pattern-pad[data-pad="${padIdx}"]`);
  if (!pad) return;
  pad.classList.add('lit');
  playTone(PAD_TONES[padIdx], 0.25, 'triangle');
  setTimeout(() => pad.classList.remove('lit'), 420);
}

function handlePatternPadTap(padIdx) {
  if (patternPlaying || patternSequence.length === 0) return;
  flashPad(padIdx);

  if (padIdx === patternSequence[playerPatternIndex]) {
    playerPatternIndex += 1;
    if (playerPatternIndex === patternSequence.length) {
      state.stats.focusWon += 1;
      awardStar('You remembered the whole pattern!');
      const fb = document.getElementById('patternFeedback');
      fb.textContent = '🎉 Super Memory! You repeated the whole pattern!';
      fb.className = 'feedback-banner success';
      document.getElementById('patternStatus').textContent = 'Press "Watch Pattern" to play again!';
      patternSequence = [];
      speakText('Super memory! You repeated the whole pattern!');
    }
  } else {
    playGentleHintTone();
    const fb = document.getElementById('patternFeedback');
    fb.textContent = '💡 Oops! Let’s watch the pattern one more time!';
    fb.className = 'feedback-banner hint';
    playerPatternIndex = 0;
    setTimeout(() => playPatternSequence(), 900);
  }
}

// ============================================================================
// ACTIVITY 4: VISUAL ROUTINE & FEELINGS CHECK-IN
// ============================================================================
function renderRoutineChecklist() {
  const container = document.getElementById('routineListContainer');
  container.innerHTML = '';

  const doneCount = state.routines.filter(r => r.done).length;
  const totalCount = state.routines.length || 1;
  const pct = Math.round((doneCount / totalCount) * 100);

  document.getElementById('routineProgressHeader').textContent = `${doneCount} of ${state.routines.length} Done`;
  document.getElementById('routineProgressBar').style.width = `${pct}%`;

  state.routines.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = `routine-item ${item.done ? 'done' : ''}`;
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.innerHTML = `
      <div class="routine-item-left">
        <span class="routine-emoji">${item.emoji || '⭐'}</span>
        <span class="routine-title">${item.text}</span>
      </div>
      <div class="routine-check">${item.done ? '✔' : ''}</div>
    `;

    row.addEventListener('click', () => {
      item.done = !item.done;
      if (item.done) {
        state.stats.routinesDone += 1;
        awardStar('Step completed!');
        speakText(`Great job! ${item.text} is done!`);
      } else {
        speakText(item.text);
      }
      saveState();
      renderRoutineChecklist();
    });

    container.appendChild(row);
  });
}

// ============================================================================
// CALM BREATHING CORNER MODAL
// ============================================================================
let breathingInterval = null;
let isBreathingActive = false;

function toggleBreathingExercise() {
  const circle = document.getElementById('breathingCircle');
  const text = document.getElementById('breathingText');
  const btn = document.getElementById('toggleBreathingBtn');

  if (isBreathingActive) {
    stopBreathingExercise();
    return;
  }

  isBreathingActive = true;
  btn.textContent = '⏹️ Stop Breathing Guide';

  let phase = 'inhale';
  const runCycle = () => {
    if (!isBreathingActive) return;
    if (phase === 'inhale') {
      circle.className = 'breathing-circle inhale';
      text.textContent = 'Breathe In... 1, 2, 3, 4';
      speakText('Breathe in slowly');
      phase = 'exhale';
    } else {
      circle.className = 'breathing-circle exhale';
      text.textContent = 'Breathe Out... 1, 2, 3, 4';
      speakText('Breathe out gently');
      phase = 'inhale';
    }
  };

  runCycle();
  breathingInterval = setInterval(runCycle, 4200);
}

function stopBreathingExercise() {
  isBreathingActive = false;
  clearInterval(breathingInterval);
  const circle = document.getElementById('breathingCircle');
  const text = document.getElementById('breathingText');
  const btn = document.getElementById('toggleBreathingBtn');
  if (circle) circle.className = 'breathing-circle';
  if (text) text.textContent = 'Tap Start';
  if (btn) btn.textContent = '▶️ Start Breathing Together';
}

// ============================================================================
// STICKER BOOK & PARENT DASHBOARD MODALS
// ============================================================================
function renderStickerBook() {
  const grid = document.getElementById('stickerGrid');
  grid.innerHTML = '';

  const nextSticker = STICKERS.find(s => s.starsNeeded > state.stars);
  const banner = document.getElementById('stickerNextBanner');
  if (nextSticker) {
    const needed = nextSticker.starsNeeded - state.stars;
    banner.textContent = `You have ${state.stars} ⭐! Earn ${needed} more star${needed === 1 ? '' : 's'} to unlock ${nextSticker.emoji} ${nextSticker.name}!`;
  } else {
    banner.textContent = `🎉 AMAZING! You unlocked every single sticker in the book!`;
  }

  STICKERS.forEach(sticker => {
    const unlocked = state.stars >= sticker.starsNeeded;
    const card = document.createElement('div');
    card.className = `sticker-slot ${unlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div class="sticker-emoji">${sticker.emoji}</div>
      <div class="sticker-name">${unlocked ? sticker.name : `${sticker.starsNeeded} ⭐`}</div>
    `;
    if (unlocked) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => speakText(sticker.name));
    }
    grid.appendChild(card);
  });
}

function renderParentDashboard() {
  document.getElementById('childNameInput').value = state.childName;

  // Render stats summary
  const statsGrid = document.getElementById('parentStatsGrid');
  statsGrid.innerHTML = `
    <div class="stat-mini-card"><strong>${state.stars} ⭐</strong><span>Total Stars</span></div>
    <div class="stat-mini-card"><strong>${state.stats.wordsBuilt}</strong><span>Words Built</span></div>
    <div class="stat-mini-card"><strong>${state.stats.lettersFound}</strong><span>b/d/p/q Rounds</span></div>
    <div class="stat-mini-card"><strong>${state.stats.mathSolved}</strong><span>Math Solved</span></div>
    <div class="stat-mini-card"><strong>${state.stats.focusWon}</strong><span>Focus Games</span></div>
    <div class="stat-mini-card"><strong>${state.stats.routinesDone}</strong><span>Routine Steps</span></div>
  `;

  // Render custom words list
  const wordListEl = document.getElementById('parentWordList');
  wordListEl.innerHTML = '';
  state.words.forEach((w, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${w.emoji} <strong>${w.word}</strong> — ${w.hint}</span>
      <button class="remove-item-btn" data-idx="${idx}">Remove</button>
    `;
    li.querySelector('.remove-item-btn').addEventListener('click', () => {
      if (state.words.length <= 1) {
        alert('Please keep at least 1 word in the list.');
        return;
      }
      state.words.splice(idx, 1);
      saveState();
      renderParentDashboard();
      loadCurrentWord();
    });
    wordListEl.appendChild(li);
  });

  // Render custom routines list
  const routineListEl = document.getElementById('parentRoutineList');
  routineListEl.innerHTML = '';
  state.routines.forEach((r, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${r.emoji} ${r.text}</span>
      <button class="remove-item-btn" data-idx="${idx}">Remove</button>
    `;
    li.querySelector('.remove-item-btn').addEventListener('click', () => {
      state.routines.splice(idx, 1);
      saveState();
      renderParentDashboard();
      renderRoutineChecklist();
    });
    routineListEl.appendChild(li);
  });
}

// ============================================================================
// EVENT LISTENERS INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  updateGlobalUI();

  // Home navigation
  document.getElementById('homeLogoBtn').addEventListener('click', () => showView('view-home'));
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.back || 'view-home'));
  });

  document.querySelectorAll('.activity-card').forEach(card => {
    card.addEventListener('click', () => showView(card.dataset.target));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showView(card.dataset.target);
      }
    });
  });

  // Top bar toggles
  document.getElementById('toggleVoiceBtn').addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    saveState();
    if (state.voiceEnabled) speakText('Voice read aloud is on');
  });

  document.getElementById('toggleDyslexiaBtn').addEventListener('click', () => {
    state.dyslexiaSpacing = !state.dyslexiaSpacing;
    saveState();
  });

  document.getElementById('speakWelcomeBtn').addEventListener('click', () => {
    speakText(`Hi ${state.childName}! What would you like to play today? Tap Reading, Math, Focus Games, or My Daily Routine!`, true);
  });

  // Reading view tabs & controls
  document.getElementById('tabWordBuilder').addEventListener('click', () => {
    document.getElementById('tabWordBuilder').classList.add('active');
    document.getElementById('tabLetterDetective').classList.remove('active');
    document.getElementById('readingModeBuilder').classList.add('active');
    document.getElementById('readingModeDetective').classList.remove('active');
    loadCurrentWord();
  });

  document.getElementById('tabLetterDetective').addEventListener('click', () => {
    document.getElementById('tabLetterDetective').classList.add('active');
    document.getElementById('tabWordBuilder').classList.remove('active');
    document.getElementById('readingModeDetective').classList.add('active');
    document.getElementById('readingModeBuilder').classList.remove('active');
    initDetectiveRound();
  });

  document.getElementById('speakWordBtn').addEventListener('click', () => {
    const item = state.words[currentWordIndex % state.words.length];
    speakText(`The word is ${item.word}. ${item.hint}`, true);
  });

  document.getElementById('readingHintBtn').addEventListener('click', () => {
    const item = state.words[currentWordIndex % state.words.length];
    const targetWord = item.word.toUpperCase();
    const nextIdx = currentBuiltLetters.length;
    if (nextIdx < targetWord.length) {
      const nextChar = targetWord[nextIdx];
      const fb = document.getElementById('readingFeedback');
      fb.textContent = `💡 Hint: The next letter is "${nextChar}"!`;
      fb.className = 'feedback-banner hint';
      speakText(`The next letter is ${nextChar}`, true);
    }
  });

  document.getElementById('nextWordBtn').addEventListener('click', () => {
    currentWordIndex = (currentWordIndex + 1) % state.words.length;
    loadCurrentWord();
  });

  document.getElementById('speakDetectiveBtn').addEventListener('click', () => {
    speakText(`Find all the circles with the letter ${detectiveTargetObj.letter}. ${detectiveTargetObj.trick}`, true);
  });

  document.getElementById('newDetectiveRoundBtn').addEventListener('click', initDetectiveRound);

  // Math view tabs & controls
  document.getElementById('tabMathAddition').addEventListener('click', () => {
    document.getElementById('tabMathAddition').classList.add('active');
    document.getElementById('tabMathTenFrame').classList.remove('active');
    document.getElementById('mathModeAddition').classList.add('active');
    document.getElementById('mathModeTenFrame').classList.remove('active');
    loadAdditionPuzzle();
  });

  document.getElementById('tabMathTenFrame').addEventListener('click', () => {
    document.getElementById('tabMathTenFrame').classList.add('active');
    document.getElementById('tabMathAddition').classList.remove('active');
    document.getElementById('mathModeTenFrame').classList.add('active');
    document.getElementById('mathModeAddition').classList.remove('active');
    initInteractiveTenFrame();
  });

  document.getElementById('speakMathBtn').addEventListener('click', () => {
    speakText(`What is ${mathA} plus ${mathB}? Tap the dots inside the box to count them out loud!`, true);
  });

  document.getElementById('countAllAloudBtn').addEventListener('click', countAdditionTenFrameAloud);
  document.getElementById('nextMathBtn').addEventListener('click', loadAdditionPuzzle);

  document.getElementById('speakTenFrameBtn').addEventListener('click', () => {
    speakText(`Tap the boxes to put ${tenFrameTarget} apples inside the ten frame!`, true);
  });

  document.getElementById('clearTenFrameBtn').addEventListener('click', () => {
    tenFrameFilled = Array(10).fill(false);
    renderInteractiveTenFrameCells();
  });

  document.getElementById('checkTenFrameBtn').addEventListener('click', () => {
    const count = tenFrameFilled.filter(Boolean).length;
    const fb = document.getElementById('tenFrameFeedback');
    if (count === tenFrameTarget) {
      state.stats.mathSolved += 1;
      awardStar(`You counted ${tenFrameTarget} apples!`);
      fb.textContent = `🎉 Spot on! That is ${tenFrameTarget} apples! Let's try a new number!`;
      fb.className = 'feedback-banner success';
      speakText(`Spot on! That is ${tenFrameTarget} apples!`);
      setTimeout(initInteractiveTenFrame, 1800);
    } else if (count < tenFrameTarget) {
      playGentleHintTone();
      const diff = tenFrameTarget - count;
      fb.textContent = `💡 You have ${count}. Tap ${diff} more box${diff === 1 ? '' : 'es'} to reach ${tenFrameTarget}!`;
      fb.className = 'feedback-banner hint';
      speakText(`You have ${count}. Add ${diff} more to make ${tenFrameTarget}.`);
    } else {
      playGentleHintTone();
      const diff = count - tenFrameTarget;
      fb.textContent = `💡 You have ${count}. Tap ${diff} apple${diff === 1 ? '' : 's'} to take ${diff === 1 ? 'it' : 'them'} away!`;
      fb.className = 'feedback-banner hint';
      speakText(`You have ${count}. Take away ${diff} to make ${tenFrameTarget}.`);
    }
  });

  // Focus view tabs & controls
  document.getElementById('tabMemoryMatch').addEventListener('click', () => {
    document.getElementById('tabMemoryMatch').classList.add('active');
    document.getElementById('tabPatternRepeat').classList.remove('active');
    document.getElementById('focusModeMatch').classList.add('active');
    document.getElementById('focusModePattern').classList.remove('active');
    initMemoryGame();
  });

  document.getElementById('tabPatternRepeat').addEventListener('click', () => {
    document.getElementById('tabPatternRepeat').classList.add('active');
    document.getElementById('tabMemoryMatch').classList.remove('active');
    document.getElementById('focusModePattern').classList.add('active');
    document.getElementById('focusModeMatch').classList.remove('active');
  });

  document.getElementById('speakFocusMatchBtn').addEventListener('click', () => {
    speakText('Flip two cards at a time to find the matching picture pairs!', true);
  });

  document.getElementById('restartMemoryBtn').addEventListener('click', initMemoryGame);

  document.getElementById('speakPatternBtn').addEventListener('click', () => {
    speakText('Press Watch Pattern, then tap the colored pads in the exact same order!', true);
  });

  document.getElementById('startPatternBtn').addEventListener('click', startPatternRound);

  document.querySelectorAll('.pattern-pad').forEach(pad => {
    pad.addEventListener('click', () => handlePatternPadTap(Number(pad.dataset.pad)));
  });

  // Routine & Feelings controls
  document.getElementById('speakRoutineBtn').addEventListener('click', () => {
    const remaining = state.routines.filter(r => !r.done);
    if (remaining.length === 0) {
      speakText('Hooray! You finished all your steps for today!', true);
    } else {
      speakText(`Your next step is: ${remaining[0].text}`, true);
    }
  });

  document.getElementById('resetRoutineDayBtn').addEventListener('click', () => {
    state.routines.forEach(r => { r.done = false; });
    saveState();
    renderRoutineChecklist();
    speakText('Fresh day started! Ready for step one.');
  });

  document.querySelectorAll('.feeling-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feeling-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const feeling = btn.dataset.feeling;
      const advice = btn.dataset.advice;
      const box = document.getElementById('feelingResponseBox');
      const textEl = document.getElementById('feelingResponseText');
      textEl.textContent = `💬 "${feeling}" — ${advice}`;
      box.classList.remove('hidden');
      speakText(`You feel ${feeling}. ${advice}`);
    });
  });

  document.getElementById('feelingToBreathBtn').addEventListener('click', () => {
    document.getElementById('calmModal').classList.remove('hidden');
  });

  // Modals: Sticker Book
  document.getElementById('openStickerBookBtn').addEventListener('click', () => {
    renderStickerBook();
    document.getElementById('stickerModal').classList.remove('hidden');
  });

  document.getElementById('closeStickerModalBtn').addEventListener('click', () => {
    document.getElementById('stickerModal').classList.add('hidden');
  });

  // Modals: Calm Breathing Corner
  document.getElementById('openCalmCornerBtn').addEventListener('click', () => {
    document.getElementById('calmModal').classList.remove('hidden');
  });

  document.getElementById('closeCalmModalBtn').addEventListener('click', () => {
    stopBreathingExercise();
    document.getElementById('calmModal').classList.add('hidden');
  });

  document.getElementById('toggleBreathingBtn').addEventListener('click', toggleBreathingExercise);

  // Modals: Parent Dashboard
  document.getElementById('openParentBtn').addEventListener('click', () => {
    renderParentDashboard();
    document.getElementById('parentModal').classList.remove('hidden');
  });

  document.getElementById('closeParentModalBtn').addEventListener('click', () => {
    document.getElementById('parentModal').classList.add('hidden');
  });

  document.getElementById('saveChildNameBtn').addEventListener('click', () => {
    const val = document.getElementById('childNameInput').value.trim();
    if (val) {
      state.childName = val;
      saveState();
      renderParentDashboard();
    }
  });

  document.getElementById('addCustomWordBtn').addEventListener('click', () => {
    const wordVal = document.getElementById('customWordInput').value.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const emojiVal = document.getElementById('customEmojiInput').value.trim() || '🌟';
    const hintVal = document.getElementById('customHintInput').value.trim() || `Spell the word ${wordVal}`;
    if (!wordVal) return;

    state.words.unshift({ word: wordVal, emoji: emojiVal, hint: hintVal });
    document.getElementById('customWordInput').value = '';
    document.getElementById('customEmojiInput').value = '';
    document.getElementById('customHintInput').value = '';
    saveState();
    renderParentDashboard();
    loadCurrentWord();
  });

  document.getElementById('addCustomRoutineBtn').addEventListener('click', () => {
    const emojiVal = document.getElementById('customRoutineEmoji').value.trim() || '✅';
    const textVal = document.getElementById('customRoutineText').value.trim();
    if (!textVal) return;

    state.routines.push({
      id: 'r_' + Date.now(),
      emoji: emojiVal,
      text: textVal,
      done: false
    });
    document.getElementById('customRoutineEmoji').value = '';
    document.getElementById('customRoutineText').value = '';
    saveState();
    renderParentDashboard();
    renderRoutineChecklist();
  });

  document.getElementById('resetAllProgressBtn').addEventListener('click', () => {
    if (confirm('Reset stars and activity counts back to 0? Custom words and routine steps will be kept.')) {
      state.stars = 0;
      state.stats = { wordsBuilt: 0, lettersFound: 0, mathSolved: 0, focusWon: 0, routinesDone: 0 };
      saveState();
      renderParentDashboard();
    }
  });

  // Close modals when clicking outside card
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        stopBreathingExercise();
        overlay.classList.add('hidden');
      }
    });
  });

  // Initial load of default sub-activities
  loadCurrentWord();
  initDetectiveRound();
  loadAdditionPuzzle();
  initInteractiveTenFrame();
  initMemoryGame();
  renderRoutineChecklist();
});
