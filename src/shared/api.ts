export type ApiErrorResponse = {
  status: 'error';
  message: string;
};

export type ApiInitResponse = {
  status: 'ok';
  username: string | null;
  subredditName: string | null;
};

export type CreatePostRequest = {
  title: string;
  body?: string;
};

export type CreatePostResponse = {
  status: 'ok';
  postId: string;
  url: string;
};
