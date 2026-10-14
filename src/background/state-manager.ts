import { StatsManager } from './stats-manager';
import { WhitelistManager } from './whitelist-manager';
import type { BlockStats, WhitelistEntry } from '../shared/types';

/**
 * StateManager tổng hợp, điều phối trạng thái bảo vệ, thống kê và whitelist
 */
export class StateManager {
  private static instance: StateManager;
  private statsManager: StatsManager;
  private whitelistManager: WhitelistManager;

  private constructor() {
    this.statsManager = StatsManager.getInstance();
    this.whitelistManager = WhitelistManager.getInstance();
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  public async getStats(): Promise<BlockStats> {
    return await this.statsManager.getStats();
  }

  public async recordBlock(tabId?: number, domain?: string): Promise<void> {
    await this.statsManager.recordBlock(tabId, domain);
  }

  public async getWhitelist(): Promise<WhitelistEntry[]> {
    return await this.whitelistManager.getWhitelist();
  }

  public async isWhitelisted(domain: string): Promise<boolean> {
    return await this.whitelistManager.isWhitelisted(domain);
  }

  public async addWhitelist(domain: string): Promise<WhitelistEntry[]> {
    return await this.whitelistManager.addDomain(domain);
  }

  public async removeWhitelist(domain: string): Promise<WhitelistEntry[]> {
    return await this.whitelistManager.removeDomain(domain);
  }

  public async clearWhitelist(): Promise<void> {
    await this.whitelistManager.clearAll();
  }
}

export default StateManager;
