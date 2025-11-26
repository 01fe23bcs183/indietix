import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bengaluru areas
const AREAS = [
  'Indiranagar',
  'Koramangala',
  'HSR Layout',
  'Whitefield',
  'Jayanagar',
  'JP Nagar',
  'Marathahalli',
  'Electronic City',
  'MG Road',
  'Brigade Road',
  'Malleshwaram',
  'Rajajinagar',
  'Yelahanka',
  'Hebbal',
  'BTM Layout',
  'Bannerghatta Road',
  'Sarjapur Road',
  'Bellandur',
];

// Categories
const CATEGORIES = [
  'comedy',
  'music',
  'theatre',
  'workshop',
  'art',
  'food',
  'sports',
  'networking',
  'open-mic',
  'party',
];

// Venues by area
const VENUES: Record<string, string[]> = {
  Indiranagar: ['The Humming Tree', 'Toit Brewpub', 'BFlat Bar', 'Fandom at Gilly\'s'],
  Koramangala: ['The Laugh Store', 'Hard Rock Cafe', 'Vapour Pub', 'Koramangala Social'],
  'HSR Layout': ['Lahe Lahe', 'Byg Brewski', 'The Permit Room', 'HSR Social'],
  Whitefield: ['Phoenix Marketcity', 'VR Bengaluru', 'Whitefield Social', 'The Forum'],
  Jayanagar: ['Ranga Shankara', 'Jayanagar Cultural Centre', 'The Art Cafe'],
  'JP Nagar': ['JP Nagar Social', 'The Biere Club', 'Hangover Pub'],
  Marathahalli: ['Marathahalli Social', 'The Irish House', 'Glocal Junction'],
  'Electronic City': ['EC Social', 'The Brew Estate', 'Infosys Convention Center'],
  'MG Road': ['UB City', 'Church Street Social', 'The Permit Room MG'],
  'Brigade Road': ['Hard Rock Cafe Brigade', 'Pecos', 'Opus'],
  Malleshwaram: ['Rangoli Metro Art Center', 'Malleshwaram Grounds', 'The Coffee Board'],
  Rajajinagar: ['Orion Mall', 'Elements Mall', 'Rajajinagar Cultural Hub'],
  Yelahanka: ['Yelahanka Convention Center', 'The Park', 'Air Force Station Grounds'],
  Hebbal: ['Manyata Tech Park', 'Hebbal Lake View', 'The Leela Palace'],
  'BTM Layout': ['BTM Social', 'The Biere Club BTM', 'Hangout Hub'],
  'Bannerghatta Road': ['Bannerghatta Zoo Amphitheatre', 'The Forum Value Mall', 'BGS Grounds'],
  'Sarjapur Road': ['Total Environment', 'Sarjapur Social', 'The Brew House'],
  Bellandur: ['Bellandur Lake View', 'The Brew Estate Bellandur', 'Prestige Tech Park'],
};

