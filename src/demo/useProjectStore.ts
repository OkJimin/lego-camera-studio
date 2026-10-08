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
import type { CaptureData } from "./CaptureWorkspace";
import { deserializeKeyframes, serializeKeyframes } from "./guidePath";
import type { CameraPathSync } from "./guidePath";
import { useBlockStore } from "./useBlockStore";
import type { PlacedBlock } from "./useBlockStore";
import { DEFAULT_AUTO_MOVE_DURATION, useCameraPathStore } from "./useCameraPathStore";
import { DEFAULT_LENS_FOV, FORMAT_PRESETS, useCameraSettingsStore } from "./useCameraSettingsStore";
import { DEFAULT_LIGHTING, useLightingStore } from "./useLightingStore";
import type { LightingSettings } from "./useLightingStore";
import { DEFAULT_SPEED_SETTINGS, useSpeedSettingsStore } from "./useSpeedSettingsStore";
import type { SpeedSettings } from "./useSpeedSettingsStore";

export interface ProjectSummary {
  id: string;
  name: string;
}

const DEFAULT_PROJECT_NAME = "이름 없는 프로젝트";

// Anonymous (phone-pairing) sessions don't own saved projects, so they must not
// count as signed in here, or the project would be saved under a throwaway uid.
async function ensureSignedInUid(): Promise<string | null> {
  const user = useAuthStore.getState().user;
  if (!user || user.isAnonymous) {
    await useAuthStore.getState().signInWithGoogle();
  }
  const signedIn = useAuthStore.getState().user;
  return signedIn && !signedIn.isAnonymous ? signedIn.uid : null;
}

export async function fetchProjectForShoot(id: string): Promise<CaptureData | null> {
  const snapshot = await getDoc(doc(firestore, "projects", id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const cameraPath = (data.cameraPath ?? null) as CameraPathSync | null;
  const lens = (data.lens ?? {}) as { fov?: number; formatIndex?: number };
  const formatIndex = typeof lens.formatIndex === "number" ? lens.formatIndex : 0;
  return {
    blocks: (data.blocks ?? []) as PlacedBlock[],
    path: cameraPath && cameraPath.keys?.length >= 2 ? cameraPath : null,
    fov: typeof lens.fov === "number" ? lens.fov : DEFAULT_LENS_FOV,
    aspect: FORMAT_PRESETS[formatIndex]?.aspect,
  };
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
      const { home, end, autoMoveDuration, keyframes } = useCameraPathStore.getState();
      const lighting = useLightingStore.getState();
      const cameraSettings = useCameraSettingsStore.getState();
      const speed = useSpeedSettingsStore.getState();
      const { currentProjectId, currentProjectName } = get();

      const data = {
        ownerId: uid,
        name: currentProjectName,
        updatedAt: serverTimestamp(),
        blocks: blocks as unknown as Record<string, unknown>[],
        cameraHome: serializePose(home),
        cameraEnd: serializePose(end),
        cameraPath: keyframes.length >= 2 ? serializeKeyframes(keyframes) : null,
        autoMoveDuration,
        lens: {
          fov: cameraSettings.lensFov,
          formatIndex: cameraSettings.formatIndex,
        },
        speed: {
          moveSpeed: speed.moveSpeed,
          zoomSpeed: speed.zoomSpeed,
          tiltSpeed: speed.tiltSpeed,
          panSpeed: speed.panSpeed,
          objectMotionSeconds: speed.objectMotionSeconds,
        } satisfies SpeedSettings,
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
      keyframes: data.cameraPath ? deserializeKeyframes(data.cameraPath as CameraPathSync) : [],
      isPlaying: false,
      isRecording: false,
    });

    const lens = (data.lens ?? {}) as { fov?: number; formatIndex?: number };
    useCameraSettingsStore.setState({
      lensFov: typeof lens.fov === "number" ? lens.fov : DEFAULT_LENS_FOV,
      formatIndex: typeof lens.formatIndex === "number" ? lens.formatIndex : 0,
    });

    useSpeedSettingsStore.setState({
      ...DEFAULT_SPEED_SETTINGS,
      ...(data.speed as Partial<SpeedSettings> | undefined),
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
