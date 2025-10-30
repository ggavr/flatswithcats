import { subscriptionsRepo } from '../notion/subscriptions.repo';

export const subscriptionsService = {
  async get(tgId: number) {
    return subscriptionsRepo.findByTgId(tgId);
  },

  async upsert(tgId: number, cities: string, countries: string, enabled: boolean = true) {
    const citiesList = cities.split(',').map(c => c.trim()).filter(Boolean).join(', ');
    const countriesList = countries.split(',').map(c => c.trim()).filter(Boolean).join(', ');
    
    return subscriptionsRepo.upsert(tgId, citiesList, countriesList, enabled);
  },

  async enable(tgId: number) {
    const existing = await subscriptionsRepo.findByTgId(tgId);
    if (!existing) {
      return subscriptionsRepo.upsert(tgId, '', '', true);
    }
    return subscriptionsRepo.upsert(tgId, existing.cities, existing.countries, true);
  },

  async disable(tgId: number) {
    const existing = await subscriptionsRepo.findByTgId(tgId);
    if (!existing) return null;
    return subscriptionsRepo.upsert(tgId, existing.cities, existing.countries, false);
  },

  async delete(tgId: number) {
    return subscriptionsRepo.delete(tgId);
  },

  async getAllEnabled() {
    return subscriptionsRepo.findAllEnabled();
  }
};

