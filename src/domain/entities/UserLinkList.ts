export interface UserLinkEntry {
  key: string;
  title: string;
  destination: string;
  createdAt: number;
  expiresAt: number;
}

export interface UserLinkList {
  v: 1;
  links: UserLinkEntry[];
}
