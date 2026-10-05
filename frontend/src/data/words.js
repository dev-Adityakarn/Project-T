export const COMMON = `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us great still find here thing many tell while last long right small world hand high place keep start every line light story young never house night point word fact water early city play move live mind turn real study begin sound paper music power grow open seem ever plan field ready class quick learn speed space type focus brain craft score level pixel smart dream jump laugh river stone cloud green black white sleep glass round sweet happy`.split(/\s+/);

export const MEDIUM = `planet rocket garden silver window market castle forest dragon puzzle jungle bridge camera candle desert engine finger guitar hammer island jacket kitten ladder magnet napkin orange pepper rabbit saddle tomato violin wizard yellow zipper anchor banana cactus donkey falcon goblin harbor insect jigsaw kernel lemons meteor nectar oyster parrot quartz ribbon sphinx turtle unicorn velvet walrus breeze charm fluent glide horizon lantern marble nimble orbit quiver rhythm shadow thunder upward voyage whisper keyboard monitor network program typing letters arcade combo streak victory`.split(/\s+/);

export const LONG = `adventure beautiful celebrate discovery education framework generation happiness important knowledge laboratory mountain navigation opportunity performance quarterback restaurant strawberry television understanding vocabulary wonderful xylophone yesterday algorithm basketball chocolate dimension electricity friendship government hurricane imagination javascript kangaroo lightning microphone nightmare orchestra photograph questionnaire reflection spaceship technology universe volcano waterfall`.split(/\s+/);

export const PARAGRAPHS = [
  "The quick brown fox jumps over the lazy dog while the curious cat watches from the warm windowsill, wondering why anyone would ever run that fast.",
  "Practice is the secret engine behind every skill. A few focused minutes each day will carry your fingers further than a single marathon session ever could.",
  "Under a sky full of restless stars, the small rocket climbed higher and higher, leaving a silver trail that the children below would remember for years.",
  "Good typing is less about speed and more about rhythm. Keep your eyes on the screen, trust your hands, and let the words flow like water over stone.",
  "The old library smelled of dust and cedar. Somewhere between the tall shelves, a forgotten map waited patiently for an adventurer brave enough to unfold it.",
  "Every great programmer was once a beginner who refused to quit. Mistakes are simply the stepping stones that lead toward clean and elegant solutions.",
];

export const CODE = [
  { lang: "javascript", level: "easy", text: "const sum = (arr) => arr.reduce((a, b) => a + b, 0);\nconst nums = [1, 2, 3, 4];\nconsole.log(sum(nums));" },
  { lang: "javascript", level: "easy", text: "let total = 0;\nfor (let i = 1; i <= 5; i++) {\n  total += i;\n}\nconsole.log(total);" },
  { lang: "python", level: "easy", text: "nums = [3, 1, 2]\nnums.sort()\nprint(nums[0])" },
  { lang: "javascript", level: "medium", text: "function greet(name) {\n  const msg = `Hello, ${name}!`;\n  console.log(msg);\n  return msg;\n}" },
  { lang: "python", level: "medium", text: "def fizzbuzz(n):\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            print('FizzBuzz')\n        else:\n            print(i)" },
  { lang: "jsx", level: "medium", text: "export const Button = ({ label, onClick }) => (\n  <button className=\"btn\" onClick={onClick}>\n    {label}\n  </button>\n);" },
  { lang: "python", level: "hard", text: "class Player:\n    def __init__(self, name):\n        self.name = name\n        self.score = 0\n\n    def add(self, pts):\n        self.score += pts" },
  { lang: "javascript", level: "hard", text: "async function fetchUsers(url) {\n  try {\n    const res = await fetch(url);\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    return await res.json();\n  } catch (err) {\n    console.error(err);\n    return [];\n  }\n}" },
  { lang: "python", level: "hard", text: "def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True" },
];

export const mulberry32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const rngFor = (seed) => (seed ? mulberry32(seed) : Math.random);

export const wordPool = (difficulty) => (difficulty === "easy" ? COMMON : difficulty === "hard" ? [...MEDIUM, ...LONG] : [...COMMON, ...MEDIUM]);

export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
export const randomWords = (n, pool = COMMON, rng = Math.random) => Array.from({ length: n }, () => pick(pool, rng));
export const shuffle = (arr, rng = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