// Event templates
const EVENT_TEMPLATES = [
  // Comedy
  { category: 'comedy', titleTemplate: 'Stand-up Comedy Night with {artist}', tags: ['standup', 'comedy', 'live', 'entertainment'] },
  { category: 'comedy', titleTemplate: 'Comedy Open Mic - {theme}', tags: ['open-mic', 'comedy', 'amateur', 'fun'] },
  { category: 'comedy', titleTemplate: 'Improv Comedy Show', tags: ['improv', 'comedy', 'interactive', 'live'] },
  { category: 'comedy', titleTemplate: 'Hindi Stand-up Special', tags: ['hindi', 'standup', 'comedy', 'desi'] },
  { category: 'comedy', titleTemplate: 'English Comedy Night', tags: ['english', 'standup', 'comedy', 'premium'] },
  
  // Music
  { category: 'music', titleTemplate: 'Live Jazz Evening', tags: ['jazz', 'live', 'music', 'chill'] },
  { category: 'music', titleTemplate: 'Indie Music Festival', tags: ['indie', 'festival', 'music', 'bands'] },
  { category: 'music', titleTemplate: 'Acoustic Night with {artist}', tags: ['acoustic', 'live', 'music', 'intimate'] },
  { category: 'music', titleTemplate: 'Rock Concert - {band}', tags: ['rock', 'concert', 'live', 'loud'] },
  { category: 'music', titleTemplate: 'Classical Music Recital', tags: ['classical', 'indian', 'music', 'traditional'] },
  { category: 'music', titleTemplate: 'EDM Night - DJ {artist}', tags: ['edm', 'dj', 'party', 'dance'] },
  
  // Theatre
  { category: 'theatre', titleTemplate: 'Play: {title}', tags: ['theatre', 'drama', 'stage', 'acting'] },
  { category: 'theatre', titleTemplate: 'Musical Theatre: {title}', tags: ['musical', 'theatre', 'singing', 'dance'] },
  { category: 'theatre', titleTemplate: 'Kannada Drama Night', tags: ['kannada', 'drama', 'local', 'theatre'] },
  
  // Workshop
  { category: 'workshop', titleTemplate: 'Pottery Workshop for Beginners', tags: ['pottery', 'art', 'hands-on', 'creative'] },
  { category: 'workshop', titleTemplate: 'Photography Masterclass', tags: ['photography', 'learning', 'creative', 'skill'] },
  { category: 'workshop', titleTemplate: 'Cooking Class: {cuisine}', tags: ['cooking', 'food', 'learning', 'fun'] },
  { category: 'workshop', titleTemplate: 'Dance Workshop: {style}', tags: ['dance', 'fitness', 'learning', 'fun'] },
  { category: 'workshop', titleTemplate: 'Painting Workshop', tags: ['painting', 'art', 'creative', 'relaxing'] },
  
  // Art
  { category: 'art', titleTemplate: 'Art Exhibition: {theme}', tags: ['art', 'exhibition', 'gallery', 'visual'] },
  { category: 'art', titleTemplate: 'Street Art Walk', tags: ['street-art', 'walking', 'urban', 'tour'] },
  
  // Food
  { category: 'food', titleTemplate: 'Wine Tasting Evening', tags: ['wine', 'tasting', 'premium', 'social'] },
  { category: 'food', titleTemplate: 'Craft Beer Festival', tags: ['beer', 'craft', 'festival', 'tasting'] },
  { category: 'food', titleTemplate: 'Food Walk: {area}', tags: ['food', 'walking', 'local', 'culinary'] },
  
  // Sports
  { category: 'sports', titleTemplate: 'Yoga in the Park', tags: ['yoga', 'fitness', 'outdoor', 'wellness'] },
  { category: 'sports', titleTemplate: 'Marathon Training Run', tags: ['running', 'marathon', 'fitness', 'outdoor'] },
  { category: 'sports', titleTemplate: 'Cricket Tournament', tags: ['cricket', 'sports', 'tournament', 'team'] },
  
  // Networking
  { category: 'networking', titleTemplate: 'Startup Meetup', tags: ['startup', 'networking', 'business', 'tech'] },
  { category: 'networking', titleTemplate: 'Tech Conference: {topic}', tags: ['tech', 'conference', 'learning', 'networking'] },
  { category: 'networking', titleTemplate: 'Women in Tech Meetup', tags: ['women', 'tech', 'networking', 'empowerment'] },
  
  // Open Mic
  { category: 'open-mic', titleTemplate: 'Poetry Open Mic', tags: ['poetry', 'open-mic', 'spoken-word', 'creative'] },
  { category: 'open-mic', titleTemplate: 'Music Open Mic Night', tags: ['music', 'open-mic', 'live', 'amateur'] },
  { category: 'open-mic', titleTemplate: 'Storytelling Open Mic', tags: ['storytelling', 'open-mic', 'narrative', 'creative'] },
  
  // Party
  { category: 'party', titleTemplate: 'Saturday Night Party', tags: ['party', 'nightlife', 'dance', 'fun'] },
  { category: 'party', titleTemplate: 'Bollywood Night', tags: ['bollywood', 'party', 'dance', 'music'] },
  { category: 'party', titleTemplate: 'Retro Theme Party', tags: ['retro', 'party', 'theme', 'fun'] },
];

