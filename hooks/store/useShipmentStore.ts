import { create } from 'zustand';
import type { Shipment } from '../../types';
import { fetchShipments } from '../../services/api/db';

const STORAGE_KEY = 'transcunha_shipments';

const getInitialShipments = (): Shipment[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveShipmentsToStorage = (shipments: Shipment[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
  } catch (err) {
    console.warn('Erro ao salvar embarques no localStorage:', err);
  }
};

interface ShipmentState {
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  loadShipments: () => Promise<void>;
  setShipments: (shipmentsOrUpdater: Shipment[] | ((prev: Shipment[]) => Shipment[])) => void;
  addShipment: (shipment: Shipment) => void;
  updateShipmentInStore: (shipment: Shipment) => void;
}

export const useShipmentStore = create<ShipmentState>((set) => ({
  shipments: getInitialShipments(),
  loading: false,
  error: null,
  loadShipments: async () => {
    set({ loading: true, error: null });
    try {
      const remoteData = await fetchShipments();
      set((state) => {
        const remoteIds = new Set(remoteData.map(s => s.id));
        const localOnlyShipments = state.shipments.filter(s => !remoteIds.has(s.id));
        const merged = [...remoteData, ...localOnlyShipments];
        saveShipmentsToStorage(merged);
        return { shipments: merged, loading: false };
      });
    } catch (err: any) {
      set({ error: err.message || 'Erro ao buscar embarques', loading: false });
    }
  },
  setShipments: (shipmentsOrUpdater) => set((state) => {
    const newShipments = typeof shipmentsOrUpdater === 'function' ? shipmentsOrUpdater(state.shipments) : shipmentsOrUpdater;
    saveShipmentsToStorage(newShipments);
    return { shipments: newShipments };
  }),
  addShipment: (shipment) => set((state) => {
    const newShipments = [shipment, ...state.shipments];
    saveShipmentsToStorage(newShipments);
    return { shipments: newShipments };
  }),
  updateShipmentInStore: (shipment) => set((state) => {
    const newShipments = state.shipments.map(s => s.id === shipment.id ? shipment : s);
    saveShipmentsToStorage(newShipments);
    return { shipments: newShipments };
  }),
}));
