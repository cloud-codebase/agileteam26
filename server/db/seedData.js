/**
 * Realistic seed data for Movie Review Platform
 */
export const initialMovies = [
  {
    id: '1',
    title: 'Inception',
    year: 2010,
    genre: ['Sci-Fi', 'Action', 'Adventure'],
    director: 'Christopher Nolan',
    synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-01T12:00:00.000Z'
  },
  {
    id: '2',
    title: 'The Shawshank Redemption',
    year: 1994,
    genre: ['Drama'],
    director: 'Frank Darabont',
    synopsis: 'Over the course of several years, two convicts form a friendship, seeking solace and, eventually, redemption through basic compassion.',
    posterUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-02T12:00:00.000Z'
  },
  {
    id: '3',
    title: 'The Dark Knight',
    year: 2008,
    genre: ['Action', 'Crime', 'Drama'],
    director: 'Christopher Nolan',
    synopsis: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-03T12:00:00.000Z'
  },
  {
    id: '4',
    title: 'Pulp Fiction',
    year: 1994,
    genre: ['Crime', 'Drama'],
    director: 'Quentin Tarantino',
    synopsis: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    posterUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-04T12:00:00.000Z'
  },
  {
    id: '5',
    title: 'Interstellar',
    year: 2014,
    genre: ['Sci-Fi', 'Adventure', 'Drama'],
    director: 'Christopher Nolan',
    synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-05T12:00:00.000Z'
  },
  {
    id: '6',
    title: 'Spirited Away',
    year: 2001,
    genre: ['Animation', 'Adventure', 'Fantasy'],
    director: 'Hayao Miyazaki',
    synopsis: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-06T12:00:00.000Z'
  },
  {
    id: '7',
    title: 'The Matrix',
    year: 1999,
    genre: ['Sci-Fi', 'Action'],
    director: 'Lana Wachowski, Lilly Wachowski',
    synopsis: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
    posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-07T12:00:00.000Z'
  },
  {
    id: '8',
    title: 'Parasite',
    year: 2019,
    genre: ['Drama', 'Thriller'],
    director: 'Bong Joon-ho',
    synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
    createdAt: '2023-01-08T12:00:00.000Z'
  }
];

export const initialRatings = [
  { id: 'r1', movieId: '1', userId: 'alice', rating: 5, createdAt: '2023-02-01T10:00:00.000Z' },
  { id: 'r2', movieId: '1', userId: 'bob', rating: 4, createdAt: '2023-02-02T11:00:00.000Z' },
  { id: 'r3', movieId: '1', userId: 'carol', rating: 5, createdAt: '2023-02-03T12:00:00.000Z' },
  { id: 'r4', movieId: '2', userId: 'dave', rating: 5, createdAt: '2023-02-04T13:00:00.000Z' },
  { id: 'r5', movieId: '2', userId: 'eve', rating: 5, createdAt: '2023-02-05T14:00:00.000Z' },
  { id: 'r6', movieId: '3', userId: 'frank', rating: 5, createdAt: '2023-02-06T15:00:00.000Z' },
  { id: 'r7', movieId: '3', userId: 'grace', rating: 4, createdAt: '2023-02-07T16:00:00.000Z' },
  { id: 'r8', movieId: '4', userId: 'heidi', rating: 4, createdAt: '2023-02-08T17:00:00.000Z' },
  { id: 'r9', movieId: '5', userId: 'ivan', rating: 5, createdAt: '2023-02-09T18:00:00.000Z' },
  { id: 'r10', movieId: '6', userId: 'judy', rating: 5, createdAt: '2023-02-10T19:00:00.000Z' },
  { id: 'r11', movieId: '7', userId: 'kallum', rating: 5, createdAt: '2023-02-11T20:00:00.000Z' },
  { id: 'r12', movieId: '8', userId: 'leo', rating: 5, createdAt: '2023-02-12T21:00:00.000Z' }
];

export const initialReviews = [
  {
    id: 'rev1',
    movieId: '1',
    author: 'Cinephile99',
    rating: 5,
    content: 'A mind-bending masterpiece with astonishing visuals and Hans Zimmer\'s epic score.',
    createdAt: '2023-02-01T10:30:00.000Z'
  },
  {
    id: 'rev2',
    movieId: '2',
    author: 'MovieBuff',
    rating: 5,
    content: 'Timeless storytelling about hope and friendship. An absolute classic.',
    createdAt: '2023-02-04T13:30:00.000Z'
  },
  {
    id: 'rev3',
    movieId: '3',
    author: 'GothamFan',
    rating: 5,
    content: 'Heath Ledger delivers one of the finest antagonist performances in cinematic history.',
    createdAt: '2023-02-06T15:30:00.000Z'
  },
  {
    id: 'rev4',
    movieId: '5',
    author: 'Stargazer',
    rating: 5,
    content: 'Emotionally gripping and scientifically thoughtful. The docking scene still gives me chills.',
    createdAt: '2023-02-09T18:30:00.000Z'
  },
  {
    id: 'rev5',
    movieId: '8',
    author: 'FilmEnthusiast',
    rating: 5,
    content: 'Brilliant dark comedy and social thriller that executes tension and satire with sheer perfection.',
    createdAt: '2023-02-12T21:30:00.000Z'
  }
];

export const initialComments = [
  {
    id: 'c1',
    movieId: '1',
    author: 'Sarah M.',
    content: 'Does the spinning top ever stop? That ending gets me every single time!',
    createdAt: '2023-02-01T11:00:00.000Z'
  },
  {
    id: 'c2',
    movieId: '1',
    author: 'Alex K.',
    content: 'The zero-gravity hallway fight was actually filmed in a rotating centrifuge rig. Phenomenal practical effects.',
    createdAt: '2023-02-01T12:00:00.000Z'
  },
  {
    id: 'c3',
    movieId: '2',
    author: 'David L.',
    content: 'Brooks was here... that line breaks my heart every time.',
    createdAt: '2023-02-04T14:00:00.000Z'
  },
  {
    id: 'c4',
    movieId: '3',
    author: 'Bruce W.',
    content: 'The interrogation scene between Batman and Joker is peak screenwriting.',
    createdAt: '2023-02-06T16:00:00.000Z'
  },
  {
    id: 'c5',
    movieId: '6',
    author: 'AnimeFanatic',
    content: 'The train ride sequence is pure poetry. Miyazaki\'s world building is unmatched.',
    createdAt: '2023-02-10T20:00:00.000Z'
  }
];
