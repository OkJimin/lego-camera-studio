import { create } from "zustand";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { deserializePose, serializePose } from "./cameraPose";
import { useBlockStore } from "./useBlockStore";
import type { PlacedBlock } from "./useBlockStore";
import { DEFAULT_AUTO_MOVE_DURATION, useCameraPathStore } from "./useCameraPathStore";
import { DEFAULT_LIGHTING, useLightingStore } from "./useLightingStore";
import type { LightingSettings } from "./useLightingStore";

export interface ProjectSummary {
  id: string;
  name: string;
}

const DEFAULT_PROJECT_NAME = "이름 없는 프로젝트";

async function ensureSignedInUid(): Promise<string | null> {
  if (!useAuthStore.getState().user) {
    await useAuthStore.getState().signInWithGoogle();
  }
  return useAuthStore.getState().user?.uid ?? null;
}

interface ProjectState {
  currentProjectId: string | null;
  currentProjectName: string;
  isSaving: boolean;
  isLoadingList: boolean;
  myProjects: ProjectSummary[];
  lastSavedAt: number | null;
  setCurrentProjectName: (name: string) => void;
  saveProject: () => Promise<void>;
  fetchMyProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  startNewProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProjectId: null,
  currentProjectName: DEFAULT_PROJECT_NAME,
  isSaving: false,
  isLoadingList: false,
  myProjects: [],
  lastSavedAt: null,
  setCurrentProjectName: (name) => set({ currentProjectName: name }),
  startNewProject: () =>
    set({ currentProjectId: null, currentProjectName: DEFAULT_PROJECT_NAME, lastSavedAt: null }),
  saveProject: async () => {
    const uid = await ensureSignedInUid();
    if (!uid) return;

    set({ isSaving: true });
    try {
      const { blocks } = useBlockStore.getState();
      const { home, end, autoMoveDuration } = useCameraPathStore.getState();
      const lighting = useLightingStore.getState();
      const { currentProjectId, currentProjectName } = get();

      const data = {
        ownerId: uid,
        name: currentProjectName,
        updatedAt: serverTimestamp(),
        blocks: blocks as unknown as Record<string, unknown>[],
        cameraHome: serializePose(home),
        cameraEnd: serializePose(end),
        autoMoveDuration,
        lighting: {
          ambientPercent: lighting.ambientPercent,
          keyPercent: lighting.keyPercent,
          keyAzimuth: lighting.keyAzimuth,
          keyElevation: lighting.keyElevation,
          keyTemperature: lighting.keyTemperature,
        } satisfies LightingSettings,
      };

      if (currentProjectId) {
        await setDoc(doc(firestore, "projects", currentProjectId), data, { merge: true });
      } else {
        const docRef = await addDoc(collection(firestore, "projects"), {
          ...data,
          createdAt: serverTimestamp(),
        });
        set({ currentProjectId: docRef.id });
      }
      set({ lastSavedAt: Date.now() });
    } finally {
      set({ isSaving: false });
    }
  },
  fetchMyProjects: async () => {
    const uid = await ensureSignedInUid();
    if (!uid) return;

    set({ isLoadingList: true });
    try {
      const q = query(collection(firestore, "projects"), where("ownerId", "==", uid));
      const snapshot = await getDocs(q);
      const projects: ProjectSummary[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: typeof d.data().name === "string" ? d.data().name : DEFAULT_PROJECT_NAME,
      }));
      set({ myProjects: projects });
    } finally {
      set({ isLoadingList: false });
    }
  },
  loadProject: async (id) => {
    const snapshot = await getDoc(doc(firestore, "projects", id));
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    useBlockStore.setState({
      blocks: (data.blocks ?? []) as PlacedBlock[],
      history: [],
      focusedBlockId: null,
    });

    useCameraPathStore.setState({
      home: deserializePose(data.cameraHome),
      end: deserializePose(data.cameraEnd),
      autoMoveDuration:
        typeof data.autoMoveDuration === "number"
          ? data.autoMoveDuration
          : DEFAULT_AUTO_MOVE_DURATION,
      keyframes: [],
      isPlaying: false,
      isRecording: false,
    });

    useLightingStore.setState({
      ...DEFAULT_LIGHTING,
      ...(data.lighting as Partial<LightingSettings> | undefined),
    });

    set({
      currentProjectId: id,
      currentProjectName: typeof data.name === "string" ? data.name : DEFAULT_PROJECT_NAME,
      lastSavedAt: Date.now(),
    });
  },
}));