// Artists/Names for templates
const ARTISTS = ['Rahul', 'Priya', 'Karthik', 'Sneha', 'Arjun', 'Divya', 'Vikram', 'Ananya', 'Rohan', 'Meera'];
const BANDS = ['The Local Train', 'Parvaaz', 'When Chai Met Toast', 'Thaikkudam Bridge', 'Agam'];
const THEMES = ['Life in Bangalore', 'Tech Tales', 'Dating Disasters', 'Office Politics', 'Family Drama'];
const CUISINES = ['Italian', 'Thai', 'South Indian', 'Japanese', 'Mexican'];
const DANCE_STYLES = ['Salsa', 'Bollywood', 'Hip Hop', 'Contemporary', 'Bharatanatyam'];
const PLAY_TITLES = ['The Glass Menagerie', 'Waiting for Godot', 'Tughlaq', 'Hayavadana'];
const ART_THEMES = ['Urban Landscapes', 'Abstract Emotions', 'Nature\'s Beauty', 'Modern India'];
const TECH_TOPICS = ['AI/ML', 'Web3', 'Cloud Computing', 'DevOps', 'Product Management'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + Math.random().toString(36).slice(2, 8);
}

function generateTitle(template: string): string {
  return template
    .replace('{artist}', getRandomElement(ARTISTS))
    .replace('{band}', getRandomElement(BANDS))
    .replace('{theme}', getRandomElement(THEMES))
    .replace('{cuisine}', getRandomElement(CUISINES))
    .replace('{style}', getRandomElement(DANCE_STYLES))
    .replace('{title}', getRandomElement(PLAY_TITLES))
    .replace('{area}', getRandomElement(AREAS))
    .replace('{topic}', getRandomElement(TECH_TOPICS));
}

function generateDescription(title: string, category: string, venue: string, area: string): string {
  const descriptions: Record<string, string[]> = {
    comedy: [
      `Get ready for a night of non-stop laughter at ${venue}! Join us for an evening of hilarious stand-up comedy that will leave you in splits.`,
      `Experience the best of comedy at ${venue} in ${area}. Our talented comedians will take you on a journey of humor and wit.`,
    ],
    music: [
      `Immerse yourself in the magic of live music at ${venue}. An unforgettable evening of melodies awaits you.`,
      `Join us for an incredible musical experience at ${venue}, ${area}. Feel the rhythm and let the music move you.`,
    ],
    theatre: [
      `Witness the magic of live theatre at ${venue}. A captivating performance that will stay with you long after the curtains close.`,
      `Experience the art of storytelling through drama at ${venue} in ${area}. A must-watch for theatre enthusiasts.`,
    ],
    workshop: [
      `Learn something new and exciting at ${venue}! Our expert instructors will guide you through this hands-on workshop.`,
      `Unlock your creativity at this engaging workshop in ${area}. Perfect for beginners and enthusiasts alike.`,
    ],
    art: [
      `Explore the world of art at ${venue}. A visual feast that celebrates creativity and expression.`,
      `Discover stunning artworks at this exhibition in ${area}. A journey through colors, forms, and emotions.`,
    ],
    food: [
      `Indulge your taste buds at ${venue}! A culinary experience that celebrates flavors from around the world.`,
      `Join fellow food lovers for an unforgettable gastronomic adventure in ${area}.`,
    ],
    sports: [
      `Get active and energized at ${venue}! A perfect opportunity to challenge yourself and have fun.`,
      `Join the fitness community in ${area} for an exciting sports event. All skill levels welcome!`,
    ],
    networking: [
      `Connect with like-minded professionals at ${venue}. Expand your network and discover new opportunities.`,
      `Join the community of innovators and entrepreneurs in ${area}. Great conversations and connections await!`,
    ],
    'open-mic': [
      `Take the stage or enjoy the show at ${venue}! An open platform for emerging talent and creative expression.`,
      `Discover raw talent and authentic performances at this open mic night in ${area}.`,
    ],
    party: [
      `Let loose and dance the night away at ${venue}! The best music, drinks, and vibes await you.`,
      `Get ready for an epic night of fun and celebration in ${area}. The party starts here!`,
    ],
  };

  const categoryDescriptions = descriptions[category] || descriptions.comedy;
  return getRandomElement(categoryDescriptions);
}

function generateFutureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(Math.floor(Math.random() * 12) + 10, 0, 0, 0); // 10 AM to 10 PM
  return date;
}

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@indietix.com' },
    update: {},
    create: {
      email: 'admin@indietix.com',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash: 'hashed_password_placeholder',
    },
  });
  console.log('Created admin user:', adminUser.email);

  // Create organizer user
  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@indietix.com' },
    update: {},
    create: {
      email: 'organizer@indietix.com',
      name: 'Event Organizer',
      role: 'ORGANIZER',
      passwordHash: 'hashed_password_placeholder',
    },
  });
  console.log('Created organizer user:', organizerUser.email);

  // Create organizer profile
  const organizer = await prisma.organizer.upsert({
    where: { userId: organizerUser.id },
    update: {},
    create: {
      userId: organizerUser.id,
      companyName: 'IndieTix Events',
      verified: true,
    },
  });
  console.log('Created organizer profile:', organizer.companyName);

  // Seed category synonyms
  const categorySynonyms = [
    { synonym: 'standup', category: 'comedy' },
    { synonym: 'stand-up', category: 'comedy' },
    { synonym: 'comic', category: 'comedy' },
    { synonym: 'funny', category: 'comedy' },
    { synonym: 'concert', category: 'music' },
    { synonym: 'gig', category: 'music' },
    { synonym: 'band', category: 'music' },
    { synonym: 'live', category: 'music' },
    { synonym: 'play', category: 'theatre' },
    { synonym: 'drama', category: 'theatre' },
    { synonym: 'class', category: 'workshop' },
    { synonym: 'learn', category: 'workshop' },
    { synonym: 'exhibition', category: 'art' },
    { synonym: 'gallery', category: 'art' },
    { synonym: 'tasting', category: 'food' },
    { synonym: 'culinary', category: 'food' },
    { synonym: 'fitness', category: 'sports' },
    { synonym: 'yoga', category: 'sports' },
    { synonym: 'meetup', category: 'networking' },
    { synonym: 'conference', category: 'networking' },
    { synonym: 'mic', category: 'open-mic' },
    { synonym: 'openmic', category: 'open-mic' },
    { synonym: 'club', category: 'party' },
    { synonym: 'nightlife', category: 'party' },
  ];

  for (const syn of categorySynonyms) {
    await prisma.categorySynonym.upsert({
      where: { synonym: syn.synonym },
      update: { category: syn.category },
      create: syn,
    });
  }
  console.log('Seeded category synonyms');

  // Seed area aliases
  const areaAliases = [
    { alias: 'indira', area: 'Indiranagar', city: 'Bengaluru' },
    { alias: 'kora', area: 'Koramangala', city: 'Bengaluru' },
    { alias: 'hsr', area: 'HSR Layout', city: 'Bengaluru' },
    { alias: 'ec', area: 'Electronic City', city: 'Bengaluru' },
    { alias: 'mg', area: 'MG Road', city: 'Bengaluru' },
    { alias: 'btm', area: 'BTM Layout', city: 'Bengaluru' },
    { alias: 'jp', area: 'JP Nagar', city: 'Bengaluru' },
    { alias: 'blr', area: '', city: 'Bengaluru' },
    { alias: 'bangalore', area: '', city: 'Bengaluru' },
  ];

  for (const alias of areaAliases) {
    await prisma.areaAlias.upsert({
      where: { alias: alias.alias },
      update: { area: alias.area, city: alias.city },
      create: alias,
    });
  }
  console.log('Seeded area aliases');

  // Generate 55 events
  const events = [];
  for (let i = 0; i < 55; i++) {
    const template = getRandomElement(EVENT_TEMPLATES);
    const area = getRandomElement(AREAS);
    const venueList = VENUES[area] || ['Community Hall'];
    const venue = getRandomElement(venueList);
    const title = generateTitle(template.titleTemplate);
    const daysFromNow = Math.floor(Math.random() * 60) - 5; // -5 to +55 days
    const price = [0, 199, 299, 399, 499, 599, 699, 799, 999, 1499, 1999][Math.floor(Math.random() * 11)];

    events.push({
      slug: generateSlug(title),
      title,
      description: generateDescription(title, template.category, venue, area),
      venue,
      address: `${venue}, ${area}, Bengaluru`,
      city: 'Bengaluru',
      area,
      category: template.category,
      tags: template.tags,
      startDate: generateFutureDate(daysFromNow),
      price,
      totalSeats: [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)],
      bookedSeats: 0,
      status: 'PUBLISHED' as const,
      organizerId: organizer.id,
    });
  }

  // Create events
  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    });
    console.log(`Created event: ${event.title}`);
  }

  console.log(`\nSeeded ${events.length} events`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
