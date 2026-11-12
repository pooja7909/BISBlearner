import type { ClassroomActivity } from '../types.ts';

export const STARTER_ACTIVITIES: ClassroomActivity[] = [
  {
    id: 'starter-ks1-living-things',
    title: 'Living, Once Alive, or Never Alive',
    topic: 'Living Things and Their Habitats',
    yearGroup: 'Year 1-2 (KS1)',
    subject: 'Science',
    objectives: [
      'Explore and compare differences between things that are living, dead, and things that have never been alive.',
      'Explain simple reasons using observable clues like growing, feeding, or breathing.',
    ],
    format: 'sort',
    differentiation: 'Visual & EAL Support',
    estimatedMinutes: 8,
    teacherTip:
      'Invite pairs to discuss each object for 15 seconds using the stem "I think this belongs in ___ because..." before tapping the bucket on the board.',
    inclusionNote:
      'Turn on Read Aloud for emerging readers. Point out tricky items like wooden spoons and fallen leaves that used to be part of a living tree.',
    createdAt: '2026-10-01T09:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'sort',
      instructions:
        'Select each everyday object, then place it into the group that fits it best.',
      buckets: [
        {
          id: 'living',
          label: 'Living Now',
          description: 'Grows, needs food or water, and breathes or responds.',
        },
        {
          id: 'once-alive',
          label: 'Once Alive',
          description: 'Used to be living or came from a living plant or animal.',
        },
        {
          id: 'never-alive',
          label: 'Never Alive',
          description: 'Made of rock, metal, plastic, or glass — never grew.',
        },
      ],
      items: [
        {
          id: 'item-1',
          text: 'Sunflower in a pot',
          bucketId: 'living',
          reason: 'A sunflower grows toward sunlight, drinks water, and makes seeds.',
        },
        {
          id: 'item-2',
          text: 'Wooden classroom ruler',
          bucketId: 'once-alive',
          reason: 'Wood comes from a tree that used to be alive.',
        },
        {
          id: 'item-3',
          text: 'Stainless steel spoon',
          bucketId: 'never-alive',
          reason: 'Metal comes from rocks in the ground and has never been alive.',
        },
        {
          id: 'item-4',
          text: 'Garden worm',
          bucketId: 'living',
          reason: 'A worm moves, eats decaying leaves, and grows.',
        },
        {
          id: 'item-5',
          text: 'Dry autumn leaf on the path',
          bucketId: 'once-alive',
          reason: 'The leaf grew on a tree, even though it has now fallen off.',
        },
        {
          id: 'item-6',
          text: 'Glass marble',
          bucketId: 'never-alive',
          reason: 'Glass is made by heating sand and has never grown or breathed.',
        },
        {
          id: 'item-7',
          text: 'Woollen winter scarf',
          bucketId: 'once-alive',
          reason: 'Wool grows on sheep, which are living animals.',
        },
        {
          id: 'item-8',
          text: 'Class goldfish',
          bucketId: 'living',
          reason: 'A goldfish swims, eats food, and breathes oxygen in the water.',
        },
      ],
    },
  },
  {
    id: 'starter-ks2-fractions-match',
    title: 'Fraction Equivalents & Everyday Measures',
    topic: 'Equivalent Fractions and Decimals',
    yearGroup: 'Year 3-4 (Lower KS2)',
    subject: 'Mathematics',
    objectives: [
      'Recognise and show families of common equivalent fractions.',
      'Connect halves, quarters, and tenths to everyday real-world quantities.',
    ],
    format: 'match',
    differentiation: 'All Learners',
    estimatedMinutes: 10,
    teacherTip:
      'Ask students to prove why two cards match by sketching a quick bar model on mini-whiteboards before locking the pair on screen.',
    inclusionNote:
      'Encourage students needing support to simplify fractions by halving top and bottom numbers together.',
    createdAt: '2026-10-02T09:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'match',
      instructions:
        'Select a fraction on the left, then select its matching equivalent value on the right.',
      leftHeading: 'Fraction Card',
      rightHeading: 'Equivalent Form',
      pairs: [
        {
          id: 'p1',
          left: '1 / 2',
          right: '5 / 10 (half of a whole)',
          connectionNote: 'Multiply numerator and denominator by 5: 1×5 = 5, 2×5 = 10.',
        },
        {
          id: 'p2',
          left: '1 / 4',
          right: '2 / 8 (15 mins of an hour)',
          connectionNote: '15 out of 60 minutes is one quarter, which equals 2/8.',
        },
        {
          id: 'p3',
          left: '3 / 4',
          right: '6 / 8 (75p out of £1)',
          connectionNote: 'Three 25p coins make 75p, which is three quarters of 100p.',
        },
        {
          id: 'p4',
          left: '2 / 5',
          right: '4 / 10 (0.4)',
          connectionNote: 'Doubling both parts of 2/5 gives 4/10, written as 0.4.',
        },
        {
          id: 'p5',
          left: '1 / 3',
          right: '4 / 12 (4 months of a year)',
          connectionNote: '4 out of 12 months simplifies by dividing by 4 to get 1/3.',
        },
        {
          id: 'p6',
          left: '3 / 6',
          right: '50 / 100 (50%)',
          connectionNote: '3 is half of 6, just as 50 is half of 100.',
        },
      ],
    },
  },
  {
    id: 'starter-ks2-river-journey',
    title: 'Journey of a River from Source to Mouth',
    topic: 'Rivers and the Water Cycle',
    yearGroup: 'Year 5-6 (Upper KS2)',
    subject: 'Geography',
    objectives: [
      'Describe the physical features of a river across its upper, middle, and lower courses.',
      'Use geographical vocabulary accurately: source, tributary, meander, floodplain, and estuary.',
    ],
    format: 'sequence',
    differentiation: 'All Learners',
    estimatedMinutes: 10,
    teacherTip:
      'Have students trace the altitude change with their hands (high mountains down to flat sea level) as they check each stage.',
    inclusionNote:
      'Use the Clue toggle to reveal geographical landforms for students building confidence with Tier 3 vocabulary.',
    createdAt: '2026-10-03T09:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'sequence',
      instructions:
        'Arrange the six river stages in order from high upland beginnings to where the river meets the sea.',
      steps: [
        {
          id: 's1',
          order: 1,
          label: 'Mountain Source & Spring',
          detail: 'Rain and melting snow collect in boggy upland ground to start a narrow trickle.',
          clue: 'Begins at the highest elevation in the upper course.',
        },
        {
          id: 's2',
          order: 2,
          label: 'V-Shaped Valley & Waterfall',
          detail: 'Fast-flowing water erodes steep rock ledges downward into narrow valleys.',
          clue: 'Steep gradients create vertical erosion and cascades.',
        },
        {
          id: 's3',
          order: 3,
          label: 'Confluence with a Tributary',
          detail: 'Smaller streams join the main channel, increasing the river volume and width.',
          clue: 'Two channels merge before the land flattens out.',
        },
        {
          id: 's4',
          order: 4,
          label: 'Wide Meanders on the Floodplain',
          detail: 'In the middle course, the river bends side-to-side across flat valley land.',
          clue: 'Lateral erosion carves sweeping S-shaped curves.',
        },
        {
          id: 's5',
          order: 5,
          label: 'Deposition of Silt & Sandbars',
          detail: 'Slowing water drops heavy sediment along the inside bends and broad banks.',
          clue: 'Water slows near the coast and can no longer carry heavy pebbles.',
        },
        {
          id: 's6',
          order: 6,
          label: 'Tidal Estuary & River Mouth',
          detail: 'Fresh river water mixes with salty seawater as the channel widens into the ocean.',
          clue: 'The final boundary where river meets sea.',
        },
      ],
    },
  },
  {
    id: 'starter-ks3-periodic-bingo',
    title: 'Atoms, Elements & Reactions Bingo',
    topic: 'Chemical Symbols and Reactions',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'Science',
    objectives: [
      'Recall key element symbols, particle charges, and reaction types rapidly.',
      'Connect laboratory clues to chemical terminology in a fast-paced game.',
    ],
    format: 'bingo',
    differentiation: 'All Learners',
    estimatedMinutes: 10,
    teacherTip:
      'Turn on Upbeat Game Show music and draw clues one at a time. Award 5 team points to the first line of 3 and 10 points for a Full House!',
    inclusionNote:
      'Use Read Aloud on clues so EAL students hear the pronunciation alongside the printed grid.',
    createdAt: '2026-10-04T10:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'bingo',
      instructions:
        'Draw clues one by one. Tap the matching scientific term on your 3×3 Bingo card to complete a line or full house.',
      entries: [
        { id: 'bg-1', term: 'Sodium (Na)', clue: 'Alkali metal that fizzes rapidly on water and has symbol Na.' },
        { id: 'bg-2', term: 'Proton', clue: 'Subatomic particle inside the nucleus with a +1 charge.' },
        { id: 'bg-3', term: 'Exothermic', clue: 'A reaction that transfers heat energy out to the surroundings.' },
        { id: 'bg-4', term: 'Carbon Dioxide', clue: 'Gas that turns limewater milky.' },
        { id: 'bg-5', term: 'Catalyst', clue: 'Substance that speeds up a reaction without being used up.' },
        { id: 'bg-6', term: 'Neutralisation', clue: 'Reaction between an acid and an alkali forming salt and water.' },
        { id: 'bg-7', term: 'Electron', clue: 'Negatively charged particle orbiting the nucleus in shells.' },
        { id: 'bg-8', term: 'Hydrogen', clue: 'Gas that makes a squeaky pop with a lit splint.' },
        { id: 'bg-9', term: 'Compound', clue: 'Two or more different elements chemically bonded together.' },
        { id: 'bg-10', term: 'Oxygen (O₂)', clue: 'Gas that relights a glowing wooden splint.' },
      ],
    },
  },
  {
    id: 'starter-ks3-cell-draw',
    title: 'Sketch & Label a Plant Cell',
    topic: 'Eukaryotic Cell Structure',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'Science',
    objectives: [
      'Draw the main structures of a plant cell and distinguish them from animal cells.',
      'Label chloroplasts, vacuole, cell wall, nucleus, cytoplasm, and cell membrane accurately.',
    ],
    format: 'draw',
    differentiation: 'Visual & EAL Support',
    estimatedMinutes: 10,
    teacherTip:
      'Have students sketch on tablets or the front board, stamp the vocabulary label chips onto the right organelle, and spotlight two student diagrams in the Gallery.',
    inclusionNote:
      'Pre-built label chips remove spelling barriers so students focus on spatial understanding.',
    createdAt: '2026-10-04T11:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'draw',
      instructions:
        'Draw the cell diagram on the canvas, then tap a label chip and click on your drawing to stamp it in place.',
      prompt:
        'Sketch a plant cell showing its rigid outer boundary, central fluid sac, and the green discs where photosynthesis happens.',
      checklist: [
        'Rigid rectangular outer cell wall',
        'Inner cell membrane',
        'Large central vacuole',
        'Nucleus controlling cell activities',
        'Green chloroplasts for photosynthesis',
      ],
      labelChips: [
        'Cell Wall',
        'Cell Membrane',
        'Nucleus',
        'Chloroplast',
        'Vacuole',
        'Cytoplasm',
      ],
    },
  },
  {
    id: 'starter-ks4-poetry-wordcloud',
    title: 'Power & Conflict: First Impressions Cloud',
    topic: 'GCSE Poetry — Ozymandias & Power',
    yearGroup: 'Year 10-11 (GCSE)',
    subject: 'English',
    objectives: [
      'Generate precise analytical vocabulary describing hubris, tyranny, and impermanence.',
      'Group and evaluate student-generated adjectives before paragraph writing.',
    ],
    format: 'wordcloud',
    differentiation: 'All Learners',
    estimatedMinutes: 6,
    teacherTip:
      'Launch a Live Room and give students 90 seconds to submit 2–3 ambitious adjectives each. Click high-frequency words to challenge pairs to embed them in an analytical sentence.',
    inclusionNote:
      'Starter seed words are visible immediately to model ambitious Tier 2 vocabulary.',
    createdAt: '2026-10-05T10:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'wordcloud',
      instructions:
        'Submit one or two ambitious words that capture how Shelley presents Ozymandias’s power and decay.',
      prompt: 'Which words best describe the ruler and the shattered statue in "Ozymandias"?',
      seedWords: ['Hubris', 'Ephemeral', 'Tyrannical', 'Eroded', 'Arrogance', 'Colossal'],
      followUpQuestion:
        'Pick the largest word in the cloud and pair it with a brief quotation from the poem.',
    },
  },
  {
    id: 'starter-ks4-team-duel',
    title: 'GCSE Science & Maths Team Duel',
    topic: 'STEM Retrieval & Exam Mastery',
    yearGroup: 'Year 10-11 (GCSE)',
    subject: 'Mathematics',
    objectives: [
      'Retrieve key GCSE algebraic, geometric, and physics relationships under friendly time pressure.',
      'Justify chosen strategies collaboratively in table teams.',
    ],
    format: 'buzzer',
    differentiation: 'Stretch & Challenge',
    estimatedMinutes: 15,
    teacherTip:
      'Switch Live Room to Group / Team Battle mode, start the 30-second countdown timer on each tile, and let teams strategise whether to risk a 300-point question!',
    inclusionNote:
      '100-point tiles give accessible entry points before teams step up to 200 and 300-point reasoning.',
    createdAt: '2026-10-06T10:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'buzzer',
      instructions:
        'Select any open point tile from the 3 categories, beat the timer, and earn points for your team.',
      categories: [
        {
          name: 'Algebra & Graphs',
          questions: [
            {
              id: 'b-a1',
              points: 100,
              prompt: 'What is the gradient of the straight line y = 3x - 7?',
              options: ['-7', '3', '7', '-3'],
              correctIndex: 1,
              explanation: 'In y = mx + c, m is the gradient (3) and c is the y-intercept (-7).',
            },
            {
              id: 'b-a2',
              points: 200,
              prompt: 'Factorise fully: x² - 9',
              options: ['(x - 3)²', '(x + 9)(x - 1)', '(x + 3)(x - 3)', 'x(x - 9)'],
              correctIndex: 2,
              explanation: 'Difference of two squares: a² - b² = (a + b)(a - b).',
            },
            {
              id: 'b-a3',
              points: 300,
              prompt: 'Solve simultaneously: 2x + y = 11 and x - y = 1. What is x?',
              options: ['3', '4', '5', '6'],
              correctIndex: 1,
              explanation: 'Adding the two equations eliminates y: 3x = 12, so x = 4.',
            },
          ],
        },
        {
          name: 'Geometry & Trig',
          questions: [
            {
              id: 'b-g1',
              points: 100,
              prompt: 'What is the sum of interior angles in any pentagon?',
              options: ['360°', '540°', '720°', '180°'],
              correctIndex: 1,
              explanation: '(n - 2) × 180° = (5 - 2) × 180° = 540°.',
            },
            {
              id: 'b-g2',
              points: 200,
              prompt: 'A right triangle has legs 6 cm and 8 cm. How long is the hypotenuse?',
              options: ['10 cm', '12 cm', '14 cm', '9 cm'],
              correctIndex: 0,
              explanation: '√(6² + 8²) = √(36 + 64) = √100 = 10 cm.',
            },
            {
              id: 'b-g3',
              points: 300,
              prompt: 'In trigonometry, which ratio equals Opposite ÷ Hypotenuse?',
              options: ['Cosine', 'Tangent', 'Sine', 'Secant'],
              correctIndex: 2,
              explanation: 'SOH CAH TOA: Sine = Opposite / Hypotenuse.',
            },
          ],
        },
        {
          name: 'Physics & Energy',
          questions: [
            {
              id: 'b-p1',
              points: 100,
              prompt: 'Which unit measures electrical resistance?',
              options: ['Volt (V)', 'Ampere (A)', 'Ohm (Ω)', 'Watt (W)'],
              correctIndex: 2,
              explanation: 'Resistance is measured in Ohms (Ω), R = V ÷ I.',
            },
            {
              id: 'b-p2',
              points: 200,
              prompt: 'A 2 kg trolley moves at 3 m/s. What is its kinetic energy (½mv²)?',
              options: ['6 J', '9 J', '12 J', '18 J'],
              correctIndex: 1,
              explanation: 'KE = 0.5 × 2 × 3² = 1 × 9 = 9 J.',
            },
            {
              id: 'b-p3',
              points: 300,
              prompt: 'If a wave has frequency 50 Hz and wavelength 0.4 m, what is its wave speed?',
              options: ['20 m/s', '125 m/s', '50.4 m/s', '8 m/s'],
              correctIndex: 0,
              explanation: 'Wave speed v = f × λ = 50 × 0.4 = 20 m/s.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'starter-ks3-escape-vault',
    title: 'The Tudor Archive Codebreaker',
    topic: 'Tudor History & Historical Clues',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'History',
    objectives: [
      'Solve 4 chronological and causal clues from Tudor England to unlock the archive vault.',
      'Apply historical evidence under timed collaborative problem-solving.',
    ],
    format: 'escape',
    differentiation: 'All Learners',
    estimatedMinutes: 12,
    teacherTip:
      'Challenge pairs or teams to crack all 4 stages before a 5-minute countdown ends. Each solved stage reveals one digit of the 4-digit vault lock!',
    inclusionNote:
      'Each puzzle includes an optional Hint button so no group gets stuck on a single stage.',
    createdAt: '2026-10-06T12:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'escape',
      instructions:
        'Solve each of the 4 historical riddles in sequence. Every correct solution reveals one digit of the Archive Vault Code.',
      storyIntro:
        'A locked chest in the Tudor Library holds the lost Royal Charter. Crack four historical puzzles to reveal the 4-digit combination.',
      stages: [
        {
          id: 'es-1',
          stageTitle: 'Lock 1: Battle of Bosworth',
          riddle:
            'In 1485, Henry Tudor defeated Richard III to begin the Tudor dynasty. Which number is the LAST digit of that famous year?',
          options: ['3', '5', '7', '9'],
          correctIndex: 1,
          codeDigit: '5',
          hint: 'Look at the final digit of 1485.',
          explanation: 'Henry VII won the Battle of Bosworth Field in 1485.',
        },
        {
          id: 'es-2',
          stageTitle: 'Lock 2: The Six Wives',
          riddle:
            'How many wives did King Henry VIII marry in total? Lock in that digit.',
          options: ['4', '5', '6', '8'],
          correctIndex: 2,
          codeDigit: '6',
          hint: 'Divorced, beheaded, died, divorced, beheaded, survived.',
          explanation: 'Henry VIII had 6 wives across his reign.',
        },
        {
          id: 'es-3',
          stageTitle: 'Lock 3: The Spanish Armada',
          riddle:
            'In 1588, Queen Elizabeth I’s fleet defeated the Spanish Armada. What is the TENS digit of 1588?',
          options: ['1', '5', '8', '0'],
          correctIndex: 2,
          codeDigit: '8',
          hint: 'In 1-5-8-8, the tens digit is the third digit.',
          explanation: 'The Armada failed in 1588, strengthening Elizabeth I’s rule.',
        },
        {
          id: 'es-4',
          stageTitle: 'Lock 4: Religious Settlement',
          riddle:
            'How many Tudor monarchs ruled between 1485 and 1603 (Henry VII, Henry VIII, Edward VI, Mary I, Elizabeth I)? Count carefully!',
          options: ['3', '4', '5', '6'],
          correctIndex: 2,
          codeDigit: '5',
          hint: 'Count Henry VII, Henry VIII, Edward VI, Mary I, and Elizabeth I.',
          explanation: 'Five Tudor monarchs ruled England from 1485 until Elizabeth I died in 1603.',
        },
      ],
    },
  },
  {
    id: 'starter-ks3-industrial-rev',
    title: 'Industrial Revolution: Turning Points & Everyday Life',
    topic: 'The Industrial Revolution (1750–1900)',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'History',
    objectives: [
      'Evaluate how steam power and factory systems reshaped towns, transport, and working lives.',
      'Challenge common misconceptions about why industrialisation began in Britain.',
    ],
    format: 'quiz',
    differentiation: 'All Learners',
    estimatedMinutes: 12,
    teacherTip:
      'Use the Discussion Prompt after each reveal for a 60-second Turn & Talk before awarding team points for thoughtful historical evidence.',
    inclusionNote:
      'Questions progress from Support to Stretch so every learner experiences early success and deeper historical causal reasoning.',
    createdAt: '2026-10-04T09:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'quiz',
      instructions:
        'Work together to answer each historical investigation question and unpack the evidence.',
      questions: [
        {
          id: 'q1',
          prompt:
            'Before steam engines became widespread, where did most early textile mills have to be built?',
          options: [
            'Right in the centre of London',
            'Beside fast-flowing rivers in rural valleys',
            'On flat farmland next to railway stations',
            'Inside coastal sea ports only',
          ],
          correctIndex: 1,
          hint: 'Early water frames needed a natural source of turning energy before coal steam arrived.',
          explanation:
            'Early mills like Richard Arkwright’s Cromford Mill relied on waterwheels, so factories clustered near fast-flowing Pennine streams.',
          discussionPrompt:
            'Once James Watt’s rotary steam engine arrived, how did factory locations change?',
          tier: 'Support',
        },
        {
          id: 'q2',
          prompt:
            'Why did rapid urbanisation in towns like Manchester and Leeds lead to severe public health crises?',
          options: [
            'Back-to-back housing was built hastily with shared privies and contaminated water pumps',
            'Cities had too many wide parks and empty streets',
            'Doctors banned all vaccinations during the 1830s',
            'Factory owners provided free piped clean water to every cellar',
          ],
          correctIndex: 0,
          hint: 'Think about how quickly population grew compared to underground sanitation systems.',
          explanation:
            'Housing grew faster than drainage or clean water supply, allowing waterborne diseases like cholera and typhoid to spread rapidly.',
          discussionPrompt:
            'Why did Edwin Chadwick’s 1842 report eventually push Parliament away from strict laissez-faire?',
          tier: 'Core',
        },
        {
          id: 'q3',
          prompt:
            'Which transport breakthrough allowed heavy coal and finished goods to move far cheaper and faster overland after 1830?',
          options: [
            'Hot air balloons',
            'Steam locomotives on iron railways',
            'Wooden sailing barges on oceans',
            'Electric tramways',
          ],
          correctIndex: 1,
          hint: 'Think of the Liverpool and Manchester line opened with Stephenson’s Rocket.',
          explanation:
            'Railways slashed transport times from days to hours, united regional markets, and even standardised national time ("railway time").',
          discussionPrompt:
            'Who benefited most from railways, and who lost their livelihoods when stagecoaches declined?',
          tier: 'Core',
        },
        {
          id: 'q4',
          prompt: 'What was the primary aim of the Factory Act of 1833?',
          options: [
            'To close all textile mills across Britain',
            'To restrict working hours for children and introduce independent factory inspectors',
            'To pay every adult worker the exact same weekly wage',
            'To replace steam engines with wind turbines',
          ],
          correctIndex: 1,
          hint: 'Reformers like Lord Ashley focused first on the youngest workers and enforcement.',
          explanation:
            'The 1833 Act banned children under 9 from textile factories, required two hours of schooling per day, and appointed inspectors to enforce the law.',
          discussionPrompt:
            'Why did adding paid inspectors make the 1833 Act more effective than earlier laws?',
          tier: 'Stretch',
        },
      ],
    },
  },
  {
    id: 'starter-ks3-photosynthesis-cloze',
    title: 'Inside Photosynthesis: How Leaves Make Food',
    topic: 'Photosynthesis and Plant Nutrition',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'Science',
    objectives: [
      'Identify the reactants and products of photosynthesis and where each enters the leaf.',
      'Explain the role of chlorophyll and stomata in plant food production.',
    ],
    format: 'cloze',
    differentiation: 'Visual & EAL Support',
    estimatedMinutes: 8,
    teacherTip:
      'Read the completed paragraph aloud together as a class once verified, asking students to tap their desks on each key scientific term.',
    inclusionNote:
      'Word bank includes two intentional distractors (mitochondria, nitrogen) to spark discussion on common biology misconceptions.',
    createdAt: '2026-10-05T09:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'cloze',
      instructions:
        'Select each blank space in the explanation, then choose the accurate scientific term from the word bank.',
      segments: [
        { text: 'During daylight, green plant leaves absorb light energy using a pigment called ' },
        { blankId: 'b1', answer: 'chlorophyll', clue: 'Green pigment found inside chloroplasts.' },
        { text: '. Water travels up from the roots through xylem tubes, while ' },
        { blankId: 'b2', answer: 'carbon dioxide', clue: 'Gas taken in from the air.' },
        { text: ' diffuses into the leaf through tiny pores on the underside called ' },
        { blankId: 'b3', answer: 'stomata', clue: 'Microscopic leaf pores.' },
        { text: '. Using light energy, the plant converts these reactants into energy-rich ' },
        { blankId: 'b4', answer: 'glucose', clue: 'The sugar made by the plant.' },
        { text: ' and releases ' },
        { blankId: 'b5', answer: 'oxygen', clue: 'Gas essential for animal respiration.' },
        { text: ' back into the atmosphere.' },
      ],
      distractors: ['nitrogen', 'mitochondria'],
    },
  },
  {
    id: 'starter-gcse-macbeth-sort',
    title: 'Macbeth Act 1: Ambition vs. Conscience',
    topic: "Shakespeare's Macbeth — Character & Theme",
    yearGroup: 'Year 10-11 (GCSE)',
    subject: 'English',
    objectives: [
      'Analyse textual evidence showing the internal conflict between Macbeth’s ambition and moral conscience.',
      'Prepare analytical points linking key quotations to Jacobean attitudes toward kingship.',
    ],
    format: 'sort',
    differentiation: 'Stretch & Challenge',
    estimatedMinutes: 12,
    teacherTip:
      'Challenge students to justify whether Lady Macbeth’s taunts appeal to ambition, masculinity, or fear before sorting each quote.',
    inclusionNote:
      'Brief modern glosses are included in the feedback explanations to build confidence with Shakespearean syntax.',
    createdAt: '2026-10-06T09:00:00.000Z',
    isStarter: true,
    payload: {
      type: 'sort',
      instructions:
        'Classify each Act 1 quotation or moment according to whether it primarily reveals Vaulting Ambition, Moral Conscience, or External Manipulation.',
      buckets: [
        {
          id: 'ambition',
          label: 'Vaulting Ambition',
          description: 'Desire for the crown overriding loyalty and restraint.',
        },
        {
          id: 'conscience',
          label: 'Moral Conscience',
          description: 'Awareness of duty, honour, and the sin of regicide.',
        },
        {
          id: 'manipulation',
          label: 'External Manipulation',
          description: 'Pressures from the Witches or Lady Macbeth pushing Macbeth forward.',
        },
      ],
      items: [
        {
          id: 'm1',
          text: '"Stars, hide your fires; / Let not light see my black and deep desires"',
          bucketId: 'ambition',
          reason: 'Macbeth recognises his secret wish for the throne is morally dark.',
        },
        {
          id: 'm2',
          text: '"He’s here in double trust: First, as I am his kinsman and his subject"',
          bucketId: 'conscience',
          reason: 'Macbeth lists clear moral and feudal duties protecting King Duncan.',
        },
        {
          id: 'm3',
          text: '"Look like th’ innocent flower, / But be the serpent under ’t"',
          bucketId: 'manipulation',
          reason: 'Lady Macbeth coaches Macbeth to disguise murderous intent with hospitality.',
        },
        {
          id: 'm4',
          text: '"If chance will have me king, why, chance may crown me / Without my stir"',
          bucketId: 'conscience',
          reason: 'Initially, Macbeth resists acting violently to seize power.',
        },
        {
          id: 'm5',
          text: '"All hail, Macbeth, that shalt be King hereafter!"',
          bucketId: 'manipulation',
          reason: 'The Witches plant the prophecy that awakens Macbeth’s latent ambition.',
        },
        {
          id: 'm6',
          text: '"I have no spur / To prick the sides of my intent, but only / Vaulting ambition"',
          bucketId: 'ambition',
          reason: 'Macbeth admits he has no moral justification—only raw ambition.',
        },
      ],
    },
  },
];
