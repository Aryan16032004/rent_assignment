export interface Comment {
  id: string;
  listingId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  text: string;
  createdAt: string;
}
