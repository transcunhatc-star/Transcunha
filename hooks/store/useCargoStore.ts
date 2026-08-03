import { create } from 'zustand';
import type { Cargo } from '../../types';
import { fetchCargos } from '../../services/api/db';

const STORAGE_KEY = 'transcunha_cargos';

const getInitialCargos = (): Cargo[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCargosToStorage = (cargos: Cargo[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cargos));
  } catch (err) {
    console.warn('Erro ao salvar cargas no localStorage:', err);
  }
};

interface CargoState {
  cargos: Cargo[];
  loading: boolean;
  error: string | null;
  loadCargos: () => Promise<void>;
  setCargos: (cargosOrUpdater: Cargo[] | ((prev: Cargo[]) => Cargo[])) => void;
  addCargo: (cargo: Cargo) => void;
  updateCargoInStore: (cargo: Cargo) => void;
}

export const useCargoStore = create<CargoState>((set) => ({
  cargos: getInitialCargos(),
  loading: false,
  error: null,
  loadCargos: async () => {
    set({ loading: true, error: null });
    try {
      const remoteData = await fetchCargos();
      set((state) => {
        const remoteIds = new Set(remoteData.map(c => c.id));
        const localOnlyCargos = state.cargos.filter(c => !remoteIds.has(c.id));
        const merged = [...remoteData, ...localOnlyCargos];
        saveCargosToStorage(merged);
        return { cargos: merged, loading: false };
      });
    } catch (err: any) {
      set({ error: err.message || 'Erro ao buscar cargas', loading: false });
    }
  },
  setCargos: (cargosOrUpdater) => set((state) => {
    const newCargos = typeof cargosOrUpdater === 'function' ? cargosOrUpdater(state.cargos) : cargosOrUpdater;
    saveCargosToStorage(newCargos);
    return { cargos: newCargos };
  }),
  addCargo: (cargo) => set((state) => {
    const newCargos = [cargo, ...state.cargos];
    saveCargosToStorage(newCargos);
    return { cargos: newCargos };
  }),
  updateCargoInStore: (cargo) => set((state) => {
    const newCargos = state.cargos.map(c => c.id === cargo.id ? cargo : c);
    saveCargosToStorage(newCargos);
    return { cargos: newCargos };
  }),
}));
