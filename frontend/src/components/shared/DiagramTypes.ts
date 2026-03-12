import type { Tag } from "@/api/tags";

export type Diagram = {
  id: string;
  title: string;
  folderId: string | null;
  thumbnail: string | null;
  starred?: boolean;
  tags?: Tag[];
  updatedAt?: string;
  updated_at?: string;
};
