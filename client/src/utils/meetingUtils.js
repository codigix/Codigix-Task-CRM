const VALID_MEET_WORDS = [
  'ace', 'add', 'age', 'aid', 'aim', 'air', 'all', 'and', 'ant', 'any', 'ape', 'arc', 'are', 'ark', 'arm',
  'art', 'ask', 'ate', 'awe', 'axe', 'bad', 'bag', 'ban', 'bar', 'bat', 'bay', 'bed', 'bee', 'beg', 'bet',
  'bid', 'big', 'bit', 'boa', 'bog', 'box', 'boy', 'bud', 'bug', 'bus', 'but', 'buy', 'cab', 'can', 'cap',
  'car', 'cat', 'cod', 'cog', 'cop', 'cow', 'cry', 'cub', 'cup', 'cut', 'dad', 'dam', 'day', 'den', 'dew',
  'did', 'die', 'dig', 'dim', 'dip', 'dog', 'dot', 'dry', 'dub', 'dud', 'due', 'dug', 'dye', 'ear', 'eat',
  'egg', 'ego', 'elf', 'elk', 'elm', 'end', 'era', 'err', 'eve', 'eye', 'fad', 'fan', 'far', 'fat', 'fax',
  'fed', 'fee', 'few', 'fib', 'fig', 'fin', 'fir', 'fit', 'fix', 'fly', 'foe', 'fog', 'for', 'fox', 'fry',
  'fun', 'fur', 'gab', 'gag', 'gap', 'gas', 'gel', 'gem', 'get', 'gig', 'gin', 'god', 'got', 'gum', 'gun',
  'gut', 'guy', 'gym', 'had', 'ham', 'has', 'hat', 'hay', 'hem', 'hen', 'her', 'hid', 'him', 'hip', 'his',
  'hit', 'hog', 'hop', 'hot', 'how', 'hub', 'hue', 'hug', 'hum', 'hut', 'ice', 'icy', 'ill', 'ink', 'inn',
  'ion', 'irk', 'its', 'ivy', 'jab', 'jam', 'jar', 'jaw', 'jay', 'jet', 'jig', 'job', 'jog', 'joy', 'jug',
  'key', 'kid', 'kin', 'kit', 'lab', 'lad', 'lag', 'lap', 'law', 'lax', 'lay', 'lea', 'led', 'leg', 'let',
  'lid', 'lie', 'lip', 'lit', 'log', 'lot', 'low', 'lug', 'mac', 'mad', 'man', 'map', 'mar', 'mat', 'may',
  'men', 'met', 'mid', 'mix', 'mob', 'mod', 'mom', 'mop', 'mud', 'mug', 'nag', 'nap', 'nay', 'net', 'new',
  'nil', 'nod', 'nor', 'not', 'now', 'nun', 'nut', 'oak', 'oar', 'oat', 'odd', 'ode', 'off', 'oft', 'oil',
  'old', 'one', 'opt', 'orb', 'ore', 'our', 'out', 'owe', 'owl', 'own', 'pad', 'pal', 'pan', 'paw', 'pay',
  'pea', 'peg', 'pen', 'pet', 'pie', 'pig', 'pin', 'pit', 'ply', 'pod', 'pop', 'pot', 'pox', 'pro', 'pub',
  'pug', 'pun', 'pup', 'put', 'rad', 'rag', 'ram', 'ran', 'rap', 'rat', 'raw', 'ray', 'red', 'ref', 'rem',
  'rep', 'rib', 'rid', 'rig', 'rim', 'rip', 'rob', 'rod', 'roe', 'rot', 'row', 'rub', 'rug', 'rum', 'run',
  'rut', 'rye', 'sac', 'sad', 'sag', 'sat', 'saw', 'say', 'sea', 'see', 'set', 'sew', 'she', 'shy', 'sin',
  'sip', 'sir', 'sis', 'sit', 'six', 'ski', 'sky', 'sly', 'sob', 'sod', 'son', 'soy', 'spa', 'spy', 'sty',
  'sub', 'sum', 'sun', 'tab', 'tad', 'tag', 'tan', 'tap', 'tar', 'tax', 'tea', 'ten', 'the', 'thy', 'tic',
  'tie', 'tin', 'tip', 'toe', 'ton', 'too', 'top', 'toy', 'try', 'tub', 'tug', 'two', 'urn', 'use', 'van',
  'vat', 'vet', 'vex', 'via', 'vie', 'vow', 'wad', 'wag', 'war', 'was', 'wax', 'way', 'web', 'wed', 'wee',
  'wet', 'who', 'why', 'wig', 'win', 'wit', 'woe', 'wok', 'won', 'woo', 'wow', 'yak', 'yam', 'yap', 'yaw',
  'yes', 'yet', 'yew', 'yin', 'you', 'yum', 'zap', 'zen', 'zip', 'zoo'
];

export const generateMeetingCode = () => {
  // Use words for more "human-readable" and valid-looking codes
  // Standard Google Meet format is xxx-yyyy-zzz (3-4-3)
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const part = (length) => Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
};

export const generateMeetingLink = (type) => {
  const code = generateMeetingCode();
  
  switch (type) {
    case 'Google Meet':
      // Direct code link is the most universal format
      return `https://meet.google.com/${code}`;
    case 'Zoom Meeting':
      return `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;
    case 'WhatsApp Call':
      return `https://wa.me/call/${code}`;
    case 'Phone Call':
      return `tel:${Math.floor(Math.random() * 10000000000)}`;
    case 'Internal Video Call':
    case 'Demo':
    default:
      // Jitsi works instantly for both parties without an account or API
      return `https://meet.jit.si/CRM-Meeting-${code}`;
  }
};
