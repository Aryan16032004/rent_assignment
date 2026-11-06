export type InquiryStatus = 'pending' | 'accepted' | 'rejected' | 'closed';

export interface InquiryMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  listingId: string;
  listingTitle?: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  message: string;
  status?: InquiryStatus;
  createdAt: string;
  updatedAt?: string;
  messages?: InquiryMessage[];
}
