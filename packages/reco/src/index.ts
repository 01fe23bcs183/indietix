// Configuration
export {
  getConfig,
  getPriceBand,
  getTimeSlot,
  DEFAULT_CONFIG,
  DEFAULT_WEIGHTS,
  PRICE_BANDS,
  TIME_SLOTS,
  type RecoConfig,
  type RecoWeights,
  type TimeSlot,
  type PriceBand,
} from "./config";

// Types
export type {
  UserProfileVector,
  EventCandidate,
  ScoredReco,
  RecoReason,
  SimilarUser,
  BatchResult,
  RecoClickLog,
} from "./types";

// Profile computation
export {
  computeUserProfile,
  batchComputeProfiles,
  getUserProfile,
} from "./profile";

// Candidate generation
export {
  findSimilarUsers,
  generateCandidates,
  getCandidatesFromSimilarUsers,
  getPopularBySegment,
  computeJaccardSimilarity,
  computeCosineSimilarity,
  filterExpiredAndBooked,
} from "./candidates";

// Scoring engine
export {
  scoreCandidate,
  scoreAllCandidates,
  generateColdStartRecos,
  isColdStartUser,
  computeMFScores,
} from "./engine";

// Batch computation
export {
  computeRecosForUser,
  storeUserRecos,
  runBatchCompute,
  getStoredRecos,
  logRecoClick,
} from "./batch";
