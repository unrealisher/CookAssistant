export interface User {
  id: number;
  username: string;
}

export interface SetupStatus {
  setup_required: boolean;
}

export interface Credentials {
  username: string;
  password: string;
}
