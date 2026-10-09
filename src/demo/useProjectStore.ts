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
import {
  DEFAULT_DOF_SETTINGS,
  DEFAULT_LENS_FOV,
  FORMAT_PRESETS,
  useCameraSettingsStore,
} from "./useCameraSettingsStore";
import type { DepthOfFieldSettings } from "./useCameraSettingsStore";
import { DEFAULT_LIGHTING, useLightingStore } from "./useLightingStore";
import type { LightingSettings } from "./useLightingStore";
import { DEFAULT_SPEED_SETTINGS, useSpeedSettingsStore } from "./useSpeedSettingsStore";
import type { SpeedSettings } from "./useSpeedSettingsStore";
import { useWorkflowStore } from "./useWorkflowStore";

export type ProjectMode = "web" | "phone-setup";

export interface ProjectSummary {
  id: string;
  name: string;
  mode: ProjectMode;
  updatedAtMs: number;
}

function readMode(value: unknown): ProjectMode {
  return value === "phone-setup" ? "phone-setup" : "web";
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
  loadProject: (id: string) => Promise<ProjectMode | null>;
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
  startNewProject: () => {
    // Reset every editor store so a new project doesn't inherit the previous one's scene.
    useBlockStore.setState({ blocks: [], history: [], focusedBlockId: null });
    useCameraPathStore.setState({
      home: null,
      end: null,
      keyframes: [],
      autoMoveDuration: DEFAULT_AUTO_MOVE_DURATION,
      isPlaying: false,
      isRecording: false,
    });
    useCameraSettingsStore.setState({
      lensFov: DEFAULT_LENS_FOV,
      formatIndex: 0,
      ...DEFAULT_DOF_SETTINGS,
    });
    useSpeedSettingsStore.setState({ ...DEFAULT_SPEED_SETTINGS });
    useLightingStore.setState({ ...DEFAULT_LIGHTING });
    set({ currentProjectId: null, currentProjectName: DEFAULT_PROJECT_NAME, lastSavedAt: null });
  },
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
        mode: useWorkflowStore.getState().mode === "phone-setup" ? "phone-setup" : "web",
        updatedAt: serverTimestamp(),
        blocks: blocks as unknown as Record<string, unknown>[],
        cameraHome: serializePose(home),
        cameraEnd: serializePose(end),
        cameraPath: keyframes.length >= 2 ? serializeKeyframes(keyframes) : null,
        autoMoveDuration,
        lens: {
          fov: cameraSettings.lensFov,
          formatIndex: cameraSettings.formatIndex,
          dofEnabled: cameraSettings.dofEnabled,
          blurStrength: cameraSettings.blurStrength,
          focusBlockId: cameraSettings.focusBlockId,
          focusDistance: cameraSettings.focusDistance,
          keepSubjectSize: cameraSettings.keepSubjectSize,
        },
        speed: {
          moveSpeed: speed.moveSpeed,
          zoomSpeed: speed.zoomSpeed,
          tiltSpeed: speed.tiltSpeed,
          panSpeed: speed.panSpeed,
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
      const projects: ProjectSummary[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
          return {
            id: d.id,
            name: typeof data.name === "string" ? data.name : DEFAULT_PROJECT_NAME,
            mode: readMode(data.mode),
            updatedAtMs: updatedAt?.toMillis?.() ?? 0,
          };
        })
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      set({ myProjects: projects });
    } finally {
      set({ isLoadingList: false });
    }
  },
  loadProject: async (id) => {
    const snapshot = await getDoc(doc(firestore, "projects", id));
    if (!snapshot.exists()) return null;
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

    const lens = (data.lens ?? {}) as { fov?: number; formatIndex?: number } & Partial<DepthOfFieldSettings>;
    useCameraSettingsStore.setState({
      lensFov: typeof lens.fov === "number" ? lens.fov : DEFAULT_LENS_FOV,
      formatIndex: typeof lens.formatIndex === "number" ? lens.formatIndex : 0,
      // Projects saved before depth of field existed load with it off.
      dofEnabled: lens.dofEnabled ?? DEFAULT_DOF_SETTINGS.dofEnabled,
      blurStrength: lens.blurStrength ?? DEFAULT_DOF_SETTINGS.blurStrength,
      focusBlockId: lens.focusBlockId ?? null,
      focusDistance: lens.focusDistance ?? DEFAULT_DOF_SETTINGS.focusDistance,
      keepSubjectSize: lens.keepSubjectSize ?? DEFAULT_DOF_SETTINGS.keepSubjectSize,
    });

    const savedSpeed = (data.speed ?? {}) as Partial<SpeedSettings>;
    useSpeedSettingsStore.setState({
      moveSpeed: savedSpeed.moveSpeed ?? DEFAULT_SPEED_SETTINGS.moveSpeed,
      zoomSpeed: savedSpeed.zoomSpeed ?? DEFAULT_SPEED_SETTINGS.zoomSpeed,
      tiltSpeed: savedSpeed.tiltSpeed ?? DEFAULT_SPEED_SETTINGS.tiltSpeed,
      panSpeed: savedSpeed.panSpeed ?? DEFAULT_SPEED_SETTINGS.panSpeed,
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
    return readMode(data.mode);
  },
}));
