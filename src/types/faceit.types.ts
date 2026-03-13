/**
 * Tipos relacionados à API da FACEIT
 * Baseados na documentação oficial: https://developers.faceit.com/docs
 */

// ==================== PLAYER TYPES ====================

export interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  skill_level: number;
  faceit_elo: number;
  game_player_id: string;
  game_skill_level: number;
}

export interface FaceitPlayerDetails extends FaceitPlayer {
  memberships: string[];
  infractions: any;
  platforms: {
    steam: string;
  };
  games: {
    cs2: FaceitGameStats;
  };
  settings: {
    language: string;
  };
}

// ==================== GAME STATS TYPES ====================

export interface FaceitGameStats {
  region: string;
  game_player_id: string;
  skill_level: number;
  faceit_elo: number;
  game_player_name: string;
  skill_level_label: string;
  regions: any;
  game_profile_id: string;
}

export interface FaceitPlayerStats {
  player_id: string;
  game_id: string;
  lifetime: {
    "Recent Results": string[];
    "Average K/D Ratio": string;
    "Win Rate %": string;
    Matches: string;
    "K/R Ratio": string;
    "Current Winning Streak": string;
    "Average Headshots %": string;
    Wins: string;
    "Total Headshots %": string;
    "Longest Win Streak": string;
    "Average MVPs": string;
    "Average Quadro Kills": string;
    "Average Penta Kills": string;
    "Average Triple Kills": string;
    "Average Assists": string;
    "Average Deaths": string;
    "Average Kills": string;
    "K/D Ratio": string;
    "Average ADR": string; // <- Importante!
  };
  segments: any[];
}

// ==================== HUB TYPES ====================

export interface FaceitHubMember {
  user_id: string;
  nickname: string;
  avatar: string;
  country: string;
  skill_level: number;
  faceit_elo: number;
  membership_type: string;
  accepted_at: string;
  joined_at: string;
}

export interface FaceitHubRanking {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  points: number;
  played: number;
  wins: number;
  losses: number;
  current_streak: number;
  position: number;
  faceit_elo?: number;      // ← NOVO
  skill_level?: number;     // ← NOVO
}

// ==================== MATCH TYPES ====================

export interface FaceitMatch {
  match_id: string;
  game_id: string;
  region: string;
  match_type: string;
  game_mode: string;
  max_players: number;
  teams_size: number;
  started_at: number;
  finished_at: number;
  status: "FINISHED" | "ONGOING" | "CANCELLED";
  teams: {
    faction1: FaceitTeam;
    faction2: FaceitTeam;
  };
  results: {
    winner: "faction1" | "faction2";
    score: {
      faction1: number;
      faction2: number;
    };
  };
  competition_id?: string;
  competition_name?: string;
  competition_type?: string;
  organizer_id?: string;
}

export interface FaceitTeam {
  team_id: string;
  nickname: string;
  avatar: string;
  type: string;
  players: Array<{
    player_id: string;
    nickname: string;
    avatar: string;
    skill_level: number;
    game_player_id: string;
    game_player_name: string;
  }>;
}

export interface FaceitMatchStats {
  rounds: Array<{
    round_stats: {
      Map: string;
      Rounds: string;
      Score: string;
      Winner: string;
    };
    teams: Array<{
      team_id: string;
      premade: boolean;
      team_stats: {
        "Team Win": string;
        "Team Headshots": string;
        "Final Score": string;
      };
      players: Array<{
        player_id: string;
        nickname: string;
        player_stats: {
          Kills: string;
          Deaths: string;
          Assists: string;
          "K/D Ratio": string;
          "K/R Ratio": string;
          Headshots: string;
          "Headshots %": string;
          MVPs: string;
          "Triple Kills": string;
          "Quadro Kills": string;
          "Penta Kills": string;
          Result: string;
          ADR: string;
          "First Kills"?: string;
          "First Deaths"?: string;
          "Flash Successes"?: string;
          "Knife Kills"?: string;
        };
      }>;
    }>;
  }>;
}

// ==================== RESPONSE WRAPPERS ====================

export interface FaceitApiResponse<T> {
  items: T[];
  start: number;
  end: number;
}

export interface FaceitPaginatedResponse<T> extends FaceitApiResponse<T> {
  total_count?: number;
}

// ==================== ERROR TYPES ====================

export interface FaceitApiError {
  code: string;
  message: string;
  env: string;
  time: string;
  version: string;
}
