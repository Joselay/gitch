export interface Profile {
  name: string;
  gitName: string;
  gitEmail: string;
  sshKeyPath: string;
  ghUsername?: string;
  createdAt: string;
}

export interface DirectoryBinding {
  path: string;
  profile: string;
}

export interface GitchConfig {
  version: 1;
  activeProfile: string | null;
  profiles: Record<string, Profile>;
  bindings: DirectoryBinding[];
}

export function createDefaultConfig(): GitchConfig {
  return {
    version: 1,
    activeProfile: null,
    profiles: {},
    bindings: [],
  };
}
